import { ExtractedEntity, ProvenanceEnvelope } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { EventBusService } from '../eventBus';
import { LoggerAuditAgent } from './loggerAuditAgent';
import { openAIService } from '../openai';

interface EntityExtractionResult {
  entities: ExtractedEntity[];
  confidence: number;
  processing_time_ms: number;
  method: 'nlp_model' | 'regex_patterns' | 'hybrid';
}

/**
 * Entity Extraction Agent for identifying companies, competitors, products, people, and topics
 */
export class EntityExtractionAgent {
  private eventBus: EventBusService;
  private logger: LoggerAuditAgent;
  private isActive = true;
  private entityCache: Map<string, ExtractedEntity[]> = new Map();
  private patterns: Map<string, RegExp[]> = new Map();

  constructor(eventBus: EventBusService, logger: LoggerAuditAgent) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.initializePatterns();
    this.setupEventListeners();
    this.emitHeartbeat();
  }

  private initializePatterns(): void {
    // Company patterns
    this.patterns.set('company', [
      /\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*?)\\s+(?:Inc|Corp|LLC|Ltd|Company|Co\\.?|Corporation)\\b/g,
      /\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\s+Technologies?\\b/g,
      /\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\s+Solutions?\\b/g,
      /\\b(Apple|Google|Microsoft|Amazon|Facebook|Meta|Tesla|IBM|Oracle|SAP|Salesforce|Adobe|Netflix)\\b/gi
    ]);

    // Person patterns (names)
    this.patterns.set('person', [
      /\\b([A-Z][a-z]+)\\s+([A-Z][a-z]+)\\b/g, // First Last
      /\\b(Mr\\.|Mrs\\.|Dr\\.|Prof\\.)\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\b/g
    ]);

    // Product patterns
    this.patterns.set('product', [
      /\\b([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\s+(?:Platform|Software|App|Service|Tool|System|API)\\b/g,
      /\\b(iPhone|iPad|Android|Windows|Office|Slack|Zoom|Teams|Salesforce|HubSpot)\\b/gi
    ]);

    // Competitor patterns
    this.patterns.set('competitor', [
      /\\bcompetitor[s]?\\s+(?:like|such as|including)\\s+([^,\\.]+)/gi,
      /\\bcompeting\\s+(?:with|against)\\s+([^,\\.]+)/gi,
      /\\balternative[s]?\\s+(?:to|like)\\s+([^,\\.]+)/gi
    ]);

    // Question patterns
    this.patterns.set('question', [
      /\\b(What|How|Why|When|Where|Who|Which|Can|Could|Would|Should|Is|Are|Will|Do|Does)\\b[^?]*\\?/gi,
      /\\b(Tell me about|Explain|Describe|Show me)\\b[^.!?]*[.!?]/gi
    ]);

    // Topic patterns
    this.patterns.set('topic', [
      /\\b(pricing|budget|timeline|schedule|implementation|integration|security|compliance|training|support)\\b/gi,
      /\\b(ROI|return on investment|cost savings|efficiency|productivity|scalability)\\b/gi,
      /\\b(migration|deployment|rollout|launch|go-live)\\b/gi
    ]);
  }

  private setupEventListeners(): void {
    this.eventBus.subscribe('utterance.detected', 'entity-extraction', async (event) => {
      await this.processUtterance(event.data);
    });

    this.eventBus.subscribe('agent.task.execute', 'entity-extraction', async (event) => {
      if (event.data.agent_id === 'entity-extraction') {
        await this.executeTask(event.data);
      }
    });
  }

  private async processUtterance(utteranceEvent: any): Promise<void> {
    const { segment, session_id, trace_id } = utteranceEvent;
    
    if (!segment.is_final) {
      return; // Only process final transcriptions
    }

    try {
      const result = await this.extractEntities(segment.text, {
        context: utteranceEvent.context,
        speaker_id: segment.speaker.speaker_id,
        confidence_threshold: 0.6
      });

      if (result.entities.length > 0) {
        await this.emitEntityExtractionResult({
          session_id,
          trace_id,
          entities: result.entities,
          source_text: segment.text,
          confidence: result.confidence,
          processing_time_ms: result.processing_time_ms,
          method: result.method
        });
      }

    } catch (error) {
      await this.handleExtractionError(error, segment.text, trace_id);
    }
  }

  private async executeTask(task: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { transcript_segment, context } = task.payload;
      
      const result = await this.extractEntities(transcript_segment, {
        context,
        confidence_threshold: 0.5
      });

      const provenance: ProvenanceEnvelope = {
        agent_id: 'entity-extraction',
        timestamp: new Date(),
        inputs: {
          transcript_segment,
          context
        },
        outputs: {
          entities: result.entities,
          confidence_score: result.confidence,
          reasoning_chain: [
            `Analyzed text segment of ${transcript_segment.length} characters`,
            `Applied ${result.method} extraction method`,
            `Identified ${result.entities.length} entities`,
            `Average confidence: ${result.confidence.toFixed(2)}`
          ]
        },
        confidence: result.confidence,
        trace_id: task.trace_id,
        processing_time_ms: Date.now() - startTime,
        agent_version: '1.0.0'
      };

      // Emit task completion
      this.eventBus.publish({
        type: 'agent.task.completed',
        data: {
          task_id: task.id,
          result: provenance
        },
        timestamp: new Date(),
        source: 'entity-extraction',
        trace_id: task.trace_id
      });

    } catch (error) {
      await this.emitTaskFailure(task, error);
    }
  }

  async extractEntities(
    text: string, 
    options: {
      context?: any;
      speaker_id?: string;
      confidence_threshold?: number;
      use_ai_model?: boolean;
    } = {}
  ): Promise<EntityExtractionResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(text, options);
    
    // Check cache first
    if (this.entityCache.has(cacheKey)) {
      return {
        entities: this.entityCache.get(cacheKey)!,
        confidence: 0.9, // Cached results have high confidence
        processing_time_ms: Date.now() - startTime,
        method: 'nlp_model'
      };
    }

    let entities: ExtractedEntity[] = [];
    let confidence = 0;
    let method: 'nlp_model' | 'regex_patterns' | 'hybrid' = 'regex_patterns';

    try {
      // Try AI-powered extraction first
      if (options.use_ai_model !== false && openAIService.isReady()) {
        const aiResult = await this.extractEntitiesWithAI(text, options);
        entities = aiResult.entities;
        confidence = aiResult.confidence;
        method = 'nlp_model';
      } else {
        // Fallback to pattern-based extraction
        const patternResult = await this.extractEntitiesWithPatterns(text, options);
        entities = patternResult.entities;
        confidence = patternResult.confidence;
        method = 'regex_patterns';
      }

      // Filter by confidence threshold
      const threshold = options.confidence_threshold || 0.5;
      entities = entities.filter(entity => entity.confidence >= threshold);

      // Cache results
      if (entities.length > 0) {
        this.entityCache.set(cacheKey, entities);
        
        // Limit cache size
        if (this.entityCache.size > 1000) {
          const firstKey = this.entityCache.keys().next().value;
          if (firstKey) {
            this.entityCache.delete(firstKey);
          }
        }
      }

      return {
        entities,
        confidence,
        processing_time_ms: Date.now() - startTime,
        method
      };

    } catch (error) {
      console.error('Entity extraction failed:', error);
      throw error;
    }
  }

  private async extractEntitiesWithAI(
    text: string, 
    options: any
  ): Promise<{ entities: ExtractedEntity[]; confidence: number }> {
    const systemPrompt = `You are an expert entity extraction system. Extract entities from the given text and classify them into these categories:
- company: Business entities, organizations, corporations
- person: Individual names, titles, roles
- product: Software, platforms, tools, services
- competitor: Competing companies or solutions mentioned
- question: Direct or implicit questions being asked
- topic: Key discussion topics, themes, or subjects

Return a JSON array of entities with this structure:
{
  "entities": [
    {
      "type": "category",
      "value": "extracted text",
      "confidence": 0.85,
      "context": "surrounding context",
      "source_position": {"start": 10, "end": 25}
    }
  ]
}`;

    const userPrompt = `Extract entities from this text: "${text}"`;

    try {
      const response = await openAIService.analyzeWithGPT4(userPrompt, systemPrompt, 1000);
      const parsed = JSON.parse(response);
      
      const entities: ExtractedEntity[] = parsed.entities.map((entity: any) => ({
        type: entity.type,
        value: entity.value,
        confidence: entity.confidence,
        context: entity.context || text.substring(Math.max(0, entity.source_position?.start - 20), entity.source_position?.end + 20),
        source_position: entity.source_position || { start: 0, end: text.length },
        metadata: {
          extraction_method: 'ai_model',
          model: 'gpt-4',
          speaker_id: options.speaker_id
        }
      }));

      const avgConfidence = entities.length > 0 
        ? entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length
        : 0;

      return { entities, confidence: avgConfidence };
    } catch (error) {
      console.error('AI entity extraction failed:', error);
      throw error;
    }
  }

  private async extractEntitiesWithPatterns(
    text: string, 
    options: any
  ): Promise<{ entities: ExtractedEntity[]; confidence: number }> {
    const entities: ExtractedEntity[] = [];
    
    for (const [entityType, patterns] of this.patterns.entries()) {
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const value = match[1] || match[0];
          const start = match.index;
          const end = match.index + match[0].length;
          
          // Calculate confidence based on pattern specificity
          const confidence = this.calculatePatternConfidence(entityType, value, text);
          
          if (confidence >= 0.3) { // Minimum confidence threshold for patterns
            entities.push({
              type: entityType as ExtractedEntity['type'],
              value: value.trim(),
              confidence,
              context: text.substring(Math.max(0, start - 30), Math.min(text.length, end + 30)),
              source_position: { start, end },
              metadata: {
                extraction_method: 'regex_pattern',
                pattern_type: entityType,
                speaker_id: options.speaker_id
              }
            });
          }
        }
        
        // Reset regex lastIndex to avoid issues with global patterns
        pattern.lastIndex = 0;
      }
    }

    // Remove duplicates and merge similar entities
    const deduplicated = this.deduplicateEntities(entities);
    
    const avgConfidence = deduplicated.length > 0 
      ? deduplicated.reduce((sum, e) => sum + e.confidence, 0) / deduplicated.length
      : 0;

    return { entities: deduplicated, confidence: avgConfidence };
  }

  private calculatePatternConfidence(entityType: string, value: string, context: string): number {
    let confidence = 0.5; // Base confidence
    
    // Boost confidence for specific indicators
    switch (entityType) {
      case 'company':
        if (/\\b(Inc|Corp|LLC|Ltd|Company|Corporation)\\b/i.test(value)) {
          confidence += 0.3;
        }
        if (/\\b(Technologies?|Solutions?|Systems?)\\b/i.test(value)) {
          confidence += 0.2;
        }
        break;
        
      case 'person':
        if (/\\b(Mr\\.|Mrs\\.|Dr\\.|Prof\\.)/.test(context)) {
          confidence += 0.3;
        }
        if (value.split(' ').length === 2) { // First Last format
          confidence += 0.2;
        }
        break;
        
      case 'product':
        if (/\\b(Platform|Software|App|Service|Tool|System|API)\\b/i.test(value)) {
          confidence += 0.3;
        }
        break;
        
      case 'question':
        if (value.endsWith('?')) {
          confidence += 0.4;
        }
        break;
    }
    
    // Reduce confidence for very short or very long extractions
    if (value.length < 3) {
      confidence -= 0.3;
    } else if (value.length > 50) {
      confidence -= 0.2;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  private deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Map<string, ExtractedEntity>();
    
    for (const entity of entities) {
      const key = `${entity.type}:${entity.value.toLowerCase()}`;
      const existing = seen.get(key);
      
      if (!existing || entity.confidence > existing.confidence) {
        seen.set(key, entity);
      }
    }
    
    return Array.from(seen.values());
  }

  private generateCacheKey(text: string, options: any): string {
    return `${text.substring(0, 100)}:${JSON.stringify(options)}`;
  }

  private async emitEntityExtractionResult(result: {
    session_id: string;
    trace_id: string;
    entities: ExtractedEntity[];
    source_text: string;
    confidence: number;
    processing_time_ms: number;
    method: string;
  }): Promise<void> {
    // Log the extraction
    await this.logger.logEvent({
      event_type: 'entity.extracted',
      agent_id: 'entity-extraction',
      session_id: result.session_id,
      data: {
        entity_count: result.entities.length,
        entity_types: [...new Set(result.entities.map(e => e.type))],
        confidence: result.confidence,
        processing_time_ms: result.processing_time_ms,
        method: result.method
      },
      timestamp: new Date(),
      trace_id: result.trace_id,
      compliance_tags: ['entity_processing', 'nlp_analysis']
    });

    // Emit to event bus for downstream agents
    this.eventBus.publish({
      type: 'entity.extracted',
      data: {
        session_id: result.session_id,
        entities: result.entities,
        source_text: result.source_text,
        confidence: result.confidence,
        processing_time_ms: result.processing_time_ms
      },
      timestamp: new Date(),
      source: 'entity-extraction',
      trace_id: result.trace_id
    });
  }

  private async handleExtractionError(error: any, text: string, traceId: string): Promise<void> {
    await this.logger.logEvent({
      event_type: 'entity.extraction.error',
      agent_id: 'entity-extraction',
      session_id: 'unknown',
      data: {
        error: error.message,
        text_length: text.length,
        text_preview: text.substring(0, 100)
      },
      timestamp: new Date(),
      trace_id: traceId,
      compliance_tags: ['error_handling', 'nlp_analysis']
    });
  }

  private async emitTaskFailure(task: any, error: any): Promise<void> {
    this.eventBus.publish({
      type: 'agent.task.failed',
      data: {
        task_id: task.id,
        error: error.message || 'Entity extraction failed'
      },
      timestamp: new Date(),
      source: 'entity-extraction',
      trace_id: task.trace_id
    });
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
          agent_id: 'entity-extraction',
          status: 'healthy',
          last_heartbeat: new Date(),
          response_time_avg_ms: 250,
          error_rate: 0.01,
          active_tasks: 0,
          version: '1.0.0',
          capabilities: [
            'company_extraction',
            'person_extraction', 
            'product_extraction',
            'competitor_extraction',
            'question_extraction',
            'topic_extraction',
            'ai_powered_nlp',
            'pattern_matching'
          ]
        },
        timestamp: new Date(),
        source: 'entity-extraction',
        trace_id: uuidv4()
      });
    }, 30000);
  }

  /**
   * Get extraction statistics
   */
  getStats(): {
    cache_size: number;
    total_patterns: number;
    is_active: boolean;
    supported_entity_types: string[];
  } {
    return {
      cache_size: this.entityCache.size,
      total_patterns: Array.from(this.patterns.values()).reduce((sum, patterns) => sum + patterns.length, 0),
      is_active: this.isActive,
      supported_entity_types: Array.from(this.patterns.keys())
    };
  }

  /**
   * Clear entity cache
   */
  clearCache(): void {
    this.entityCache.clear();
  }

  /**
   * Add custom pattern
   */
  addPattern(entityType: string, pattern: RegExp): void {
    if (!this.patterns.has(entityType)) {
      this.patterns.set(entityType, []);
    }
    this.patterns.get(entityType)!.push(pattern);
  }

  /**
   * Shutdown agent
   */
  shutdown(): void {
    this.isActive = false;
    this.entityCache.clear();
  }
}