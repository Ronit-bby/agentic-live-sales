import { AgentType, ProvenanceEnvelope } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { openAIService } from './openai';

export const AGENT_TYPES: AgentType[] = [
  {
    id: 'sales',
    name: 'Sales Insights',
    description: 'Identifies sales opportunities, pain points, and buying signals',
    color: 'from-green-400 to-emerald-600',
    icon: '💰'
  },
  {
    id: 'hr',
    name: 'HR Analysis',
    description: 'Analyzes team dynamics, communication patterns, and performance',
    color: 'from-blue-400 to-cyan-600',
    icon: '👥'
  },
  {
    id: 'compliance',
    name: 'Compliance Monitor',
    description: 'Flags compliance issues, regulatory concerns, and risk factors',
    color: 'from-red-400 to-rose-600',
    icon: '🔒'
  },
  {
    id: 'competitor',
    name: 'Competitive Intel',
    description: 'Identifies competitor mentions, market positioning, and threats',
    color: 'from-orange-400 to-amber-600',
    icon: '🎯'
  },
  {
    id: 'action-items',
    name: 'Action Items',
    description: 'Extracts tasks, deadlines, and follow-up requirements',
    color: 'from-purple-400 to-violet-600',
    icon: '✅'
  }
];

class AIAgent {
  private systemPrompts = {
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
    const systemPrompt = this.systemPrompts[this.agentType.id];
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

    return chains[this.agentType.id] || ["Analyzing transcript for relevant insights"];
  }

  private generateAnalysis(transcript: string): string {
    const analyses = {
      sales: this.generateSalesAnalysis(transcript),
      hr: this.generateHRAnalysis(transcript),
      compliance: this.generateComplianceAnalysis(transcript),
      competitor: this.generateCompetitorAnalysis(transcript),
      'action-items': this.generateActionItemsAnalysis(transcript)
    };

    return analyses[this.agentType.id] || "Analysis generated based on transcript content";
  }

  private generateInsights(transcript: string): string[] {
    const baseInsights = {
      sales: [
        "Strong buying signals detected in customer responses",
        "Price sensitivity appears moderate to low",
        "Decision timeline estimated at 2-3 weeks"
      ],
      hr: [
        "Team collaboration appears effective",
        "Communication style is direct and solution-focused",
        "Leadership engagement is high"
      ],
      compliance: [
        "No immediate compliance red flags detected",
        "Data handling practices align with regulations",
        "Documentation requirements being met"
      ],
      competitor: [
        "Two competitor mentions identified",
        "Market position appears strong",
        "Differentiation opportunities in feature set"
      ],
      'action-items': [
        "3 high-priority tasks identified",
        "2 follow-up meetings required",
        "Documentation needs updating"
      ]
    };

    return baseInsights[this.agentType.id] || ["Insights generated from transcript analysis"];
  }

  private generateSalesAnalysis(transcript: string): string {
    return "Customer shows strong interest in the solution. Budget discussions indicate financial capacity. Decision-making authority appears to be present in the meeting. Timeline for implementation aligns with our capabilities.";
  }

  private generateHRAnalysis(transcript: string): string {
    return "Team dynamics appear healthy with good participation from all members. Communication styles are complementary. Leadership is providing clear direction while encouraging input from team members.";
  }

  private generateComplianceAnalysis(transcript: string): string {
    return "No compliance violations detected in the discussion. Data handling practices mentioned are appropriate. Security protocols being followed according to industry standards.";
  }

  private generateCompetitorAnalysis(transcript: string): string {
    return "Competitor mentions suggest awareness of market alternatives. Our positioning appears strong relative to mentioned competitors. Opportunity exists to highlight unique differentiators.";
  }

  private generateActionItemsAnalysis(transcript: string): string {
    return "Multiple action items identified with clear ownership and timelines. Follow-up meetings scheduled appropriately. Documentation and deliverables clearly defined.";
  }

  // New method for streaming analysis
  async streamAnalysis(
    transcriptSegment: string,
    context: string,
    onChunk: (chunk: string) => void
  ): Promise<ProvenanceEnvelope> {
    const traceId = uuidv4();
    const timestamp = new Date();

    if (openAIService.isReady()) {
      const systemPrompt = this.systemPrompts[this.agentType.id];
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
      for (let i = 0; i < analysisText.length; i += 10) {
        const chunk = analysisText.substring(i, i + 10);
        onChunk(chunk);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      return mockAnalysis;
    }
  }
}

export const createAIAgents = (): Map<string, AIAgent> => {
  const agents = new Map();
  AGENT_TYPES.forEach(agentType => {
    agents.set(agentType.id, new AIAgent(agentType));
  });
  return agents;
};