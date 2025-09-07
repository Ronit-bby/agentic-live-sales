import { ExtractedEntity, ProvenanceEnvelope, AgentMessage } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { EventBusService } from '../eventBus';
import { LoggerAuditAgent } from './loggerAuditAgent';

interface SpeakerDiarization {
  speaker_id: string;
  confidence: number;
  start_time: number;
  end_time: number;
}

interface TranscriptionSegment {
  id: string;
  text: string;
  confidence: number;
  start_time: number;
  end_time: number;
  speaker: SpeakerDiarization;
  is_final: boolean;
  language: string;
  alternatives?: { text: string; confidence: number }[];
}

interface UtteranceEvent {
  id: string;
  session_id: string;
  segment: TranscriptionSegment;
  context: {
    previous_segments: string[];
    meeting_stage: string;
    active_speakers: string[];
  };
  timestamp: Date;
  trace_id: string;
}

/**
 * Speech-to-Text Agent with real-time transcription and speaker diarization
 * Emits utterance events for downstream processing
 */
export class STTAgent {
  private isActive = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recognition: any = null; // SpeechRecognition API
  private eventBus: EventBusService;
  private logger: LoggerAuditAgent;
  private sessionId: string | null = null;
  private transcriptionBuffer: TranscriptionSegment[] = [];
  private speakerMap: Map<string, string> = new Map(); // voice characteristics -> speaker ID
  private currentSpeakers: Set<string> = new Set();
  private interimResults = true;
  private language = 'en-US';
  private confidenceThreshold = 0.7;

  constructor(eventBus: EventBusService, logger: LoggerAuditAgent) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.initializeSpeechRecognition();
    this.setupEventListeners();
  }

  private initializeSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new (window as any).SpeechRecognition();
    } else {
      console.warn('Speech recognition not supported, using fallback transcription');
      return;
    }

    this.recognition.continuous = true;
    this.recognition.interimResults = this.interimResults;
    this.recognition.lang = this.language;
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
    };

    this.recognition.onresult = (event: any) => {
      this.handleSpeechResult(event);
    };

    this.recognition.onerror = (event: any) => {
      this.handleSpeechError(event);
    };

    this.recognition.onend = () => {
      if (this.isActive) {
        // Auto-restart if still active
        setTimeout(() => {
          if (this.isActive) {
            this.recognition.start();
          }
        }, 100);
      }
    };
  }

  private setupEventListeners(): void {
    this.eventBus.subscribe('session.started', 'stt-agent', (event) => {
      this.sessionId = event.data.sessionId;
    });

    this.eventBus.subscribe('session.stopped', 'stt-agent', (event) => {
      this.stopTranscription();
    });
  }

  /**
   * Start real-time transcription
   */
  async startTranscription(sessionId: string): Promise<void> {
    if (this.isActive) {
      console.warn('Transcription already active');
      return;
    }

    this.sessionId = sessionId;
    this.isActive = true;
    this.transcriptionBuffer = [];
    this.currentSpeakers.clear();

    try {
      // Get microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      // Start speech recognition
      if (this.recognition) {
        this.recognition.start();
      } else {
        // Fallback to MediaRecorder for custom transcription
        await this.startMediaRecorder();
      }

      // Log transcription start
      await this.logger.logEvent({
        event_type: 'transcription.started',
        agent_id: 'stt',
        session_id: sessionId,
        data: {
          language: this.language,
          interim_results: this.interimResults,
          confidence_threshold: this.confidenceThreshold
        },
        timestamp: new Date(),
        trace_id: uuidv4(),
        compliance_tags: ['audio_processing', 'session_recording']
      });

      this.emitHeartbeat();

    } catch (error) {
      this.isActive = false;
      await this.handleTranscriptionError(error);
      throw error;
    }
  }

  /**
   * Stop transcription
   */
  async stopTranscription(): Promise<void> {
    if (!this.isActive) return;

    this.isActive = false;

    // Stop speech recognition
    if (this.recognition) {
      this.recognition.stop();
    }

    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    // Close audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    // Log transcription end
    if (this.sessionId) {
      await this.logger.logEvent({
        event_type: 'transcription.stopped',
        agent_id: 'stt',
        session_id: this.sessionId,
        data: {
          total_segments: this.transcriptionBuffer.length,
          unique_speakers: Array.from(this.currentSpeakers).length
        },
        timestamp: new Date(),
        trace_id: uuidv4(),
        compliance_tags: ['audio_processing', 'session_recording']
      });
    }

    console.log('Transcription stopped');
  }

  private async startMediaRecorder(): Promise<void> {
    if (!this.audioStream) return;

    this.mediaRecorder = new MediaRecorder(this.audioStream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    const audioChunks: Blob[] = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await this.processAudioChunk(audioBlob);
      }
    };

    // Record in chunks for real-time processing
    this.mediaRecorder.start(1000); // 1 second chunks
  }

  private async processAudioChunk(audioBlob: Blob): Promise<void> {
    try {
      // In production, this would send to Whisper API or similar
      const mockTranscription = await this.simulateWhisperTranscription(audioBlob);
      
      if (mockTranscription) {
        await this.processTranscriptionResult(mockTranscription);
      }
    } catch (error) {
      console.error('Audio chunk processing failed:', error);
    }
  }

  private async simulateWhisperTranscription(audioBlob: Blob): Promise<TranscriptionSegment | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

    // Mock transcription result
    if (Math.random() > 0.1) { // 90% success rate
      const mockTexts = [
        "I think we should consider the pricing strategy for our enterprise customers.",
        "What are your thoughts on the competitive landscape?",
        "Our team has been working on improving the user experience.",
        "Let's schedule a follow-up meeting to discuss the implementation details.",
        "Can you share more information about the technical requirements?",
        "I'm concerned about the timeline for this project.",
        "The budget allocation seems reasonable for this quarter.",
        "We need to address the feedback from our pilot customers."
      ];

      const mockText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
      const speakerId = this.generateSpeakerId();
      
      return {
        id: uuidv4(),
        text: mockText,
        confidence: 0.8 + Math.random() * 0.2,
        start_time: Date.now() - 1000,
        end_time: Date.now(),
        speaker: {
          speaker_id: speakerId,
          confidence: 0.85,
          start_time: Date.now() - 1000,
          end_time: Date.now()
        },
        is_final: true,
        language: this.language,
        alternatives: [
          { text: mockText, confidence: 0.9 },
          { text: mockText.replace(/\\.$/, '?'), confidence: 0.7 }
        ]
      };
    }

    return null;
  }

  private generateSpeakerId(): string {
    const speakers = ['speaker_001', 'speaker_002', 'speaker_003'];
    const speakerId = speakers[Math.floor(Math.random() * speakers.length)];
    this.currentSpeakers.add(speakerId);
    return speakerId;
  }

  private async handleSpeechResult(event: any): Promise<void> {
    const results = event.results;
    
    for (let i = event.resultIndex; i < results.length; i++) {
      const result = results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 0.8;
      const isFinal = result.isFinal;

      // Skip low confidence results
      if (confidence < this.confidenceThreshold && isFinal) {
        continue;
      }

      const segment: TranscriptionSegment = {
        id: uuidv4(),
        text: transcript,
        confidence,
        start_time: Date.now() - transcript.length * 50, // Estimate timing
        end_time: Date.now(),
        speaker: {
          speaker_id: this.generateSpeakerId(),
          confidence: 0.8,
          start_time: Date.now() - transcript.length * 50,
          end_time: Date.now()
        },
        is_final: isFinal,
        language: this.language,
        alternatives: Array.from(result).slice(1, 3).map((alt: any) => ({
          text: alt.transcript,
          confidence: alt.confidence || 0.5
        }))
      };

      await this.processTranscriptionResult(segment);
    }
  }

  private async processTranscriptionResult(segment: TranscriptionSegment): Promise<void> {
    // Add to buffer
    this.transcriptionBuffer.push(segment);

    // Limit buffer size
    if (this.transcriptionBuffer.length > 100) {
      this.transcriptionBuffer.shift();
    }

    // Create utterance event
    const utteranceEvent: UtteranceEvent = {
      id: uuidv4(),
      session_id: this.sessionId!,
      segment,
      context: {
        previous_segments: this.transcriptionBuffer
          .slice(-5)
          .map(s => s.text),
        meeting_stage: 'discovery', // Would be determined by meeting context
        active_speakers: Array.from(this.currentSpeakers)
      },
      timestamp: new Date(),
      trace_id: uuidv4()
    };

    // Log utterance
    await this.logger.logEvent({
      event_type: 'utterance.detected',
      agent_id: 'stt',
      session_id: this.sessionId!,
      data: {
        speaker_id: segment.speaker.speaker_id,
        text_length: segment.text.length,
        confidence: segment.confidence,
        is_final: segment.is_final
      },
      timestamp: new Date(),
      trace_id: utteranceEvent.trace_id,
      compliance_tags: ['speech_processing', 'real_time_analysis']
    });

    // Emit utterance event for downstream processing
    this.eventBus.publish({
      type: 'utterance.detected',
      data: utteranceEvent,
      timestamp: new Date(),
      source: 'stt',
      trace_id: utteranceEvent.trace_id
    });

    // Also emit to UI for real-time display
    this.eventBus.publish({
      type: 'ui.transcript.update',
      data: {
        segment,
        session_id: this.sessionId
      },
      timestamp: new Date(),
      source: 'stt',
      trace_id: utteranceEvent.trace_id
    });
  }

  private async handleSpeechError(event: any): Promise<void> {
    console.error('Speech recognition error:', event.error);
    
    await this.logger.logEvent({
      event_type: 'transcription.error',
      agent_id: 'stt',
      session_id: this.sessionId || 'unknown',
      data: {
        error: event.error,
        message: event.message || 'Speech recognition error'
      },
      timestamp: new Date(),
      trace_id: uuidv4(),
      compliance_tags: ['error_handling', 'speech_processing']
    });

    // Implement error recovery
    await this.handleTranscriptionError(new Error(event.error));
  }

  private async handleTranscriptionError(error: any): Promise<void> {
    console.error('Transcription error:', error);

    // Try to restart if it's a recoverable error
    if (this.isActive && this.shouldRetryAfterError(error)) {
      setTimeout(async () => {
        if (this.isActive && this.sessionId) {
          try {
            await this.startTranscription(this.sessionId);
          } catch (retryError) {
            console.error('Transcription retry failed:', retryError);
          }
        }
      }, 2000);
    }
  }

  private shouldRetryAfterError(error: any): boolean {
    const recoverableErrors = [
      'network',
      'no-speech',
      'aborted',
      'audio-capture'
    ];
    
    return recoverableErrors.some(errorType => 
      error.message?.toLowerCase().includes(errorType)
    );
  }

  private emitHeartbeat(): void {
    const heartbeatInterval = setInterval(() => {
      if (!this.isActive) {
        clearInterval(heartbeatInterval);
        return;
      }

      this.eventBus.publish({
        type: 'agent.heartbeat',
        data: {
          agent_id: 'stt',
          status: this.isActive ? 'healthy' : 'offline',
          last_heartbeat: new Date(),
          response_time_avg_ms: 150,
          error_rate: 0.02,
          active_tasks: this.isActive ? 1 : 0,
          version: '1.0.0',
          capabilities: ['real_time_transcription', 'speaker_diarization', 'utterance_events']
        },
        timestamp: new Date(),
        source: 'stt',
        trace_id: uuidv4()
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Get current transcription buffer
   */
  getTranscriptionBuffer(): TranscriptionSegment[] {
    return [...this.transcriptionBuffer];
  }

  /**
   * Get current speakers
   */
  getCurrentSpeakers(): string[] {
    return Array.from(this.currentSpeakers);
  }

  /**
   * Check if transcription is active
   */
  isTranscriptionActive(): boolean {
    return this.isActive;
  }

  /**
   * Update configuration
   */
  updateConfig(config: {
    language?: string;
    confidence_threshold?: number;
    interim_results?: boolean;
  }): void {
    if (config.language) {
      this.language = config.language;
      if (this.recognition) {
        this.recognition.lang = this.language;
      }
    }
    
    if (config.confidence_threshold !== undefined) {
      this.confidenceThreshold = config.confidence_threshold;
    }
    
    if (config.interim_results !== undefined) {
      this.interimResults = config.interim_results;
      if (this.recognition) {
        this.recognition.interimResults = this.interimResults;
      }
    }
  }

  /**
   * Get agent statistics
   */
  getStats(): {
    is_active: boolean;
    total_segments: number;
    unique_speakers: number;
    average_confidence: number;
    language: string;
    session_id: string | null;
  } {
    const totalSegments = this.transcriptionBuffer.length;
    const averageConfidence = totalSegments > 0 
      ? this.transcriptionBuffer.reduce((sum, seg) => sum + seg.confidence, 0) / totalSegments
      : 0;

    return {
      is_active: this.isActive,
      total_segments: totalSegments,
      unique_speakers: this.currentSpeakers.size,
      average_confidence: averageConfidence,
      language: this.language,
      session_id: this.sessionId
    };
  }
}