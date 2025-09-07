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
  id: 'orchestrator' | 'stt' | 'entity-extraction' | 'domain-intelligence' | 'person-enrichment' | 
      'retriever-rag' | 'summarizer' | 'suggestion-generator' | 'ranking-contextualizer' | 
      'compliance-privacy' | 'logger-audit' | 'ui-agent' | 'sales' | 'hr' | 'compliance' | 'competitor' | 'action-items';
  name: string;
  description: string;
  color: string;
  icon: string;
  category: 'core' | 'intelligence' | 'analysis' | 'governance' | 'ui' | 'legacy';
  priority: number;
  dependencies?: string[];
  sla_timeout_ms?: number;
  fallback_strategy?: 'retry' | 'degraded' | 'skip';
}

export interface ProvenanceEnvelope {
  agent_id: string;
  timestamp: Date;
  inputs: {
    transcript_segment?: string;
    context?: string;
    previous_outputs?: string[];
    entities?: ExtractedEntity[];
    domain_data?: DomainIntelligence;
    suggestions?: Suggestion[];
    [key: string]: any;
  };
  outputs: {
    analysis?: string;
    insights?: string[];
    confidence_score: number;
    reasoning_chain: string[];
    entities?: ExtractedEntity[];
    domain_data?: DomainIntelligence;
    person_data?: PersonEnrichment;
    suggestions?: Suggestion[];
    ranked_suggestions?: RankedSuggestion[];
    summary?: string;
    action_items?: ActionItem[];
    [key: string]: any;
  };
  confidence: number;
  trace_id: string;
  sources?: SourceReference[];
  processing_time_ms?: number;
  agent_version?: string;
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

// New interfaces for Agentic System
export interface AgentMessage {
  id: string;
  type: 'task' | 'event' | 'response' | 'status';
  from_agent: string;
  to_agent?: string; // undefined means broadcast
  payload: any;
  timestamp: Date;
  trace_id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expires_at?: Date;
}

export interface AgentTask {
  id: string;
  type: string;
  agent_id: string;
  payload: any;
  priority: number;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  retries: number;
  max_retries: number;
  timeout_ms: number;
  dependencies?: string[];
  trace_id: string;
}

export interface ExtractedEntity {
  type: 'company' | 'person' | 'product' | 'competitor' | 'question' | 'topic';
  value: string;
  confidence: number;
  context: string;
  source_position: { start: number; end: number };
  metadata?: Record<string, any>;
}

export interface DomainIntelligence {
  company_name: string;
  overview: string;
  tags: string[];
  employee_size: string;
  industry: string;
  news: NewsItem[];
  confidence: number;
  last_updated: Date;
  sources: SourceReference[];
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  published_date: Date;
  relevance_score: number;
  source: string;
}

export interface PersonEnrichment {
  email: string;
  name?: string;
  title?: string;
  company?: string;
  linkedin_url?: string;
  profile_summary: string[];
  experience_bullets: string[];
  confidence: number;
  sources: SourceReference[];
  last_updated: Date;
}

export interface SourceReference {
  type: 'web' | 'database' | 'api' | 'document';
  url?: string;
  title: string;
  confidence: number;
  accessed_at: Date;
  snippet?: string;
}

export interface Suggestion {
  id: string;
  type: 'talking_point' | 'question' | 'objection_handler' | 'closing_technique';
  content: string;
  context: string;
  generated_by: string;
  trace_id: string;
  created_at: Date;
}

export interface RankedSuggestion extends Suggestion {
  relevance_score: number;
  timing_score: number;
  confidence_score: number;
  final_rank: number;
  ranking_rationale: string;
}

export interface ActionItem {
  id: string;
  type: 'task' | 'follow_up' | 'document' | 'meeting';
  description: string;
  assignee?: string;
  due_date?: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dependencies?: string[];
  extracted_from: string;
  confidence: number;
}

export interface ConversationState {
  session_id: string;
  participants: string[];
  entities: ExtractedEntity[];
  domain_context: DomainIntelligence[];
  person_context: PersonEnrichment[];
  active_topics: string[];
  meeting_stage: 'opening' | 'discovery' | 'presentation' | 'objection_handling' | 'closing';
  sentiment_trend: number[];
  last_updated: Date;
  context_summary: string;
}

export interface AgentHealthStatus {
  agent_id: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  last_heartbeat: Date;
  response_time_avg_ms: number;
  error_rate: number;
  active_tasks: number;
  version: string;
  capabilities: string[];
}

export interface EventBusEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  source: string;
  trace_id: string;
  partition_key?: string;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'privacy' | 'retention' | 'consent' | 'pii';
  active: boolean;
  enforcement_level: 'warn' | 'block' | 'audit';
  conditions: any;
  actions: string[];
}

export interface AuditLog {
  id: string;
  event_type: string;
  agent_id: string;
  session_id: string;
  user_id?: string;
  data: any;
  timestamp: Date;
  trace_id: string;
  compliance_tags: string[];
  retention_until?: Date;
}