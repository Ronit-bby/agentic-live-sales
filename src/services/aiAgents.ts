import { AgentType, ProvenanceEnvelope } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
  constructor(private agentType: AgentType) {}

  async analyze(transcriptSegment: string, context: string): Promise<ProvenanceEnvelope> {
    // Simulate AI analysis with realistic processing time
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const traceId = uuidv4();
    const reasoningChain = this.generateReasoningChain(transcriptSegment);
    const analysis = this.generateAnalysis(transcriptSegment);
    const insights = this.generateInsights(transcriptSegment);
    
    return {
      agent_id: this.agentType.id,
      timestamp: new Date(),
      inputs: {
        transcript_segment: transcriptSegment,
        context,
        previous_outputs: []
      },
      outputs: {
        analysis,
        insights,
        confidence_score: 0.8 + Math.random() * 0.15,
        reasoning_chain: reasoningChain
      },
      confidence: 0.8 + Math.random() * 0.15,
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
}

export const createAIAgents = (): Map<string, AIAgent> => {
  const agents = new Map();
  AGENT_TYPES.forEach(agentType => {
    agents.set(agentType.id, new AIAgent(agentType));
  });
  return agents;
};