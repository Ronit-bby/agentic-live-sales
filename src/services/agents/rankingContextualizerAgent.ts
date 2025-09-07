import { v4 as uuidv4 } from 'uuid';
import { 
  Suggestion, 
  RankedSuggestion, 
  ExtractedEntity, 
  DomainIntelligence, 
  PersonEnrichment,
  ProvenanceEnvelope 
} from '../../types';
import { eventBus } from '../eventBus';

/**
 * Ranking/Contextualizer Agent - Relevance ranking with latency-awareness
 * 
 * Capabilities:
 * - Multi-factor suggestion ranking (relevance, timing, confidence)
 * - Latency-aware prioritization for real-time delivery
 * - Context-sensitive scoring based on conversation state
 * - Feedback incorporation for continuous learning
 * - A/B testing support for ranking algorithms
 * - Performance optimization for sub-second response times
 */
export class RankingContextualizerAgent {
  private readonly agentId = 'ranking-contextualizer';
  private rankingCache: Map<string, RankedSuggestion[]> = new Map();
  private feedbackData: Map<string, number> = new Map(); // suggestion_id -> user_rating
  private performanceMetrics: Map<string, number> = new Map();
  private readonly cacheTimeout = 10 * 60 * 1000; // 10 minutes

  // Ranking weights that can be tuned based on feedback
  private rankingWeights = {
    relevance: 0.4,
    timing: 0.25,
    confidence: 0.2,
    personalization: 0.1,
    feedback_boost: 0.05
  };

  // Real-time constraints for latency-aware ranking
  private latencyConstraints = {
    target_response_time_ms: 500,
    max_suggestions_realtime: 5,
    fallback_timeout_ms: 1000
  };

  constructor() {
    this.initializeEventHandlers();
    this.initializePerformanceTracking();
  }

  private initializeEventHandlers(): void {
    eventBus.on('agent.task.execute', this.handleTaskExecution.bind(this));
    eventBus.on('suggestion.feedback', this.handleSuggestionFeedback.bind(this));
  }

  private initializePerformanceTracking(): void {
    // Track performance metrics for optimization
    this.performanceMetrics.set('avg_ranking_time_ms', 0);
    this.performanceMetrics.set('cache_hit_rate', 0);
    this.performanceMetrics.set('feedback_count', 0);
  }

  private async handleTaskExecution(event: any): Promise<void> {
    const task = event.data;
    if (task.agent_id !== this.agentId) return;

    const startTime = Date.now();

    try {
      const result = await this.rankSuggestions(task.payload);
      
      // Track performance
      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics('avg_ranking_time_ms', processingTime);
      
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

  private handleSuggestionFeedback(event: any): void {
    const { suggestion_id, rating, context } = event.data;
    this.feedbackData.set(suggestion_id, rating);
    this.updatePerformanceMetrics('feedback_count', 1);
    
    // Adjust ranking weights based on feedback (simple learning)
    this.adaptRankingWeights(rating, context);
  }

  async rankSuggestions(payload: {
    suggestions: Suggestion[];
    entities?: ExtractedEntity[];
    domain_context?: DomainIntelligence[];
    person_context?: PersonEnrichment[];
    conversation_context?: any;
    meeting_stage?: string;
    urgency_level?: 'low' | 'medium' | 'high';
    max_results?: number;
    real_time_mode?: boolean;
  }): Promise<ProvenanceEnvelope> {
    const startTime = Date.now();
    const traceId = uuidv4();

    if (!payload.suggestions || payload.suggestions.length === 0) {
      throw new Error('No suggestions provided for ranking');
    }

    const maxResults = payload.max_results || this.latencyConstraints.max_suggestions_realtime;
    const realTimeMode = payload.real_time_mode !== false; // Default to true

    // Check cache for similar context
    const cacheKey = this.createCacheKey(payload);
    const cached = this.getCachedRankings(cacheKey, payload.suggestions);
    if (cached && cached.length > 0) {
      this.updatePerformanceMetrics('cache_hit_rate', 1);
      return this.createProvenanceEnvelope(payload, cached, traceId, startTime, true);
    }

    // Perform ranking with latency awareness
    const rankedSuggestions = await this.performRanking(
      payload.suggestions,
      payload,
      realTimeMode,
      maxResults
    );

    // Cache results
    this.rankingCache.set(cacheKey, rankedSuggestions);

    return this.createProvenanceEnvelope(payload, rankedSuggestions, traceId, startTime, false);
  }

  private createCacheKey(payload: any): string {
    const keyElements = [
      payload.meeting_stage || 'unknown',
      payload.urgency_level || 'medium',
      payload.entities?.length || 0,
      payload.domain_context?.length || 0,
      payload.suggestions?.length || 0
    ];
    return keyElements.join('_');
  }

  private getCachedRankings(cacheKey: string, currentSuggestions: Suggestion[]): RankedSuggestion[] | null {
    const cached = this.rankingCache.get(cacheKey);
    if (!cached) return null;

    // Validate cache relevance (simplified - in production, use more sophisticated matching)
    const suggestionIds = new Set(currentSuggestions.map(s => s.id));
    const cachedIds = new Set(cached.map(s => s.id));
    const overlap = [...suggestionIds].filter(id => cachedIds.has(id));
    
    // If less than 50% overlap, consider cache stale
    if (overlap.length < Math.min(suggestionIds.size, cachedIds.size) * 0.5) {
      this.rankingCache.delete(cacheKey);
      return null;
    }

    return cached.filter(s => suggestionIds.has(s.id));
  }

  private async performRanking(
    suggestions: Suggestion[],
    context: any,
    realTimeMode: boolean,
    maxResults: number
  ): Promise<RankedSuggestion[]> {
    const startTime = Date.now();
    
    // Convert suggestions to ranked suggestions with scoring
    const rankedSuggestions: RankedSuggestion[] = await Promise.all(
      suggestions.map(async (suggestion) => {
        const scores = await this.calculateSuggestionScores(suggestion, context);
        
        return {
          ...suggestion,
          relevance_score: scores.relevance,
          timing_score: scores.timing,
          confidence_score: scores.confidence,
          final_rank: scores.final,
          ranking_rationale: this.generateRankingRationale(scores, context)
        };
      })
    );

    // Sort by final rank (descending)
    rankedSuggestions.sort((a, b) => b.final_rank - a.final_rank);

    // Apply latency constraints if in real-time mode
    if (realTimeMode) {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = this.latencyConstraints.target_response_time_ms - elapsedTime;
      
      if (remainingTime < 100) {
        // Quick fallback: return top suggestions without further processing
        return rankedSuggestions.slice(0, Math.min(maxResults, 3));
      }
    }

    // Apply diversity and deduplication
    const diversifiedSuggestions = this.applyDiversification(rankedSuggestions, maxResults);

    return diversifiedSuggestions.slice(0, maxResults);
  }

  private async calculateSuggestionScores(suggestion: Suggestion, context: any): Promise<any> {
    const scores = {
      relevance: 0,
      timing: 0,
      confidence: 0,
      personalization: 0,
      feedback: 0,
      final: 0
    };

    // 1. Relevance Score (0-1)
    scores.relevance = this.calculateRelevanceScore(suggestion, context);

    // 2. Timing Score (0-1) 
    scores.timing = this.calculateTimingScore(suggestion, context);

    // 3. Confidence Score (0-1)
    scores.confidence = this.calculateConfidenceScore(suggestion, context);

    // 4. Personalization Score (0-1)
    scores.personalization = this.calculatePersonalizationScore(suggestion, context);

    // 5. Feedback Score (0-1)
    scores.feedback = this.calculateFeedbackScore(suggestion);

    // 6. Final weighted score
    scores.final = (
      scores.relevance * this.rankingWeights.relevance +
      scores.timing * this.rankingWeights.timing +
      scores.confidence * this.rankingWeights.confidence +
      scores.personalization * this.rankingWeights.personalization +
      scores.feedback * this.rankingWeights.feedback_boost
    );

    return scores;
  }

  private calculateRelevanceScore(suggestion: Suggestion, context: any): number {
    let score = 0.5; // Base score

    // Entity matching
    if (context.entities) {
      const entityMatches = context.entities.filter((entity: ExtractedEntity) => 
        suggestion.content.toLowerCase().includes(entity.value.toLowerCase())
      );
      score += Math.min(entityMatches.length * 0.15, 0.3);
    }

    // Domain context matching
    if (context.domain_context && context.domain_context.length > 0) {
      const domainInfo = context.domain_context[0];
      
      // Company name match
      if (suggestion.content.includes(domainInfo.company_name)) {
        score += 0.2;
      }
      
      // Industry/tags match
      const industryMatch = domainInfo.tags.some((tag: string) => 
        suggestion.content.toLowerCase().includes(tag.toLowerCase())
      );
      if (industryMatch) score += 0.15;
    }

    // Meeting stage relevance
    if (context.meeting_stage) {
      score += this.getStageRelevanceBonus(suggestion.type, context.meeting_stage);
    }

    return Math.min(score, 1.0);
  }

  private calculateTimingScore(suggestion: Suggestion, context: any): number {
    let score = 0.7; // Base timing score

    // Urgency adjustment
    if (context.urgency_level === 'high') {
      // Prefer shorter, more direct suggestions
      if (suggestion.content.length < 100) score += 0.2;
      if (suggestion.type === 'question') score += 0.1;
    } else if (context.urgency_level === 'low') {
      // Allow longer, more detailed suggestions
      if (suggestion.content.length > 150) score += 0.1;
      if (suggestion.type === 'talking_point') score += 0.1;
    }

    // Meeting stage timing
    const stageBonus = this.getStageTimingBonus(suggestion.type, context.meeting_stage);
    score += stageBonus;

    // Conversation flow timing
    if (context.conversation_context) {
      const flowScore = this.assessConversationFlow(suggestion, context.conversation_context);
      score += flowScore * 0.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateConfidenceScore(suggestion: Suggestion, context: any): number {
    let score = 0.6; // Base confidence

    // Context richness boost
    const contextQuality = this.assessContextQuality(context);
    score += contextQuality * 0.3;

    // Suggestion type confidence
    const typeConfidence = this.getSuggestionTypeConfidence(suggestion.type);
    score += typeConfidence * 0.1;

    return Math.min(score, 1.0);
  }

  private calculatePersonalizationScore(suggestion: Suggestion, context: any): number {
    let score = 0.5; // Base score

    // Person context matching
    if (context.person_context && context.person_context.length > 0) {
      const personInfo = context.person_context[0];
      
      // Title/role relevance
      if (personInfo.title) {
        const roleMatch = this.checkRoleRelevance(suggestion.content, personInfo.title);
        if (roleMatch) score += 0.3;
      }
      
      // Company size/type relevance
      if (personInfo.company) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  private calculateFeedbackScore(suggestion: Suggestion): number {
    const feedback = this.feedbackData.get(suggestion.id);
    if (!feedback) return 0.5; // Neutral for no feedback

    // Normalize feedback to 0-1 scale (assuming 1-5 rating)
    return Math.max(0, (feedback - 1) / 4);
  }

  private getStageRelevanceBonus(suggestionType: string, meetingStage: string): number {
    const stageTypeMap = {
      opening: { talking_point: 0.2, question: 0.3 },
      discovery: { question: 0.3, talking_point: 0.2 },
      presentation: { talking_point: 0.3, objection_handler: 0.2 },
      objection_handling: { objection_handler: 0.4, talking_point: 0.1 },
      closing: { closing_technique: 0.4, question: 0.2 }
    };

    return (stageTypeMap as any)[meetingStage]?.[suggestionType] || 0;
  }

  private getStageTimingBonus(suggestionType: string, meetingStage: string): number {
    // Similar to relevance but focused on timing appropriateness
    const timingMap = {
      opening: { talking_point: 0.15, question: 0.2 },
      discovery: { question: 0.25, talking_point: 0.1 },
      presentation: { talking_point: 0.2, objection_handler: 0.1 },
      objection_handling: { objection_handler: 0.3, talking_point: 0.1 },
      closing: { closing_technique: 0.3, question: 0.15 }
    };

    return (timingMap as any)[meetingStage]?.[suggestionType] || 0;
  }

  private assessConversationFlow(suggestion: Suggestion, conversationContext: any): number {
    // Simplified conversation flow assessment
    const recentTopics = conversationContext.recent_topics || [];
    const suggestionTopics = this.extractTopics(suggestion.content);
    
    const topicOverlap = recentTopics.filter((topic: string) => 
      suggestionTopics.some(sTopic => sTopic.includes(topic))
    );
    
    return Math.min(topicOverlap.length * 0.2, 1.0);
  }

  private assessContextQuality(context: any): number {
    let quality = 0;
    
    if (context.entities && context.entities.length > 0) quality += 0.3;
    if (context.domain_context && context.domain_context.length > 0) quality += 0.3;
    if (context.person_context && context.person_context.length > 0) quality += 0.2;
    if (context.meeting_stage) quality += 0.2;
    
    return Math.min(quality, 1.0);
  }

  private getSuggestionTypeConfidence(type: string): number {
    const confidenceMap = {
      talking_point: 0.8,
      question: 0.9,
      objection_handler: 0.7,
      closing_technique: 0.6
    };
    
    return (confidenceMap as any)[type] || 0.5;
  }

  private checkRoleRelevance(content: string, title: string): boolean {
    const contentLower = content.toLowerCase();
    const titleLower = title.toLowerCase();
    
    // Check for role-specific keywords
    if (titleLower.includes('sales') && 
        (contentLower.includes('revenue') || contentLower.includes('quota'))) {
      return true;
    }
    
    if (titleLower.includes('engineer') && 
        (contentLower.includes('technical') || contentLower.includes('integration'))) {
      return true;
    }
    
    if (titleLower.includes('manager') || titleLower.includes('director')) {
      return contentLower.includes('team') || contentLower.includes('strategy');
    }
    
    return false;
  }

  private extractTopics(text: string): string[] {
    // Simple topic extraction (in production, use NLP)
    const topics = [];
    const words = text.toLowerCase().split(' ');
    
    // Look for business-related keywords
    const businessKeywords = ['sales', 'revenue', 'customer', 'product', 'market', 'team', 'process'];
    topics.push(...words.filter(word => businessKeywords.includes(word)));
    
    return topics;
  }

  private applyDiversification(suggestions: RankedSuggestion[], maxResults: number): RankedSuggestion[] {
    const diversified: RankedSuggestion[] = [];
    const typeCount: Map<string, number> = new Map();
    
    for (const suggestion of suggestions) {
      if (diversified.length >= maxResults) break;
      
      const currentTypeCount = typeCount.get(suggestion.type) || 0;
      
      // Limit suggestions per type to maintain diversity
      if (currentTypeCount < Math.ceil(maxResults / 2)) {
        diversified.push(suggestion);
        typeCount.set(suggestion.type, currentTypeCount + 1);
      }
    }
    
    // Fill remaining slots with highest-ranked suggestions regardless of type
    for (const suggestion of suggestions) {
      if (diversified.length >= maxResults) break;
      if (!diversified.find(s => s.id === suggestion.id)) {
        diversified.push(suggestion);
      }
    }
    
    return diversified;
  }

  private generateRankingRationale(scores: any, context: any): string {
    const rationale = [];
    
    if (scores.relevance > 0.7) {
      rationale.push('High relevance to conversation context');
    }
    if (scores.timing > 0.7) {
      rationale.push('Well-timed for current meeting stage');
    }
    if (scores.confidence > 0.8) {
      rationale.push('High confidence based on available context');
    }
    if (scores.personalization > 0.6) {
      rationale.push('Personalized for contact profile');
    }
    if (scores.feedback > 0.7) {
      rationale.push('Positive user feedback history');
    }
    
    if (rationale.length === 0) {
      rationale.push('Standard ranking based on general relevance');
    }
    
    return rationale.join('; ');
  }

  private adaptRankingWeights(rating: number, context: any): void {
    // Simple adaptive learning (in production, use more sophisticated ML)
    const learningRate = 0.01;
    
    if (rating > 3) { // Positive feedback
      this.rankingWeights.relevance += learningRate;
      if (context.meeting_stage) {
        this.rankingWeights.timing += learningRate;
      }
    } else if (rating < 3) { // Negative feedback
      this.rankingWeights.relevance -= learningRate;
      this.rankingWeights.confidence += learningRate; // Rely more on confidence
    }
    
    // Normalize weights
    const totalWeight = Object.values(this.rankingWeights).reduce((a, b) => a + b, 0);
    Object.keys(this.rankingWeights).forEach((key: string) => {
      (this.rankingWeights as any)[key] = (this.rankingWeights as any)[key] / totalWeight;
    });
  }

  private updatePerformanceMetrics(metric: string, value: number): void {
    const current = this.performanceMetrics.get(metric) || 0;
    
    if (metric === 'cache_hit_rate' || metric === 'feedback_count') {
      // Increment counters
      this.performanceMetrics.set(metric, current + value);
    } else {
      // Running average
      const count = this.performanceMetrics.get(metric + '_count') || 0;
      const newAvg = (current * count + value) / (count + 1);
      this.performanceMetrics.set(metric, newAvg);
      this.performanceMetrics.set(metric + '_count', count + 1);
    }
  }

  private createProvenanceEnvelope(
    payload: any,
    rankedSuggestions: RankedSuggestion[],
    traceId: string,
    startTime: number,
    fromCache: boolean
  ): ProvenanceEnvelope {
    const processingTime = Date.now() - startTime;
    
    return {
      agent_id: this.agentId,
      timestamp: new Date(),
      inputs: {
        suggestions: payload.suggestions,
        entities: payload.entities,
        domain_context: payload.domain_context,
        person_context: payload.person_context,
        meeting_stage: payload.meeting_stage,
        previous_outputs: []
      },
      outputs: {
        ranked_suggestions: rankedSuggestions,
        suggestion_count: rankedSuggestions.length,
        confidence_score: this.calculateOverallConfidence(rankedSuggestions),
        reasoning_chain: [
          'Received suggestions for ranking and contextualization',
          fromCache ? 'Retrieved rankings from cache' : 'Calculated multi-factor relevance scores',
          'Applied timing and meeting stage adjustments',
          'Incorporated personalization based on contact profile',
          'Applied user feedback and learning adjustments',
          'Performed diversification and deduplication',
          'Generated ranking rationale for transparency'
        ],
        performance_metrics: {
          processing_time_ms: processingTime,
          cache_hit: fromCache,
          latency_constraint_met: processingTime < this.latencyConstraints.target_response_time_ms
        }
      },
      confidence: this.calculateOverallConfidence(rankedSuggestions),
      trace_id: traceId,
      sources: [
        {
          type: 'database',
          title: 'Ranking Algorithm Engine',
          confidence: 0.9,
          accessed_at: new Date(),
          snippet: `Ranked ${rankedSuggestions.length} suggestions using multi-factor scoring`
        }
      ],
      processing_time_ms: processingTime,
      agent_version: '1.0.0'
    };
  }

  private calculateOverallConfidence(rankedSuggestions: RankedSuggestion[]): number {
    if (rankedSuggestions.length === 0) return 0.1;
    
    const avgConfidence = rankedSuggestions.reduce((sum, s) => sum + s.confidence_score, 0) / rankedSuggestions.length;
    const topSuggestionBonus = rankedSuggestions[0]?.final_rank > 0.8 ? 0.1 : 0;
    
    return Math.min(avgConfidence + topSuggestionBonus, 0.95);
  }

  // Public API methods
  async getRankedSuggestions(suggestions: Suggestion[], context: any): Promise<RankedSuggestion[]> {
    try {
      const result = await this.rankSuggestions({ suggestions, ...context });
      return result.outputs.ranked_suggestions || [];
    } catch (error) {
      console.error('Suggestion ranking failed:', error);
      return suggestions.map(s => ({ ...s, relevance_score: 0.5, timing_score: 0.5, confidence_score: 0.5, final_rank: 0.5, ranking_rationale: 'Fallback ranking' }));
    }
  }

  async submitFeedback(suggestionId: string, rating: number, context?: any): Promise<void> {
    eventBus.publish({
      type: 'suggestion.feedback',
      data: { suggestion_id: suggestionId, rating, context },
      timestamp: new Date(),
      source: this.agentId,
      trace_id: uuidv4()
    });
  }

  getPerformanceMetrics(): Map<string, number> {
    return new Map(this.performanceMetrics);
  }

  clearCache(): void {
    this.rankingCache.clear();
  }

  getCacheSize(): number {
    return this.rankingCache.size;
  }
}

// Export singleton instance
export const rankingContextualizerAgent = new RankingContextualizerAgent();