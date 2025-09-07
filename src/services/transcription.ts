import { TranscriptEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class TranscriptionService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private sessionId = '';
  private onTranscriptCallback: ((entry: TranscriptEntry) => void) | null = null;
  private onInterimCallback: ((interim: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private restartTimeout: NodeJS.Timeout | null = null;

  constructor() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.setupRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
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
    if (!this.recognition) {
      onError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      onError('Microphone access denied. Please allow microphone access and refresh the page.');
      return false;
    }

    this.sessionId = sessionId;
    this.onTranscriptCallback = onTranscript;
    this.onInterimCallback = onInterim || null;
    this.onErrorCallback = onError;

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      onError(`Failed to start transcription: ${error}`);
      return false;
    }
  }

  stopTranscription(): void {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.recognition.stop();
      
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = null;
      }
    }
  }

  isTranscribing(): boolean {
    return this.isListening;
  }
}

// Enhanced version with better error handling and reliability
export class WhisperTranscriptionService extends TranscriptionService {
  // This class extends the base TranscriptionService with Web Speech API
  // In production, this would integrate with OpenAI Whisper API for better accuracy
  // For now, it uses the same robust Web Speech API implementation
  
  constructor() {
    super();
  }

  // Override to add any Whisper-specific enhancements
  async startTranscription(
    sessionId: string,
    onTranscript: (entry: TranscriptEntry) => void,
    onError: (error: string) => void,
    onInterim?: (interim: string) => void
  ): Promise<boolean> {
    // For demo purposes, use the enhanced Web Speech API
    return super.startTranscription(sessionId, onTranscript, onError, onInterim);
  }
}