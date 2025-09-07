export interface User {
  uid: string;
  email: string;
  displayName: string;
}

export interface MeetingSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  isActive: boolean;
  participants: string[];
  duration: number;
}

export interface TranscriptEntry {
  id: string;
  sessionId: string;
  timestamp: Date;
  speaker: string;
  text: string;
  confidence: number;
}

export interface AgentType {
  id: 'sales' | 'hr' | 'compliance' | 'competitor' | 'action-items';
  name: string;
  description: string;
  color: string;
  icon: string;
}

export interface ProvenanceEnvelope {
  agent_id: string;
  timestamp: Date;
  inputs: {
    transcript_segment: string;
    context: string;
    previous_outputs?: string[];
  };
  outputs: {
    analysis: string;
    insights: string[];
    confidence_score: number;
    reasoning_chain: string[];
  };
  confidence: number;
  trace_id: string;
}

export interface AgentOutput {
  id: string;
  sessionId: string;
  agentType: AgentType['id'];
  provenance: ProvenanceEnvelope;
  createdAt: Date;
}

export interface RecordingState {
  isRecording: boolean;
  mediaRecorder: MediaRecorder | null;
  stream: MediaStream | null;
}