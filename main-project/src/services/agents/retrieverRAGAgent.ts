import { v4 as uuidv4 } from 'uuid';
import { ExtractedEntity, DomainIntelligence, SourceReference, ProvenanceEnvelope } from '../../types';
import { eventBus } from '../eventBus';

/**
 * Retriever/RAG Agent - Vector database and web summaries fetching
 * 
 * Capabilities:
 * - Vector similarity search for relevant context
 * - Web content summarization and retrieval
 * - Knowledge base querying with semantic search
 * - Document chunk retrieval with ranking
 * - Multi-source information aggregation
 */
export class RetrieverRAGAgent {
  private readonly agentId = 'retriever-rag';
  private vectorCache: Map<string, any[]> = new Map();
  private summaryCache: Map<string, string> = new Map();
  private readonly cacheTimeout = 60 * 60 * 1000; // 1 hour

  // Simulated vector database collections
  private knowledgeBase = {
    sales_methodology: [
      {
        id: 'sales-001',
        content: 'BANT qualification framework: Budget, Authority, Need, Timeline for enterprise sales',
        embedding: this.generateRandomEmbedding(),
        metadata: { type: 'methodology', confidence: 0.9 }
      },
      {
        id: 'sales-002', 
        content: 'SPIN Selling technique: Situation, Problem, Implication, Need-Payoff questions',
        embedding: this.generateRandomEmbedding(),
        metadata: { type: 'methodology', confidence: 0.85 }
      },
      {
        id: 'sales-003',
        content: 'Challenger Sale approach: Teaching, Tailoring, Taking Control methodology',
        embedding: this.generateRandomEmbedding(),
        metadata: { type: 'methodology', confidence: 0.8 }
      }
    ],
    product_information: [
      {
        id: 'product-001',
        content: 'CRM integration capabilities with Salesforce, HubSpot, and Pipedrive',
        embedding: this.generateRandomEmbedding(),
        metadata: { type: 'feature', confidence: 0.95 }
      },
      {
        id: 'product-002',
        content: 'AI-powered lead scoring and predictive analytics for sales forecasting',
        embedding: this.generateRandomEmbedding(),
        metadata: { type: 'feature', confidence: 0.9 }
      },
      {
        id: 'product-003',
        content: 'Real-time conversation intelligence and call analysis features',
        embedding: this.generateRandomEmbedding(),
        metadata: { type: 'feature', confidence: 0.88 }
      }
    ],
    company_knowledge: [
      {
        id: 'company-001',
        content: 'Company founded in 2020, specializing in AI-powered sales intelligence solutions',
        embedding: this.generateRandomEmbedding(),
        metadata: { type: 'background', confidence: 0.95 }
      },
      {
        id: 'company-002',
        content: 'Serving 500+ enterprise customers across North America and Europe',
        embedding: this.generateRandomEmbedding(),
        metadata: { type: 'metrics', confidence: 0.9 }
      }
    ]
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
      const result = await this.retrieveRelevantContext(task.payload);
      
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

  async retrieveRelevantContext(payload: {
    query?: string;
    entities?: ExtractedEntity[];
    domain_context?: DomainIntelligence[];
    context_type?: 'sales' | 'product' | 'company' | 'general';
    max_results?: number;
  }): Promise<ProvenanceEnvelope> {
    const startTime = Date.now();
    const traceId = uuidv4();

    const query = payload.query || this.buildQueryFromEntities(payload.entities || []);
    const contextType = payload.context_type || 'general';
    const maxResults = payload.max_results || 5;

    if (!query) {
      throw new Error('No query provided for retrieval');
    }

    // Check cache first
    const cacheKey = `${query}_${contextType}_${maxResults}`;
    const cached = this.getCachedResults(cacheKey);
    if (cached) {
      return this.createProvenanceEnvelope(query, cached, traceId, startTime, true);
    }

    // Perform retrieval operations
    const retrievalResults = await this.performMultiSourceRetrieval(query, contextType, maxResults);
    
    // Cache the results
    this.vectorCache.set(cacheKey, retrievalResults.documents);
    
    return this.createProvenanceEnvelope(query, retrievalResults, traceId, startTime, false);
  }

  private buildQueryFromEntities(entities: ExtractedEntity[]): string {
    // Extract key terms from entities to build search query
    const terms = entities.map(entity => entity.value).join(' ');
    const types = [...new Set(entities.map(entity => entity.type))];
    
    if (types.includes('company')) {
      return `${terms} company information business intelligence`;
    }
    if (types.includes('product')) {
      return `${terms} product features capabilities integration`;
    }
    if (types.includes('competitor')) {
      return `${terms} competitive analysis market position differentiation`;
    }
    
    return terms;
  }

  private getCachedResults(cacheKey: string): any[] | null {
    const cached = this.vectorCache.get(cacheKey);
    if (!cached) return null;

    // Simple cache validation (in real implementation, check timestamps)
    return cached;
  }

  private async performMultiSourceRetrieval(query: string, contextType: string, maxResults: number): Promise<any> {
    const results: {
      documents: any[];
      sources: any[];
      processing_steps: string[];
    } = {
      documents: [],
      sources: [],
      processing_steps: []
    };

    // Step 1: Vector similarity search
    results.processing_steps.push('Performing vector similarity search');
    const vectorResults = await this.vectorSimilaritySearch(query, contextType, maxResults);
    results.documents.push(...vectorResults.documents);
    results.sources.push(...vectorResults.sources);

    // Step 2: Web content retrieval (simulated)
    results.processing_steps.push('Retrieving relevant web content');
    const webResults = await this.webContentRetrieval(query, Math.min(3, maxResults));
    results.documents.push(...webResults.documents);
    results.sources.push(...webResults.sources);

    // Step 3: Knowledge base lookup
    results.processing_steps.push('Querying internal knowledge base');
    const kbResults = await this.knowledgeBaseLookup(query, contextType);
    results.documents.push(...kbResults.documents);
    results.sources.push(...kbResults.sources);

    // Step 4: Rank and filter results
    results.processing_steps.push('Ranking and filtering results by relevance');
    results.documents = this.rankAndFilterResults(results.documents, query, maxResults);

    return results;
  }

  private async vectorSimilaritySearch(query: string, contextType: string, maxResults: number): Promise<{
    documents: any[];
    sources: any[];
  }> {
    // Simulate vector embedding generation for query
    await this.simulateAPIDelay(200, 500);
    
    const queryEmbedding = this.generateRandomEmbedding();
    const results: {
      documents: any[];
      sources: any[];
    } = {
      documents: [] as any[],
      sources: [] as any[]
    };

    // Search appropriate collections based on context type
    const collections = this.getRelevantCollections(contextType);
    
    for (const [collectionName, documents] of Object.entries(collections)) {
      for (const doc of documents as any[]) {
        const similarity = this.calculateCosineSimilarity(queryEmbedding, doc.embedding);
        
        if (similarity > 0.6) { // Threshold for relevance
          (results.documents as any[]).push({
            ...doc,
            similarity_score: similarity,
            collection: collectionName
          });
        }
      }
    }

    // Sort by similarity and limit results
    results.documents.sort((a: any, b: any) => (b.similarity_score || 0) - (a.similarity_score || 0));
    results.documents = results.documents.slice(0, maxResults);

    // Add source references
    results.sources.push({
      type: 'database',
      title: 'Vector Knowledge Base',
      confidence: 0.9,
      accessed_at: new Date(),
      snippet: `Found ${results.documents.length} relevant documents`
    });

    return results;
  }

  private async webContentRetrieval(query: string, maxResults: number): Promise<{
    documents: any[];
    sources: any[];
  }> {
    // Simulate web search and summarization
    await this.simulateAPIDelay(800, 1500);
    
    const results: {
      documents: any[];
      sources: any[];
    } = {
      documents: [] as any[],
      sources: [] as any[]
    };

    // Simulate search results
    const mockWebResults = [
      {
        url: 'https://salesforce.com/products/sales-cloud',
        title: 'Salesforce Sales Cloud Features',
        summary: 'Comprehensive CRM platform with AI-powered insights, lead management, and sales automation',
        relevance_score: 0.8
      },
      {
        url: 'https://hubspot.com/products/sales',
        title: 'HubSpot Sales Hub',
        summary: 'Sales software with email tracking, meeting scheduling, and pipeline management',
        relevance_score: 0.75
      },
      {
        url: 'https://blog.salesinsights.com/best-practices',
        title: 'Sales Best Practices 2024',
        summary: 'Latest trends in sales methodology, digital selling, and customer engagement strategies',
        relevance_score: 0.7
      }
    ];

    // Filter and format results
    const relevantResults = mockWebResults
      .filter(result => result.relevance_score > 0.6)
      .slice(0, maxResults);

    for (const result of relevantResults) {
      results.documents.push({
        id: `web-${uuidv4()}`,
        content: result.summary,
        metadata: {
          type: 'web_summary',
          url: result.url,
          title: result.title,
          confidence: result.relevance_score
        }
      });

      results.sources.push({
        type: 'web',
        url: result.url,
        title: result.title,
        confidence: result.relevance_score,
        accessed_at: new Date(),
        snippet: result.summary.substring(0, 100) + '...'
      });
    }

    return results;
  }

  private async knowledgeBaseLookup(query: string, contextType: string): Promise<{
    documents: any[];
    sources: any[];
  }> {
    // Simulate knowledge base search
    await this.simulateAPIDelay(300, 600);
    
    const results: {
      documents: any[];
      sources: any[];
    } = {
      documents: [] as any[],
      sources: [] as any[]
    };

    // Get relevant knowledge base sections
    const collections = this.getRelevantCollections(contextType);
    const queryLower = query.toLowerCase();

    for (const [collectionName, documents] of Object.entries(collections)) {
      for (const doc of documents as any[]) {
        // Simple keyword matching (in real implementation, use semantic search)
        if (this.containsRelevantKeywords(doc.content.toLowerCase(), queryLower)) {
          results.documents.push({
            ...doc,
            collection: collectionName,
            match_type: 'keyword'
          });
        }
      }
    }

    results.sources.push({
      type: 'database',
      title: 'Internal Knowledge Base',
      confidence: 0.85,
      accessed_at: new Date(),
      snippet: `Searched ${Object.keys(collections).length} knowledge collections`
    });

    return results;
  }

  private getRelevantCollections(contextType: string): { [key: string]: any[] } {
    switch (contextType) {
      case 'sales':
        return { sales_methodology: this.knowledgeBase.sales_methodology };
      case 'product':
        return { product_information: this.knowledgeBase.product_information };
      case 'company':
        return { company_knowledge: this.knowledgeBase.company_knowledge };
      default:
        return this.knowledgeBase;
    }
  }

  private containsRelevantKeywords(content: string, query: string): boolean {
    const queryWords = query.split(' ').filter(word => word.length > 2);
    const matchingWords = queryWords.filter(word => content.includes(word));
    return matchingWords.length > 0;
  }

  private rankAndFilterResults(documents: any[], query: string, maxResults: number): any[] {
    // Enhanced ranking considering multiple factors
    const rankedDocs = documents.map(doc => ({
      ...doc,
      final_score: this.calculateFinalScore(doc, query)
    }));

    // Sort by final score and return top results
    rankedDocs.sort((a, b) => b.final_score - a.final_score);
    return rankedDocs.slice(0, maxResults);
  }

  private calculateFinalScore(doc: any, query: string): number {
    let score = 0;

    // Base confidence/similarity score
    score += (doc.similarity_score || doc.metadata?.confidence || 0.5) * 0.6;

    // Content type bonus
    if (doc.metadata?.type === 'methodology') score += 0.2;
    if (doc.metadata?.type === 'feature') score += 0.15;
    if (doc.collection === 'sales_methodology') score += 0.1;

    // Recency bonus (for web content)
    if (doc.metadata?.url) score += 0.1;

    // Content length penalty for very short content
    if (doc.content && doc.content.length < 50) score -= 0.1;

    return Math.min(score, 1.0);
  }

  private generateRandomEmbedding(dimensions: number = 384): number[] {
    // Generate random normalized embedding vector
    const embedding = Array.from({ length: dimensions }, () => Math.random() - 0.5);
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    
    // Add some randomness to simulate real-world variations
    return Math.min(Math.max(similarity + (Math.random() - 0.5) * 0.2, 0), 1);
  }

  private async simulateAPIDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private createProvenanceEnvelope(
    query: string,
    retrievalResults: any,
    traceId: string,
    startTime: number,
    fromCache: boolean
  ): ProvenanceEnvelope {
    return {
      agent_id: this.agentId,
      timestamp: new Date(),
      inputs: {
        query,
        previous_outputs: []
      },
      outputs: {
        retrieved_documents: retrievalResults.documents || [],
        document_count: retrievalResults.documents?.length || 0,
        confidence_score: this.calculateOverallConfidence(retrievalResults.documents || []),
        reasoning_chain: [
          'Query preprocessing and normalization',
          fromCache ? 'Retrieved from cache' : 'Multi-source retrieval executed',
          ...(retrievalResults.processing_steps || []),
          'Results ranked by relevance and confidence',
          'Provenance tracking completed'
        ]
      },
      confidence: this.calculateOverallConfidence(retrievalResults.documents || []),
      trace_id: traceId,
      sources: retrievalResults.sources || [],
      processing_time_ms: Date.now() - startTime,
      agent_version: '1.0.0'
    };
  }

  private calculateOverallConfidence(documents: any[]): number {
    if (documents.length === 0) return 0.1;
    
    const scores = documents.map(doc => 
      doc.final_score || doc.similarity_score || doc.metadata?.confidence || 0.5
    );
    
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Bonus for multiple high-quality results
    const qualityBonus = documents.filter(doc => 
      (doc.final_score || doc.similarity_score || 0) > 0.7
    ).length * 0.05;
    
    return Math.min(avgScore + qualityBonus, 0.95);
  }

  // Public API methods
  async searchDocuments(query: string, maxResults: number = 5): Promise<any[]> {
    try {
      const result = await this.retrieveRelevantContext({ query, max_results: maxResults });
      return result.outputs.retrieved_documents || [];
    } catch (error) {
      console.error('Document search failed:', error);
      return [];
    }
  }

  async getContextForEntities(entities: ExtractedEntity[]): Promise<any[]> {
    try {
      const result = await this.retrieveRelevantContext({ entities });
      return result.outputs.retrieved_documents || [];
    } catch (error) {
      console.error('Entity context retrieval failed:', error);
      return [];
    }
  }

  clearCache(): void {
    this.vectorCache.clear();
    this.summaryCache.clear();
  }

  getCacheSize(): number {
    return this.vectorCache.size + this.summaryCache.size;
  }

  // Add documents to knowledge base (for demo purposes)
  addToKnowledgeBase(collection: string, document: any): void {
    if (!(this.knowledgeBase as any)[collection]) {
      (this.knowledgeBase as any)[collection] = [];
    }
    
    (this.knowledgeBase as any)[collection].push({
      ...document,
      id: document.id || uuidv4(),
      embedding: document.embedding || this.generateRandomEmbedding()
    });
  }
}

// Export singleton instance
export const retrieverRAGAgent = new RetrieverRAGAgent();