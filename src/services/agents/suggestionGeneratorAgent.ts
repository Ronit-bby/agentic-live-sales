import { v4 as uuidv4 } from 'uuid';
import { 
  ExtractedEntity, 
  DomainIntelligence, 
  PersonEnrichment, 
  Suggestion, 
  ProvenanceEnvelope 
} from '../../types';
import { eventBus } from '../eventBus';

/**
 * Suggestion Generator/Planner Agent - Contextual talking points generation
 * 
 * Capabilities:
 * - Context-aware talking point generation
 * - Meeting stage-appropriate suggestions  
 * - Objection handling recommendations
 * - Question prompts based on conversation analysis
 * - Closing technique suggestions
 * - Follow-up action recommendations
 */
export class SuggestionGeneratorAgent {
  private readonly agentId = 'suggestion-generator';
  private suggestionCache: Map<string, Suggestion[]> = new Map();
  private readonly cacheTimeout = 30 * 60 * 1000; // 30 minutes

  // Suggestion templates organized by type and context
  private suggestionTemplates: {
    talking_points: {
      [key: string]: string[];
    };
    questions: {
      [key: string]: string[];
    };
    objection_handlers: {
      [key: string]: string[];
    };
  } = {
    talking_points: {
      opening: [
        "Thank you for taking the time to meet with us today. I'd love to learn more about {company_name}'s current {industry} challenges.",
        "I noticed {company_name} recently {news_item}. How has this impacted your {department} operations?",
        "Given {company_name}'s focus on {company_tags}, I'm curious about your current priorities in this area."
      ],
      discovery: [
        "Can you walk me through your current process for {relevant_topic}?",
        "What are the biggest pain points your team faces with {current_solution}?",
        "How are you currently measuring success in {business_area}?",
        "What would an ideal solution look like for {specific_challenge}?"
      ],
      presentation: [
        "Based on what you've shared about {pain_point}, our {feature} can specifically address this by {benefit}.",
        "Companies similar to {company_name} have seen {metric_improvement} using our {solution_component}.",
        "Let me show you how {feature_name} would work in your {company_name} environment."
      ],
      closing: [
        "Based on our discussion, it sounds like {solution} aligns well with {company_name}'s goals. What questions do you have?",
        "What would need to happen for {company_name} to move forward with a solution like this?",
        "Who else at {company_name} would be involved in this decision-making process?"
      ]
    },
    questions: {
      discovery: [
        "What's driving the urgency to solve {problem_area} now?",
        "How is {current_challenge} impacting your team's productivity?",
        "What's your timeline for implementing a new {solution_type}?",
        "What's your budget range for addressing {pain_point}?"
      ],
      qualification: [
        "Who else is involved in evaluating {solution_category} solutions?",
        "What other options are you considering besides {our_solution}?",
        "What criteria will you use to make the final decision?",
        "When do you need to have a solution in place?"
      ]
    },
    objection_handlers: {
      price: [
        "I understand cost is a consideration. Let's look at the ROI - {company_name} could save {estimated_savings} annually.",
        "What's the cost of not solving {pain_point}? Our customers typically see payback within {timeframe}.",
        "Let's break down the investment - it's {cost_per_employee} per employee per month for {value_proposition}."
      ],
      timing: [
        "I hear that timing is a concern. What would make {timeframe} the right time to move forward?",
        "What's the impact of waiting another {delay_period} to address {problem}?",
        "We can phase the implementation to align with your {business_cycle}."
      ],
      competition: [
        "That's great that you're evaluating multiple options. How does {competitor} address {specific_requirement}?",
        "What's most important to you in a {solution_type} - functionality, support, or integration?",
        "Many clients choose us over {competitor} because of our {differentiator}."
      ]
    }
  };

  constructor() {
    this.initializeEventHandlers();
  }

  private initializeEventHandlers(): void {
    eventBus.on('agent.task.execute', this.handleTaskExecution.bind(this));
  }

  private async handleTaskExecution(event: any): Promise<void> {
    const task = event.data;
    if (task.agent_id !== this.agentId) return;

    try {
      const result = await this.generateSuggestions(task.payload);
      
      eventBus.publish({
        type: 'agent.task.completed',
        data: {
          task_id: task.id,
          agent_id: this.agentId,
          result
        },
        timestamp: new Date(),
        source: this.agentId,
        trace_id: task.trace_id
      });
    } catch (error) {
      eventBus.publish({
        type: 'agent.task.failed',
        data: {
          task_id: task.id,
          agent_id: this.agentId,
          error: error instanceof Error ? error.message : String(error)
        },
        timestamp: new Date(),
        source: this.agentId,
        trace_id: task.trace_id
      });
    }
  }

  async generateSuggestions(payload: {
    transcript?: string;
    entities?: ExtractedEntity[];
    domain_context?: DomainIntelligence[];
    person_context?: PersonEnrichment[];
    meeting_stage?: 'opening' | 'discovery' | 'presentation' | 'objection_handling' | 'closing';
    retrieved_documents?: any[];
    suggestion_types?: string[];
    max_suggestions?: number;
  }): Promise<ProvenanceEnvelope> {
    const startTime = Date.now();
    const traceId = uuidv4();

    const meetingStage = payload.meeting_stage || this.detectMeetingStage(payload.transcript || '');
    const suggestionTypes = payload.suggestion_types || ['talking_point', 'question'];
    const maxSuggestions = payload.max_suggestions || 3;

    // Check cache
    const cacheKey = this.createCacheKey(payload);
    const cached = this.getCachedSuggestions(cacheKey);
    if (cached) {
      return this.createProvenanceEnvelope(payload, cached, traceId, startTime, true);
    }

    // Generate contextual suggestions
    const suggestions = await this.performSuggestionGeneration(
      payload,
      meetingStage,
      suggestionTypes,
      maxSuggestions
    );

    // Cache results
    this.suggestionCache.set(cacheKey, suggestions);

    return this.createProvenanceEnvelope(payload, suggestions, traceId, startTime, false);
  }

  private createCacheKey(payload: any): string {
    const keyElements = [
      payload.meeting_stage || 'unknown',
      payload.entities?.length || 0,
      payload.domain_context?.length || 0,
      payload.transcript?.substring(0, 50) || ''
    ];
    return keyElements.join('_');
  }

  private getCachedSuggestions(cacheKey: string): Suggestion[] | null {
    return this.suggestionCache.get(cacheKey) || null;
  }

  private detectMeetingStage(transcript: string): string {
    const transcriptLower = transcript.toLowerCase();
    
    // Opening indicators
    if (transcriptLower.includes('thank you for') || 
        transcriptLower.includes('great to meet') ||
        transcriptLower.includes('appreciate your time')) {
      return 'opening';
    }
    
    // Discovery indicators
    if (transcriptLower.includes('tell me about') ||
        transcriptLower.includes('what are your') ||
        transcriptLower.includes('how do you currently')) {
      return 'discovery';
    }
    
    // Presentation indicators
    if (transcriptLower.includes('let me show you') ||
        transcriptLower.includes('our solution') ||
        transcriptLower.includes('this feature')) {
      return 'presentation';
    }
    
    // Closing indicators
    if (transcriptLower.includes('what questions') ||
        transcriptLower.includes('next steps') ||
        transcriptLower.includes('move forward')) {
      return 'closing';
    }
    
    // Objection handling indicators
    if (transcriptLower.includes('but ') ||
        transcriptLower.includes('however') ||
        transcriptLower.includes('concerned about')) {
      return 'objection_handling';
    }
    
    return 'discovery'; // Default stage
  }

  private async performSuggestionGeneration(
    payload: any,
    meetingStage: string,
    suggestionTypes: string[],
    maxSuggestions: number
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    const context = this.buildContext(payload);

    // Generate suggestions for each requested type
    for (const type of suggestionTypes) {
      const typeSuggestions = await this.generateSuggestionsByType(
        type,
        meetingStage,
        context,
        Math.ceil(maxSuggestions / suggestionTypes.length)
      );
      suggestions.push(...typeSuggestions);
    }

    // Limit to max suggestions and sort by relevance
    return this.rankSuggestions(suggestions, context).slice(0, maxSuggestions);
  }

  private buildContext(payload: any): any {
    const context: {
      company_name: string;
      industry: string;
      pain_points: string[];
      features_mentioned: string[];
      competitors_mentioned: string[];
      budget_indicators: string[];
      timeline_indicators: string[];
      decision_makers: string[];
      company_tags?: string;
      news_item?: string;
      person_title?: string;
    } = {
      company_name: 'the company',
      industry: 'their industry',
      pain_points: [],
      features_mentioned: [],
      competitors_mentioned: [],
      budget_indicators: [],
      timeline_indicators: [],
      decision_makers: []
    };

    // Extract context from entities
    if (payload.entities) {
      for (const entity of payload.entities) {
        switch (entity.type) {
          case 'company':
            context.company_name = entity.value;
            break;
          case 'competitor':
            context.competitors_mentioned.push(entity.value);
            break;
          case 'product':
            context.features_mentioned.push(entity.value);
            break;
        }
      }
    }

    // Extract context from domain intelligence
    if (payload.domain_context && payload.domain_context.length > 0) {
      const domainInfo = payload.domain_context[0];
      context.company_name = domainInfo.company_name;
      context.industry = domainInfo.industry;
      context.company_tags = domainInfo.tags.join(', ');
      
      if (domainInfo.news && domainInfo.news.length > 0) {
        context.news_item = domainInfo.news[0].title;
      }
    }

    // Extract context from person information
    if (payload.person_context && payload.person_context.length > 0) {
      const personInfo = payload.person_context[0];
      context.person_title = personInfo.title;
      context.decision_makers.push(personInfo.name || 'key stakeholder');
    }

    // Extract context from retrieved documents
    if (payload.retrieved_documents) {
      for (const doc of payload.retrieved_documents) {
        if (doc.metadata?.type === 'feature') {
          context.features_mentioned.push(doc.content.split(' ')[0]);
        }
      }
    }

    return context;
  }

  private async generateSuggestionsByType(
    type: string,
    meetingStage: string,
    context: any,
    count: number
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Get appropriate templates for the type and stage
    const templates = this.getTemplatesForTypeAndStage(type, meetingStage);
    
    if (!templates || templates.length === 0) {
      return suggestions;
    }

    // Generate suggestions from templates
    const selectedTemplates = this.selectTemplates(templates, count);
    
    for (const template of selectedTemplates) {
      const content = this.populateTemplate(template, context);
      
      suggestions.push({
        id: uuidv4(),
        type: this.mapToSuggestionType(type),
        content,
        context: this.formatContext(context),
        generated_by: this.agentId,
        trace_id: uuidv4(),
        created_at: new Date()
      });
    }

    return suggestions;
  }

  private getTemplatesForTypeAndStage(type: string, stage: string): string[] {
    // Map suggestion type to template category
    let templateCategory = type;
    if (type === 'talking_point') templateCategory = 'talking_points';
    if (type === 'question') templateCategory = 'questions';
    if (type === 'objection_handler') templateCategory = 'objection_handlers';

    const categoryTemplates = (this.suggestionTemplates as any)[templateCategory];
    if (!categoryTemplates) return [];

    // For objection handlers, return all relevant ones
    if (templateCategory === 'objection_handlers') {
      return [
        ...categoryTemplates.price,
        ...categoryTemplates.timing,
        ...categoryTemplates.competition
      ];
    }

    // For other types, return stage-specific templates
    return categoryTemplates[stage] || categoryTemplates.discovery || [];
  }

  private selectTemplates(templates: string[], count: number): string[] {
    if (templates.length <= count) return templates;
    
    // Randomly select templates to provide variety
    const shuffled = [...templates].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private populateTemplate(template: string, context: any): string {
    let populated = template;
    
    // Replace placeholders with context values
    const replacements = {
      '{company_name}': context.company_name,
      '{industry}': context.industry,
      '{company_tags}': context.company_tags || 'business goals',
      '{news_item}': context.news_item || 'expanded their operations',
      '{department}': context.person_title ? this.inferDepartment(context.person_title) : 'team',
      '{relevant_topic}': context.features_mentioned[0] || 'your current workflow',
      '{current_solution}': 'your existing solution',
      '{business_area}': context.industry || 'this area',
      '{specific_challenge}': context.pain_points[0] || 'these challenges',
      '{pain_point}': 'the challenges you mentioned',
      '{feature}': context.features_mentioned[0] || 'our platform',
      '{benefit}': 'streamlining your processes',
      '{metric_improvement}': '30-40% efficiency gains',
      '{solution_component}': 'our integrated solution',
      '{feature_name}': context.features_mentioned[0] || 'this feature',
      '{solution}': 'our solution',
      '{problem_area}': context.pain_points[0] || 'this challenge',
      '{current_challenge}': 'these issues',
      '{solution_type}': 'solution',
      '{timeframe}': 'the next quarter',
      '{our_solution}': 'our platform',
      '{solution_category}': context.industry + ' solutions',
      '{cost_per_employee}': '$50',
      '{value_proposition}': 'comprehensive analytics and insights',
      '{estimated_savings}': '$100,000',
      '{delay_period}': '6 months',
      '{problem}': 'these challenges',
      '{business_cycle}': 'your business cycle',
      '{competitor}': context.competitors_mentioned[0] || 'other solutions',
      '{specific_requirement}': 'your key requirements',
      '{differentiator}': 'our advanced AI capabilities'
    };

    // Apply replacements
    for (const [placeholder, value] of Object.entries(replacements)) {
      populated = populated.replace(new RegExp(placeholder, 'g'), value);
    }

    return populated;
  }

  private inferDepartment(title: string): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('sales')) return 'sales';
    if (titleLower.includes('marketing')) return 'marketing';
    if (titleLower.includes('engineering') || titleLower.includes('tech')) return 'engineering';
    if (titleLower.includes('operations') || titleLower.includes('ops')) return 'operations';
    if (titleLower.includes('finance')) return 'finance';
    if (titleLower.includes('hr') || titleLower.includes('human')) return 'HR';
    
    return 'team';
  }

  private mapToSuggestionType(type: string): 'talking_point' | 'question' | 'objection_handler' | 'closing_technique' {
    const mapping: { [key: string]: 'talking_point' | 'question' | 'objection_handler' | 'closing_technique' } = {
      'talking_point': 'talking_point',
      'question': 'question',
      'objection_handler': 'objection_handler',
      'closing': 'closing_technique'
    };
    return mapping[type] || 'talking_point';
  }

  private formatContext(context: any): string {
    const contextParts = [];
    
    if (context.company_name !== 'the company') {
      contextParts.push(`Company: ${context.company_name}`);
    }
    if (context.industry) {
      contextParts.push(`Industry: ${context.industry}`);
    }
    if (context.person_title) {
      contextParts.push(`Contact: ${context.person_title}`);
    }
    
    return contextParts.join(', ') || 'General sales conversation';
  }

  private rankSuggestions(suggestions: Suggestion[], context: any): Suggestion[] {
    // Simple ranking based on context relevance
    return suggestions.sort((a, b) => {
      let scoreA = 0.5; // Base score
      let scoreB = 0.5;

      // Boost score if suggestion contains company name
      if (a.content.includes(context.company_name) && context.company_name !== 'the company') {
        scoreA += 0.3;
      }
      if (b.content.includes(context.company_name) && context.company_name !== 'the company') {
        scoreB += 0.3;
      }

      // Boost score for specific features mentioned
      if (context.features_mentioned.length > 0) {
        const hasFeatureA = context.features_mentioned.some((feature: string) => 
          a.content.toLowerCase().includes(feature.toLowerCase())
        );
        const hasFeatureB = context.features_mentioned.some((feature: string) => 
          b.content.toLowerCase().includes(feature.toLowerCase())
        );
        
        if (hasFeatureA) scoreA += 0.2;
        if (hasFeatureB) scoreB += 0.2;
      }

      return scoreB - scoreA;
    });
  }

  private createProvenanceEnvelope(
    payload: any,
    suggestions: Suggestion[],
    traceId: string,
    startTime: number,
    fromCache: boolean
  ): ProvenanceEnvelope {
    return {
      agent_id: this.agentId,
      timestamp: new Date(),
      inputs: {
        transcript_segment: payload.transcript,
        entities: payload.entities,
        domain_context: payload.domain_context,
        person_context: payload.person_context,
        meeting_stage: payload.meeting_stage,
        previous_outputs: []
      },
      outputs: {
        suggestions,
        suggestion_count: suggestions.length,
        confidence_score: this.calculateConfidence(suggestions, payload),
        reasoning_chain: [
          'Analyzed conversation context and entities',
          'Detected meeting stage from conversation flow',
          fromCache ? 'Retrieved suggestions from cache' : 'Generated contextual suggestions from templates',
          'Populated templates with company and person context',
          'Ranked suggestions by relevance and specificity',
          'Applied confidence scoring based on context quality'
        ]
      },
      confidence: this.calculateConfidence(suggestions, payload),
      trace_id: traceId,
      sources: [
        {
          type: 'database',
          title: 'Suggestion Template Library',
          confidence: 0.9,
          accessed_at: new Date(),
          snippet: `Used ${suggestions.length} contextual templates`
        }
      ],
      processing_time_ms: Date.now() - startTime,
      agent_version: '1.0.0'
    };
  }

  private calculateConfidence(suggestions: Suggestion[], payload: any): number {
    let confidence = 0.6; // Base confidence

    // Boost for rich context
    if (payload.domain_context && payload.domain_context.length > 0) {
      confidence += 0.15;
    }
    if (payload.person_context && payload.person_context.length > 0) {
      confidence += 0.1;
    }
    if (payload.entities && payload.entities.length > 2) {
      confidence += 0.1;
    }

    // Boost for specific company information
    if (payload.domain_context?.[0]?.company_name !== 'Unknown Company') {
      confidence += 0.1;
    }

    return Math.min(confidence, 0.95);
  }

  // Public API methods
  async getTalkingPoints(context: any, count: number = 3): Promise<Suggestion[]> {
    try {
      const result = await this.generateSuggestions({
        ...context,
        suggestion_types: ['talking_point'],
        max_suggestions: count
      });
      return result.outputs.suggestions || [];
    } catch (error) {
      console.error('Talking points generation failed:', error);
      return [];
    }
  }

  async getQuestions(context: any, count: number = 3): Promise<Suggestion[]> {
    try {
      const result = await this.generateSuggestions({
        ...context,
        suggestion_types: ['question'],
        max_suggestions: count
      });
      return result.outputs.suggestions || [];
    } catch (error) {
      console.error('Question generation failed:', error);
      return [];
    }
  }

  clearCache(): void {
    this.suggestionCache.clear();
  }

  getCacheSize(): number {
    return this.suggestionCache.size;
  }
}

// Export singleton instance
export const suggestionGeneratorAgent = new SuggestionGeneratorAgent();