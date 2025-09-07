import { TranscriptEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { openAIService } from './openai';

export class TranscriptionService {
  private recognition: SpeechRecognition | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isListening = false;
  private sessionId = '';
  private onTranscriptCallback: ((entry: TranscriptEntry) => void) | null = null;
  private onInterimCallback: ((interim: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private restartTimeout: NodeJS.Timeout | null = null;
  private useWhisperAPI = false;
  private audioProcessingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.useWhisperAPI = openAIService.isReady();
    
    if (!this.useWhisperAPI) {
      this.setupWebSpeechAPI();
    }
  }

  private setupWebSpeechAPI() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.setupRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    }
  }

  private async setupWhisperAPI(): Promise<MediaStream | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.processAudioChunk();
      };

      return stream;
    } catch (error) {
      console.error('Error setting up Whisper API:', error);
      return null;
    }
  }

  private async processAudioChunk() {
    if (this.audioChunks.length === 0) return;

    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];

      // Only process chunks larger than 1KB to avoid empty transcriptions
      if (audioBlob.size < 1024) return;

      const text = await openAIService.transcribeAudio(audioBlob);
      
      if (text && text.trim().length > 0 && this.onTranscriptCallback) {
        const transcriptEntry: TranscriptEntry = {
          id: uuidv4(),
          sessionId: this.sessionId,
          timestamp: new Date(),
          speaker: 'You',
          text: text.trim(),
          confidence: 0.95 // Whisper typically has high confidence
        };
        
        this.onTranscriptCallback(transcriptEntry);
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback(`Transcription error: ${error}`);
      }
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let interimTranscript = '';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      // Send interim results for real-time display
      if (interim && this.onInterimCallback) {
        this.onInterimCallback(interim.trim());
      }

      // Only process final results for storage
      if (final && this.onTranscriptCallback) {
        const transcriptEntry: TranscriptEntry = {
          id: uuidv4(),
          sessionId: this.sessionId,
          timestamp: new Date(),
          speaker: 'You',
          text: final.trim(),
          confidence: event.results[event.resultIndex]?.[0]?.confidence || 0.9
        };
        
        if (transcriptEntry.text.length > 0) {
          this.onTranscriptCallback(transcriptEntry);
          // Clear interim text after final result
          if (this.onInterimCallback) {
            this.onInterimCallback('');
          }
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      if (this.onErrorCallback) {
        let errorMessage = 'Speech recognition error';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking closer to the microphone.';
            break;
          case 'audio-capture':
            errorMessage = 'Audio capture failed. Please check your microphone.';
            break;
          case 'network':
            errorMessage = 'Network error during speech recognition.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        this.onErrorCallback(errorMessage);
      }

      // Try to restart if it's a temporary error
      if (this.isListening && ['no-speech', 'audio-capture'].includes(event.error)) {
        this.scheduleRestart();
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      if (this.isListening) {
        // Restart recognition if it stops unexpectedly
        this.scheduleRestart();
      }
    };

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
    };
  }

  private scheduleRestart() {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }
    
    this.restartTimeout = setTimeout(() => {
      if (this.isListening && this.recognition) {
        try {
          this.recognition.start();
        } catch (error) {
          console.error('Failed to restart speech recognition:', error);
        }
      }
    }, 100);
  }

  async startTranscription(
    sessionId: string,
    onTranscript: (entry: TranscriptEntry) => void,
    onError: (error: string) => void,
    onInterim?: (interim: string) => void
  ): Promise<boolean> {
    if (this.isListening) {
      return true;
    }

    this.sessionId = sessionId;
    this.onTranscriptCallback = onTranscript;
    this.onInterimCallback = onInterim || null;
    this.onErrorCallback = onError;

    if (this.useWhisperAPI) {
      return await this.startWhisperTranscription();
    } else {
      return await this.startWebSpeechTranscription();
    }
  }

  private async startWhisperTranscription(): Promise<boolean> {
    try {
      const stream = await this.setupWhisperAPI();
      if (!stream || !this.mediaRecorder) {
        if (this.onErrorCallback) {
          this.onErrorCallback('Failed to setup Whisper transcription. Microphone access required.');
        }
        return false;
      }

      // Start recording in 3-second chunks for real-time processing
      this.mediaRecorder.start();
      this.isListening = true;

      // Process audio in intervals for near real-time transcription
      this.audioProcessingInterval = setInterval(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
          this.mediaRecorder.start();
        }
      }, 3000);

      return true;
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback(`Whisper transcription failed: ${error}`);
      }
      return false;
    }
  }

  private async startWebSpeechTranscription(): Promise<boolean> {
    if (!this.recognition) {
      if (this.onErrorCallback) {
        this.onErrorCallback('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      }
      return false;
    }

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback('Microphone access denied. Please allow microphone access and refresh the page.');
      }
      return false;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback(`Failed to start transcription: ${error}`);
      }
      return false;
    }
  }

  stopTranscription(): void {
    this.isListening = false;

    if (this.useWhisperAPI) {
      // Stop Whisper API transcription
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      
      if (this.audioProcessingInterval) {
        clearInterval(this.audioProcessingInterval);
        this.audioProcessingInterval = null;
      }

      // Stop all tracks to release microphone
      if (this.mediaRecorder?.stream) {
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    } else {
      // Stop Web Speech API transcription
      if (this.recognition) {
        this.recognition.stop();
      }
      
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = null;
      }
    }
  }

  isTranscribing(): boolean {
    return this.isListening;
  }

  getTranscriptionMethod(): string {
    return this.useWhisperAPI ? 'OpenAI Whisper' : 'Web Speech API';
  }
}

// Enhanced version with OpenAI Whisper API integration
export class WhisperTranscriptionService extends TranscriptionService {
  constructor() {
    super();
  }

  // This class now automatically uses OpenAI Whisper when available
  // Falls back to Web Speech API when Whisper is not configured
}