import { AgentType } from '../types';

export const AGENTIC_AGENT_TYPES: AgentType[] = [
  // Core Infrastructure Agents
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    description: 'Central coordinator that routes tasks, manages conversation state, and enforces SLAs',
    color: 'from-purple-500 to-indigo-600',
    icon: '🎯',
    category: 'core',
    priority: 1,
    sla_timeout_ms: 1000,
    fallback_strategy: 'retry'
  },
  {
    id: 'stt',
    name: 'Speech-to-Text Agent',
    description: 'Real-time transcription with speaker diarization and utterance event emission',
    color: 'from-green-500 to-teal-600',
    icon: '🎤',
    category: 'core',
    priority: 2,
    sla_timeout_ms: 2000,
    fallback_strategy: 'degraded'
  },
  {
    id: 'entity-extraction',
    name: 'Entity Extraction Agent',
    description: 'Extracts companies, competitors, product names, questions, and topics from conversation',
    color: 'from-blue-500 to-cyan-600',
    icon: '🔍',
    category: 'core',
    priority: 3,
    dependencies: ['stt'],
    sla_timeout_ms: 3000,
    fallback_strategy: 'retry'
  },

  // Intelligence Gathering Agents
  {
    id: 'domain-intelligence',
    name: 'Domain Intelligence Agent',
    description: 'Fetches company overview, tags, employee size, and news with sources and confidence',
    color: 'from-orange-500 to-red-600',
    icon: '🏢',
    category: 'intelligence',
    priority: 4,
    dependencies: ['entity-extraction'],
    sla_timeout_ms: 5000,
    fallback_strategy: 'degraded'
  },
  {
    id: 'person-enrichment',
    name: 'Person Enrichment Agent',
    description: 'Resolves public profiles from email, provides background bullets with provenance',
    color: 'from-pink-500 to-rose-600',
    icon: '👤',
    category: 'intelligence',
    priority: 4,
    dependencies: ['entity-extraction'],
    sla_timeout_ms: 5000,
    fallback_strategy: 'degraded'
  },
  {
    id: 'retriever-rag',
    name: 'Retriever/RAG Agent',
    description: 'Fetches relevant documents from vector DB and web summaries for context',
    color: 'from-indigo-500 to-blue-600',
    icon: '📚',
    category: 'intelligence',
    priority: 5,
    dependencies: ['entity-extraction'],
    sla_timeout_ms: 4000,
    fallback_strategy: 'degraded'
  },

  // Analysis and Planning Agents
  {
    id: 'summarizer',
    name: 'Summarizer/TL;DR Agent',
    description: 'Composes summaries, action items, and follow-ups from meeting context',
    color: 'from-yellow-500 to-orange-600',
    icon: '📄',
    category: 'analysis',
    priority: 6,
    dependencies: ['stt'],
    sla_timeout_ms: 3000,
    fallback_strategy: 'retry'
  },
  {
    id: 'suggestion-generator',
    name: 'Suggestion Generator Agent',
    description: 'Generates contextual talking points from domain/person context and transcript',
    color: 'from-green-400 to-emerald-600',
    icon: '💡',
    category: 'analysis',
    priority: 7,
    dependencies: ['domain-intelligence', 'person-enrichment', 'retriever-rag'],
    sla_timeout_ms: 4000,
    fallback_strategy: 'degraded'
  },
  {
    id: 'ranking-contextualizer',
    name: 'Ranking/Contextualizer Agent',
    description: 'Ranks suggestions by relevance, timing, and confidence with contextual awareness',
    color: 'from-purple-400 to-violet-600',
    icon: '📊',
    category: 'analysis',
    priority: 8,
    dependencies: ['suggestion-generator'],
    sla_timeout_ms: 2000,
    fallback_strategy: 'retry'
  },

  // Governance and Monitoring Agents
  {
    id: 'compliance-privacy',
    name: 'Compliance & Privacy Agent',
    description: 'Enforces consent, retention policies, and PII protection rules',
    color: 'from-red-500 to-rose-600',
    icon: '🔒',
    category: 'governance',
    priority: 2,
    sla_timeout_ms: 1000,
    fallback_strategy: 'block'
  },
  {
    id: 'logger-audit',
    name: 'Logger/Audit Agent',
    description: 'Stores immutable logs, provenance chains, and audit traces',
    color: 'from-gray-500 to-slate-600',
    icon: '📋',
    category: 'governance',
    priority: 1,
    sla_timeout_ms: 500,
    fallback_strategy: 'retry'
  },

  // UI and User Experience Agent
  {
    id: 'ui-agent',
    name: 'UI Streaming Agent',
    description: 'Streams agent status, traces, and evidence cards to frontend in real-time',
    color: 'from-cyan-500 to-blue-600',
    icon: '📱',
    category: 'ui',
    priority: 3,
    sla_timeout_ms: 1000,
    fallback_strategy: 'degraded'
  },

  // Legacy Agents (for backward compatibility)
  {
    id: 'sales',
    name: 'Sales Insights (Legacy)',
    description: 'Legacy sales opportunity and buying signal analysis',
    color: 'from-green-400 to-emerald-600',
    icon: '💰',
    category: 'legacy',
    priority: 10,
    sla_timeout_ms: 5000,
    fallback_strategy: 'degraded'
  },
  {
    id: 'hr',
    name: 'HR Analysis (Legacy)',
    description: 'Legacy team dynamics and communication pattern analysis',
    color: 'from-blue-400 to-cyan-600',
    icon: '👥',
    category: 'legacy',
    priority: 10,
    sla_timeout_ms: 5000,
    fallback_strategy: 'degraded'
  },
  {
    id: 'compliance',
    name: 'Compliance Monitor (Legacy)',
    description: 'Legacy compliance and regulatory concern flagging',
    color: 'from-red-400 to-rose-600',
    icon: '⚖️',
    category: 'legacy',
    priority: 10,
    sla_timeout_ms: 5000,
    fallback_strategy: 'degraded'
  },
  {
    id: 'competitor',
    name: 'Competitive Intel (Legacy)',
    description: 'Legacy competitive intelligence and market positioning analysis',
    color: 'from-orange-400 to-amber-600',
    icon: '🎯',
    category: 'legacy',
    priority: 10,
    sla_timeout_ms: 5000,
    fallback_strategy: 'degraded'
  },
  {
    id: 'action-items',
    name: 'Action Items (Legacy)',
    description: 'Legacy action item extraction and task identification',
    color: 'from-purple-400 to-violet-600',
    icon: '✅',
    category: 'legacy',
    priority: 10,
    sla_timeout_ms: 5000,
    fallback_strategy: 'degraded'
  }
];

// Agent categories for organization and UI
export const AGENT_CATEGORIES = {
  core: {
    name: 'Core Infrastructure',
    description: 'Essential agents for basic system operation',
    priority: 1
  },
  intelligence: {
    name: 'Intelligence Gathering',
    description: 'Agents that fetch and enrich external data',
    priority: 2
  },
  analysis: {
    name: 'Analysis & Planning',
    description: 'Agents that process and generate insights',
    priority: 3
  },
  governance: {
    name: 'Governance & Monitoring',
    description: 'Agents ensuring compliance and auditability',
    priority: 4
  },
  ui: {
    name: 'User Experience',
    description: 'Agents managing user interface and interactions',
    priority: 5
  },
  legacy: {
    name: 'Legacy Agents',
    description: 'Backward compatibility agents',
    priority: 6
  }
};

// Agent workflow definitions
export const AGENT_WORKFLOWS = {
  'real-time-sales-intelligence': {
    name: 'Real-time Sales Intelligence',
    description: 'Complete workflow from speech to actionable sales insights',
    trigger: 'utterance.detected',
    sequence: [
      'stt',
      'entity-extraction',
      ['domain-intelligence', 'person-enrichment', 'retriever-rag'], // parallel
      'suggestion-generator',
      'ranking-contextualizer',
      'ui-agent'
    ],
    fallback_points: ['entity-extraction', 'suggestion-generator'],
    max_latency_ms: 3000
  },
  'compliance-check': {
    name: 'Compliance and Privacy Check',
    description: 'Ensures all processing complies with privacy and regulatory requirements',
    trigger: 'session.start',
    sequence: ['compliance-privacy'],
    required: true,
    max_latency_ms: 1000
  },
  'audit-trail': {
    name: 'Audit Trail Generation',
    description: 'Logs all agent activities for audit and replay',
    trigger: 'agent.activity',
    sequence: ['logger-audit'],
    async: true,
    max_latency_ms: 500
  }
};

export const getAgentsByCategory = (category: string): AgentType[] => {
  return AGENTIC_AGENT_TYPES.filter(agent => agent.category === category);
};

export const getAgentById = (id: string): AgentType | undefined => {
  return AGENTIC_AGENT_TYPES.find(agent => agent.id === id);
};

export const getCoreAgents = (): AgentType[] => {
  return getAgentsByCategory('core');
};

export const getIntelligenceAgents = (): AgentType[] => {
  return getAgentsByCategory('intelligence');
};

export const getAnalysisAgents = (): AgentType[] => {
  return getAgentsByCategory('analysis');
};

export const getGovernanceAgents = (): AgentType[] => {
  return getAgentsByCategory('governance');
};