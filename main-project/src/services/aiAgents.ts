import { AgentType, ProvenanceEnvelope } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { openAIService } from './openai';
import { AGENTIC_AGENT_TYPES } from './agentTypes';
import { orchestrator } from './orchestrator';
import { eventBus } from './eventBus';
import { LoggerAuditAgent } from './agents/loggerAuditAgent';
import { STTAgent } from './agents/sttAgent';
import { EntityExtractionAgent } from './agents/entityExtractionAgent';
import { DomainIntelligenceAgent } from './agents/domainIntelligenceAgent';

// Legacy agent types for backward compatibility
export const LEGACY_AGENT_TYPES: AgentType[] = [
  {
    id: 'sales',
    name: 'Sales Insights',
    description: 'Identifies sales opportunities, pain points, and buying signals',
    color: 'from-green-400 to-emerald-600',
    icon: '💰',
    category: 'analysis',
    priority: 3
  },
  {
    id: 'hr',
    name: 'HR Analysis',
    description: 'Analyzes team dynamics, communication patterns, and performance',
    color: 'from-blue-400 to-cyan-600',
    icon: '👥',
    category: 'analysis',
    priority: 4
  },
  {
    id: 'compliance',
    name: 'Compliance Monitor',
    description: 'Flags compliance issues, regulatory concerns, and risk factors',
    color: 'from-red-400 to-rose-600',
    icon: '🔒',
    category: 'governance',
    priority: 1
  },
  {
    id: 'competitor',
    name: 'Competitive Intel',
    description: 'Identifies competitor mentions, market positioning, and threats',
    color: 'from-orange-400 to-amber-600',
    icon: '🎯',
    category: 'intelligence',
    priority: 3
  },
  {
    id: 'action-items',
    name: 'Action Items',
    description: 'Extracts tasks, deadlines, and follow-up requirements',
    color: 'from-purple-400 to-violet-600',
    icon: '✅',
    category: 'analysis',
    priority: 2
  }
];

// Export both legacy and new agent types
export const AGENT_TYPES = [...LEGACY_AGENT_TYPES, ...AGENTIC_AGENT_TYPES];

// Legacy AI Agent class for backward compatibility
class AIAgent {
  private systemPrompts: Record<string, string> = {
    sales: `You are a Sales Intelligence Agent. Analyze meeting transcripts to identify:
- Buying signals and purchase intent indicators
- Pain points and business challenges
- Budget discussions and financial capacity
- Decision-making authority and timeline
- Competitive positioning opportunities
- Objections and concerns

Provide analysis in JSON format with:
{
  "analysis": "detailed analysis summary",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "confidence_score": 0.85,
  "reasoning_chain": ["step 1", "step 2", "step 3"]
}`,

    hr: `You are an HR Analytics Agent. Analyze meeting transcripts to assess:
- Team dynamics and communication patterns
- Leadership effectiveness and management style
- Collaboration quality and participation levels
- Conflict resolution and decision-making processes
- Performance indicators and development needs
- Cultural alignment and engagement signals

Provide analysis in JSON format with:
{
  "analysis": "detailed analysis summary",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "confidence_score": 0.85,
  "reasoning_chain": ["step 1", "step 2", "step 3"]
}`,

    compliance: `You are a Compliance Monitoring Agent. Analyze meeting transcripts for:
- Regulatory compliance issues and violations
- Data privacy and security concerns (GDPR, CCPA, etc.)
- Industry-specific regulatory requirements
- Legal risk factors and contractual implications
- Documentation and audit trail requirements
- Ethical considerations and policy adherence

Provide analysis in JSON format with:
{
  "analysis": "detailed analysis summary",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "confidence_score": 0.85,
  "reasoning_chain": ["step 1", "step 2", "step 3"]
}`,

    competitor: `You are a Competitive Intelligence Agent. Analyze meeting transcripts to identify:
- Direct and indirect competitor mentions
- Competitive positioning and market perception
- Threat levels and competitive advantages
- Market share discussions and positioning strategies
- Feature comparisons and differentiation opportunities
- Competitive weaknesses and market gaps

Provide analysis in JSON format with:
{
  "analysis": "detailed analysis summary",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "confidence_score": 0.85,
  "reasoning_chain": ["step 1", "step 2", "step 3"]
}`,

    'action-items': `You are an Action Items Extraction Agent. Analyze meeting transcripts to extract:
- Explicit action items and task assignments
- Implicit follow-up requirements and next steps
- Deadlines and timeline commitments
- Responsibility assignments and accountability
- Meeting outcomes and decisions made
- Required deliverables and dependencies

Provide analysis in JSON format with:
{
  "analysis": "detailed analysis summary",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "confidence_score": 0.85,
  "reasoning_chain": ["step 1", "step 2", "step 3"]
}`
  };

  constructor(private agentType: AgentType) {}

  async analyze(transcriptSegment: string, context: string): Promise<ProvenanceEnvelope> {
    const traceId = uuidv4();
    const timestamp = new Date();

    try {
      if (openAIService.isReady()) {
        return await this.analyzeWithGPT4(transcriptSegment, context, traceId, timestamp);
      } else {
        return this.generateMockAnalysis(transcriptSegment, context, traceId, timestamp);
      }
    } catch (error) {
      console.error(`AI Agent ${this.agentType.id} error:`, error);
      return this.generateErrorAnalysis(transcriptSegment, context, traceId, timestamp, error);
    }
  }

  private async analyzeWithGPT4(
    transcriptSegment: string, 
    context: string, 
    traceId: string, 
    timestamp: Date
  ): Promise<ProvenanceEnvelope> {
    const systemPrompt = this.systemPrompts[this.agentType.id] || this.systemPrompts['sales'];
    const userPrompt = `Context: ${context}\n\nTranscript Segment to Analyze:\n${transcriptSegment}\n\nProvide your analysis focusing on ${this.agentType.description}.`;

    try {
      const response = await openAIService.analyzeWithGPT4(userPrompt, systemPrompt, 1000);
      const analysis = JSON.parse(response);

      return {
        agent_id: this.agentType.id,
        timestamp,
        inputs: {
          transcript_segment: transcriptSegment,
          context,
          previous_outputs: []
        },
        outputs: {
          analysis: analysis.analysis,
          insights: analysis.insights,
          confidence_score: analysis.confidence_score,
          reasoning_chain: analysis.reasoning_chain
        },
        confidence: analysis.confidence_score,
        trace_id: traceId
      };
    } catch (parseError) {
      console.error('Failed to parse GPT-4 response:', parseError);
      return this.generateFallbackAnalysis(transcriptSegment, context, traceId, timestamp);
    }
  }

  private generateMockAnalysis(
    transcriptSegment: string,
    context: string,
    traceId: string,
    timestamp: Date
  ): ProvenanceEnvelope {
    // Simulate realistic processing time
    const reasoningChain = this.generateReasoningChain(transcriptSegment);
    const analysis = this.generateAnalysis(transcriptSegment);
    const insights = this.generateInsights(transcriptSegment);
    
    return {
      agent_id: this.agentType.id,
      timestamp,
      inputs: {
        transcript_segment: transcriptSegment,
        context,
        previous_outputs: []
      },
      outputs: {
        analysis,
        insights,
        confidence_score: 0.75 + Math.random() * 0.2,
        reasoning_chain: reasoningChain
      },
      confidence: 0.75 + Math.random() * 0.2,
      trace_id: traceId
    };
  }

  private generateFallbackAnalysis(
    transcriptSegment: string,
    context: string,
    traceId: string,
    timestamp: Date
  ): ProvenanceEnvelope {
    return {
      agent_id: this.agentType.id,
      timestamp,
      inputs: {
        transcript_segment: transcriptSegment,
        context,
        previous_outputs: []
      },
      outputs: {
        analysis: `Fallback analysis for ${this.agentType.name}: Processing transcript segment with ${transcriptSegment.length} characters.`,
        insights: [`Basic insight from ${this.agentType.name}`, 'Fallback processing completed'],
        confidence_score: 0.6,
        reasoning_chain: ['Fallback analysis initiated', 'Basic processing completed']
      },
      confidence: 0.6,
      trace_id: traceId
    };
  }

  private generateErrorAnalysis(
    transcriptSegment: string,
    context: string,
    traceId: string,
    timestamp: Date,
    error: any
  ): ProvenanceEnvelope {
    return {
      agent_id: this.agentType.id,
      timestamp,
      inputs: {
        transcript_segment: transcriptSegment,
        context,
        previous_outputs: []
      },
      outputs: {
        analysis: `Error in ${this.agentType.name} analysis: ${error.message || 'Unknown error'}`,
        insights: ['Analysis failed due to error', 'Please check system configuration'],
        confidence_score: 0.1,
        reasoning_chain: ['Error occurred during analysis', 'Fallback error handling activated']
      },
      confidence: 0.1,
      trace_id: traceId
    };
  }
  private generateReasoningChain(transcript: string): string[] {
    const chains = {
      sales: [
        "Analyzing conversation for buying signals and pain points",
        "Identifying decision makers and influencers in the discussion",
        "Evaluating budget discussions and timeline indicators",
        "Assessing competitive positioning and differentiation opportunities"
      ],
      hr: [
        "Examining communication patterns and team dynamics",
        "Identifying leadership styles and collaboration effectiveness",
        "Analyzing conflict resolution and decision-making processes",
        "Evaluating performance indicators and development opportunities"
      ],
      compliance: [
        "Scanning for regulatory keywords and compliance triggers",
        "Assessing data privacy and security discussion points",
        "Evaluating contractual and legal implications",
        "Checking for industry-specific compliance requirements"
      ],
      competitor: [
        "Identifying direct and indirect competitor mentions",
        "Analyzing competitive positioning and market perception",
        "Evaluating threat levels and competitive advantages",
        "Assessing market share and positioning strategies"
      ],
      'action-items': [
        "Extracting explicit action items and task assignments",
        "Identifying implicit follow-up requirements",
        "Analyzing deadlines and priority indicators",
        "Categorizing tasks by urgency and responsibility"
      ]
    };

    return (chains as Record<string, string[]>)[this.agentType.id] || ["Analyzing transcript for relevant insights"];
  }

  private generateAnalysis(transcript: string): string {
    const words = transcript.toLowerCase();
    
    const analyses = {
      sales: this.generateSalesAnalysis(words),
      hr: this.generateHRAnalysis(words),
      compliance: this.generateComplianceAnalysis(words),
      competitor: this.generateCompetitorAnalysis(words),
      'action-items': this.generateActionItemsAnalysis(words)
    };

    return (analyses as Record<string, string>)[this.agentType.id] || "Real-time analysis of conversation content and context.";
  }

  private generateInsights(transcript: string): string[] {
    const words = transcript.toLowerCase();
    
    const baseInsights = {
      sales: this.generateSalesInsights(words),
      hr: this.generateHRInsights(words),
      compliance: this.generateComplianceInsights(words),
      competitor: this.generateCompetitorInsights(words),
      'action-items': this.generateActionItemsInsights(words)
    };

    return (baseInsights as Record<string, string[]>)[this.agentType.id] || ["Real-time insights generated from conversation analysis"];
  }

  private generateSalesInsights(words: string): string[] {
    const insights = [];
    if (words.includes('budget') || words.includes('cost')) insights.push("💰 Budget authority confirmed - high conversion probability");
    if (words.includes('timeline') || words.includes('urgent')) insights.push("⏰ Urgency detected - accelerate sales process");
    if (words.includes('decision') || words.includes('approve')) insights.push("✅ Decision maker engaged - present proposal");
    if (words.includes('competitor') || words.includes('alternative')) insights.push("⚡ Competitive situation - emphasize differentiators");
    return insights.length > 0 ? insights : ["🎯 Monitoring for buying signals and engagement patterns", "📊 Customer interest level: Medium to High", "💼 Sales opportunity in progress"];
  }

  private generateHRInsights(words: string): string[] {
    const insights = [];
    if (words.includes('team') || words.includes('collaboration')) insights.push("👥 Strong team collaboration detected");
    if (words.includes('stress') || words.includes('pressure')) insights.push("⚠️ Potential stress indicators - monitor team wellness");
    if (words.includes('performance') || words.includes('achievement')) insights.push("🏆 Performance-focused discussion - positive engagement");
    if (words.includes('leadership') || words.includes('manager')) insights.push("👨‍💼 Leadership dynamics being discussed");
    return insights.length > 0 ? insights : ["📈 Team communication appears effective", "🤝 Collaborative environment detected", "💪 Healthy team dynamics observed"];
  }

  private generateComplianceInsights(words: string): string[] {
    const insights = [];
    if (words.includes('data') || words.includes('privacy')) insights.push("🔒 Data privacy discussion - ensure GDPR compliance");
    if (words.includes('security') || words.includes('protection')) insights.push("🛡️ Security protocols being discussed");
    if (words.includes('audit') || words.includes('compliance')) insights.push("📋 Audit requirements mentioned - document decisions");
    if (words.includes('legal') || words.includes('contract')) insights.push("⚖️ Legal considerations in discussion");
    return insights.length > 0 ? insights : ["✅ No immediate compliance red flags detected", "📝 Documentation practices appear adequate", "🔍 Continuous monitoring active"];
  }

  private generateCompetitorInsights(words: string): string[] {
    const insights = [];
    if (words.includes('competitor') || words.includes('alternative')) insights.push("🏁 Active competitive evaluation detected");
    if (words.includes('better') || words.includes('compare')) insights.push("📊 Comparative analysis in progress");
    if (words.includes('market') || words.includes('industry')) insights.push("🌐 Market positioning discussion active");
    if (words.includes('price') || words.includes('cost')) insights.push("💲 Price sensitivity being evaluated");
    return insights.length > 0 ? insights : ["🎯 Market position appears strong", "🔍 Monitoring for competitive threats", "💪 Differentiation opportunities identified"];
  }

  private generateActionItemsInsights(words: string): string[] {
    const insights = [];
    if (words.includes('follow up') || words.includes('next step')) insights.push("📅 Clear follow-up actions identified");
    if (words.includes('schedule') || words.includes('meeting')) insights.push("🕐 Meeting coordination in progress");
    if (words.includes('task') || words.includes('responsibility')) insights.push("👤 Task ownership being assigned");
    if (words.includes('deadline') || words.includes('timeline')) insights.push("⏰ Deadlines and timelines being set");
    return insights.length > 0 ? insights : ["📋 3 actionable items identified", "👥 Task ownership clearly defined", "🎯 Next steps prioritized"];
  }

  private generateSalesAnalysis(words: string): string {
    if (words.includes('budget') || words.includes('cost') || words.includes('price')) {
      return "Strong budget discussion indicates qualified opportunity. Customer is evaluating pricing options and appears to have financial capacity. Recommend presenting value proposition and ROI metrics.";
    }
    if (words.includes('timeline') || words.includes('when') || words.includes('schedule')) {
      return "Customer expressing urgency about implementation timeline. This suggests active buying intent. Recommend accelerating sales process and providing clear implementation roadmap.";
    }
    if (words.includes('decision') || words.includes('approve') || words.includes('manager')) {
      return "Decision-making authority and approval process being discussed. Multiple stakeholders involved. Consider identifying all decision makers and their specific concerns.";
    }
    return "Analyzing conversation for sales opportunities, buying signals, and customer engagement patterns. Monitor for budget discussions, timeline requirements, and decision-making authority.";
  };

  private generateHRAnalysis(words: string): string {
    if (words.includes('team') || words.includes('collaboration') || words.includes('together')) {
      return "Strong team collaboration signals detected. Communication patterns show healthy group dynamics with balanced participation. Team appears well-coordinated and focused on collective goals.";
    }
    if (words.includes('stress') || words.includes('pressure') || words.includes('difficult')) {
      return "Potential stress indicators in team communication. Monitor for burnout signs and workload distribution issues. Consider implementing wellness check-ins and workload balancing strategies.";
    }
    if (words.includes('performance') || words.includes('goals') || words.includes('achievement')) {
      return "Performance-focused discussion indicates goal-oriented team culture. Team members are engaged with objectives and tracking progress. Positive indicators for productivity and achievement.";
    }
    return "Monitoring team dynamics, communication effectiveness, and collaboration patterns. Assessing leadership styles, conflict resolution, and overall team health indicators.";
  };

  private generateComplianceAnalysis(words: string): string {
    if (words.includes('data') || words.includes('privacy') || words.includes('security')) {
      return "Data privacy and security topics being discussed. Ensure all data handling practices comply with GDPR, CCPA, and industry regulations. Review data processing agreements and security protocols.";
    }
    if (words.includes('contract') || words.includes('legal') || words.includes('agreement')) {
      return "Legal and contractual discussions detected. Review all agreements for compliance with current regulations. Ensure proper documentation and approval processes are followed.";
    }
    if (words.includes('audit') || words.includes('compliance') || words.includes('regulation')) {
      return "Direct compliance discussion in progress. All mentioned procedures should align with current regulatory requirements. Document decisions for audit trail purposes.";
    }
    return "Continuously monitoring conversation for compliance triggers, regulatory keywords, and potential risk factors. No immediate compliance concerns detected in current discussion.";
  };

  private generateCompetitorAnalysis(words: string): string {
    if (words.includes('competitor') || words.includes('alternative') || words.includes('other option')) {
      return "Direct competitor discussion detected. Customer is actively evaluating alternatives. Opportunity to highlight unique differentiators and competitive advantages.";
    }
    if (words.includes('better') || words.includes('worse') || words.includes('compare')) {
      return "Comparative analysis being conducted. Customer weighing different options and features. Present clear value proposition and unique selling points to maintain competitive edge.";
    }
    if (words.includes('market') || words.includes('industry') || words.includes('standard')) {
      return "Market and industry context being discussed. Customer has awareness of market landscape. Position solution as industry leader with proven track record and innovation.";
    }
    return "Analyzing conversation for competitor mentions, market positioning discussions, and competitive threats. Monitoring for opportunities to strengthen competitive positioning.";
  };

  private generateActionItemsAnalysis(words: string): string {
    if (words.includes('follow up') || words.includes('next step') || words.includes('action')) {
      return "Clear action items and follow-up tasks identified. Multiple stakeholders have committed to specific deliverables with defined timelines. Strong momentum for project progression.";
    }
    if (words.includes('schedule') || words.includes('meeting') || words.includes('call')) {
      return "Scheduling and meeting coordination in progress. Team is actively planning next steps and organizing follow-up sessions. Good project management and communication flow.";
    }
    if (words.includes('task') || words.includes('responsibility') || words.includes('owner')) {
      return "Task assignment and ownership being clarified. Clear delegation of responsibilities with identified task owners. Effective project management and accountability structures.";
    }
    return "Extracting actionable items, task assignments, and follow-up requirements from conversation. Monitoring for deadlines, deliverables, and responsibility assignments.";
  };

  // New method for streaming analysis
  async streamAnalysis(
    transcriptSegment: string,
    context: string,
    onChunk: (chunk: string) => void
  ): Promise<ProvenanceEnvelope> {
    const traceId = uuidv4();
    const timestamp = new Date();

    if (openAIService.isReady()) {
      const systemPrompt = this.systemPrompts[this.agentType.id] || this.systemPrompts['sales'];
      const userPrompt = `Context: ${context}\n\nTranscript Segment to Analyze:\n${transcriptSegment}\n\nProvide your analysis focusing on ${this.agentType.description}.`;

      try {
        let fullResponse = '';
        await openAIService.streamAnalysis(
          userPrompt,
          systemPrompt,
          (chunk) => {
            fullResponse += chunk;
            onChunk(chunk);
          },
          1000
        );

        // Parse the complete response
        const analysis = JSON.parse(fullResponse);
        
        return {
          agent_id: this.agentType.id,
          timestamp,
          inputs: {
            transcript_segment: transcriptSegment,
            context,
            previous_outputs: []
          },
          outputs: {
            analysis: analysis.analysis,
            insights: analysis.insights,
            confidence_score: analysis.confidence_score,
            reasoning_chain: analysis.reasoning_chain
          },
          confidence: analysis.confidence_score,
          trace_id: traceId
        };
      } catch (error) {
        console.error('Streaming analysis error:', error);
        return this.generateErrorAnalysis(transcriptSegment, context, traceId, timestamp, error);
      }
    } else {
      // Simulate streaming for mock analysis
      const mockAnalysis = this.generateMockAnalysis(transcriptSegment, context, traceId, timestamp);
      const analysisText = mockAnalysis.outputs.analysis;
      
      // Simulate streaming by sending chunks
      if (analysisText) {
        for (let i = 0; i < analysisText.length; i += 10) {
          const chunk = analysisText.substring(i, i + 10);
          onChunk(chunk);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      return mockAnalysis;
    }
  }
}

// Agentic System Manager
export class AgenticSystemManager {
  private logger: LoggerAuditAgent;
  private sttAgent: STTAgent;
  private entityExtractionAgent: EntityExtractionAgent;
  private domainIntelligenceAgent: DomainIntelligenceAgent;
  private legacyAgents: Map<string, AIAgent>;
  private isInitialized = false;

  constructor() {
    this.logger = new LoggerAuditAgent();
    this.sttAgent = new STTAgent(eventBus, this.logger);
    this.entityExtractionAgent = new EntityExtractionAgent(eventBus, this.logger);
    this.domainIntelligenceAgent = new DomainIntelligenceAgent(eventBus, this.logger);
    
    // Create legacy agents for backward compatibility
    this.legacyAgents = new Map();
    LEGACY_AGENT_TYPES.forEach(agentType => {
      this.legacyAgents.set(agentType.id, new AIAgent(agentType));
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize orchestrator
      console.log('Initializing Agentic System...');
      
      // Setup event listeners for legacy agent integration
      this.setupLegacyAgentIntegration();
      
      this.isInitialized = true;
      console.log('Agentic System initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize Agentic System:', error);
      throw error;
    }
  }

  private setupLegacyAgentIntegration(): void {
    // Bridge legacy agents with new agentic system
    eventBus.subscribe('utterance.detected', 'legacy-bridge', async (event) => {
      const { segment } = event.data;
      
      // Run legacy agents in parallel with new system
      const promises = Array.from(this.legacyAgents.values()).map(agent => 
        agent.analyze(segment.text, JSON.stringify(event.data.context))
      );
      
      try {
        const results = await Promise.allSettled(promises);
        
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const agentType = LEGACY_AGENT_TYPES[index];
            
            // Emit legacy agent result as part of agentic system
            eventBus.publish({
              type: 'legacy.agent.completed',
              data: {
                agent_type: agentType.id,
                result: result.value,
                session_id: event.data.session_id
              },
              timestamp: new Date(),
              source: 'legacy-bridge',
              trace_id: event.trace_id
            });
          }
        });
      } catch (error) {
        console.error('Legacy agent integration error:', error);
      }
    });
  }

  async startSession(sessionId: string, participants: string[] = []): Promise<void> {
    await this.initialize();
    await orchestrator.startSession(sessionId, participants);
  }

  async stopSession(): Promise<void> {
    await orchestrator.stopSession();
    await this.sttAgent.stopTranscription();
  }

  async startTranscription(sessionId: string): Promise<void> {
    await this.sttAgent.startTranscription(sessionId);
  }

  async stopTranscription(): Promise<void> {
    await this.sttAgent.stopTranscription();
  }

  async processUtterance(transcript: string, speaker: string = 'unknown'): Promise<void> {
    await orchestrator.processUtterance(transcript, speaker);
  }

  // Legacy method for backward compatibility
  async analyzeLegacy(agentId: string, transcript: string, context: string): Promise<ProvenanceEnvelope | null> {
    const agent = this.legacyAgents.get(agentId);
    if (!agent) {
      console.warn(`Legacy agent ${agentId} not found`);
      return null;
    }
    
    return await agent.analyze(transcript, context);
  }

  // Legacy streaming method
  async streamAnalysisLegacy(
    agentId: string,
    transcript: string,
    context: string,
    onChunk: (chunk: string) => void
  ): Promise<ProvenanceEnvelope | null> {
    const agent = this.legacyAgents.get(agentId);
    if (!agent) {
      console.warn(`Legacy agent ${agentId} not found`);
      return null;
    }
    
    return await agent.streamAnalysis(transcript, context, onChunk);
  }

  getOrchestrator() {
    return orchestrator;
  }

  getEventBus() {
    return eventBus;
  }

  getLogger() {
    return this.logger;
  }

  getSTTAgent() {
    return this.sttAgent;
  }

  getEntityExtractionAgent() {
    return this.entityExtractionAgent;
  }

  getDomainIntelligenceAgent() {
    return this.domainIntelligenceAgent;
  }

  getLegacyAgents() {
    return this.legacyAgents;
  }

  getSystemHealth() {
    return {
      orchestrator: {
        active_tasks: orchestrator.getActiveTasks().length,
        agent_health: Object.fromEntries(orchestrator.getAgentHealth()),
        conversation_state: orchestrator.getConversationState()
      },
      event_bus: eventBus.getHealthStatus(),
      logger: this.logger.getSystemHealth(),
      stt: this.sttAgent.getStats(),
      entity_extraction: this.entityExtractionAgent.getStats(),
      domain_intelligence: this.domainIntelligenceAgent.getStats()
    };
  }

  async shutdown(): Promise<void> {
    await this.stopSession();
    this.entityExtractionAgent.shutdown();
    this.domainIntelligenceAgent.shutdown();
    this.isInitialized = false;
  }
}

// Singleton instance
export const agenticSystem = new AgenticSystemManager();

// Legacy function for backward compatibility
export const createAIAgents = (): Map<string, AIAgent> => {
  const agents = new Map();
  LEGACY_AGENT_TYPES.forEach(agentType => {
    agents.set(agentType.id, new AIAgent(agentType));
  });
  return agents;
};