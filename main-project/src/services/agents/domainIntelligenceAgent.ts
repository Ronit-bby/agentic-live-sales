import { DomainIntelligence, NewsItem, SourceReference, ExtractedEntity, ProvenanceEnvelope } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { EventBusService } from '../eventBus';
import { LoggerAuditAgent } from './loggerAuditAgent';

interface CompanyProfile {
  name: string;
  overview: string;
  industry: string;
  employee_size: string;
  headquarters: string;
  founded: string;
  website: string;
  tags: string[];
  funding_info?: {
    total_funding: string;
    last_round: string;
    investors: string[];
  };
  key_personnel?: {
    ceo: string;
    founders: string[];
  };
}

/**
 * Domain Intelligence Agent for fetching company overview, news, and market intelligence
 */
export class DomainIntelligenceAgent {
  private eventBus: EventBusService;
  private logger: LoggerAuditAgent;
  private isActive = true;
  private companyCache: Map<string, DomainIntelligence> = new Map();
  private apiKeys: {
    clearbit?: string;
    crunchbase?: string;
    newsapi?: string;
    apollo?: string;
  } = {};
  private rateLimiter: Map<string, number> = new Map();
  private fallbackData: Map<string, CompanyProfile> = new Map();

  constructor(eventBus: EventBusService, logger: LoggerAuditAgent) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.initializeFallbackData();
    this.setupEventListeners();
    this.emitHeartbeat();
  }

  private initializeFallbackData(): void {
    // Pre-populate with common companies for demo purposes
    const commonCompanies: CompanyProfile[] = [
      {
        name: 'Salesforce',
        overview: 'Global leader in customer relationship management (CRM) software and cloud computing solutions.',
        industry: 'Software & Technology',
        employee_size: '50,000+',
        headquarters: 'San Francisco, CA',
        founded: '1999',
        website: 'salesforce.com',
        tags: ['CRM', 'Cloud Computing', 'SaaS', 'Enterprise Software', 'AI'],
        funding_info: {
          total_funding: 'Public Company',
          last_round: 'IPO',
          investors: ['Public Markets']
        },
        key_personnel: {
          ceo: 'Marc Benioff',
          founders: ['Marc Benioff', 'Parker Harris', 'Dave Moellenhoff', 'Frank Dominguez']
        }
      },
      {
        name: 'HubSpot',
        overview: 'Inbound marketing, sales, and customer service software platform for growing businesses.',
        industry: 'Marketing Technology',
        employee_size: '5,000+',
        headquarters: 'Cambridge, MA',
        founded: '2006',
        website: 'hubspot.com',
        tags: ['Marketing Automation', 'CRM', 'Inbound Marketing', 'Sales Software', 'Customer Service'],
        funding_info: {
          total_funding: 'Public Company',
          last_round: 'IPO',
          investors: ['Public Markets']
        },
        key_personnel: {
          ceo: 'Yamini Rangan',
          founders: ['Brian Halligan', 'Dharmesh Shah']
        }
      },
      {
        name: 'Slack Technologies',
        overview: 'Business communication platform that brings teams together through channels, messaging, and collaboration tools.',
        industry: 'Enterprise Software',
        employee_size: '2,500+',
        headquarters: 'San Francisco, CA',
        founded: '2009',
        website: 'slack.com',
        tags: ['Collaboration', 'Communication', 'Workplace', 'Productivity', 'Remote Work'],
        funding_info: {
          total_funding: '$1.4B',
          last_round: 'Acquired by Salesforce',
          investors: ['Salesforce', 'Accel', 'Andreessen Horowitz']
        },
        key_personnel: {
          ceo: 'Stewart Butterfield',
          founders: ['Stewart Butterfield', 'Eric Costello', 'Cal Henderson', 'Serguei Mourachov']
        }
      },
      {
        name: 'Zoom Video Communications',
        overview: 'Video conferencing and communication platform enabling remote work and virtual meetings.',
        industry: 'Video Communications',
        employee_size: '6,000+',
        headquarters: 'San Jose, CA',
        founded: '2011',
        website: 'zoom.us',
        tags: ['Video Conferencing', 'Remote Work', 'Communication', 'Cloud', 'Unified Communications'],
        funding_info: {
          total_funding: 'Public Company',
          last_round: 'IPO',
          investors: ['Public Markets']
        },
        key_personnel: {
          ceo: 'Eric Yuan',
          founders: ['Eric Yuan']
        }
      },
      {
        name: 'Microsoft Corporation',
        overview: 'Global technology company providing cloud computing, productivity software, and enterprise solutions.',
        industry: 'Technology',
        employee_size: '200,000+',
        headquarters: 'Redmond, WA',
        founded: '1975',
        website: 'microsoft.com',
        tags: ['Cloud Computing', 'Productivity Software', 'Enterprise', 'AI', 'Azure', 'Office 365'],
        funding_info: {
          total_funding: 'Public Company',
          last_round: 'IPO',
          investors: ['Public Markets']
        },
        key_personnel: {
          ceo: 'Satya Nadella',
          founders: ['Bill Gates', 'Paul Allen']
        }
      }
    ];

    commonCompanies.forEach(company => {
      this.fallbackData.set(company.name.toLowerCase(), company);
    });
  }

  private setupEventListeners(): void {
    this.eventBus.subscribe('entity.extracted', 'domain-intelligence', async (event) => {
      await this.processExtractedEntities(event.data);
    });

    this.eventBus.subscribe('agent.task.execute', 'domain-intelligence', async (event) => {
      if (event.data.agent_id === 'domain-intelligence') {
        await this.executeTask(event.data);
      }
    });
  }

  private async processExtractedEntities(data: any): Promise<void> {
    const { entities, session_id, trace_id } = data;
    
    // Filter for company entities
    const companyEntities = entities.filter((entity: ExtractedEntity) => 
      entity.type === 'company' && entity.confidence >= 0.6
    );

    if (companyEntities.length === 0) return;

    // Process each company entity
    for (const entity of companyEntities) {
      try {
        const domainData = await this.enrichCompanyData(entity.value, {
          context: entity.context,
          session_id,
          trace_id
        });

        if (domainData) {
          await this.emitDomainIntelligence({
            session_id,
            trace_id,
            domain_data: domainData,
            source_entity: entity
          });
        }
      } catch (error) {
        await this.handleEnrichmentError(error, entity, trace_id);
      }
    }
  }

  private async executeTask(task: any): Promise<void> {
    const startTime = Date.now();
    
    try {
      const { entity } = task.payload;
      
      if (!entity || entity.type !== 'company') {
        throw new Error('Invalid entity for domain intelligence');
      }

      const domainData = await this.enrichCompanyData(entity.value, {
        context: entity.context,
        session_id: task.payload.session_id,
        trace_id: task.trace_id
      });

      const provenance: ProvenanceEnvelope = {
        agent_id: 'domain-intelligence',
        timestamp: new Date(),
        inputs: {
          entities: [entity],
          context: entity.context
        },
        outputs: {
          domain_data: domainData || undefined,
          confidence_score: domainData?.confidence || 0,
          reasoning_chain: [
            `Identified company entity: ${entity.value}`,
            'Searched multiple data sources for company information',
            `Retrieved company profile with ${domainData?.sources.length || 0} sources`,
            `Fetched ${domainData?.news.length || 0} recent news articles`,
            `Overall confidence: ${(domainData?.confidence || 0).toFixed(2)}`
          ]
        },
        confidence: domainData?.confidence || 0,
        trace_id: task.trace_id,
        processing_time_ms: Date.now() - startTime,
        agent_version: '1.0.0',
        sources: domainData?.sources
      };

      // Emit task completion
      this.eventBus.publish({
        type: 'agent.task.completed',
        data: {
          task_id: task.id,
          result: provenance
        },
        timestamp: new Date(),
        source: 'domain-intelligence',
        trace_id: task.trace_id
      });

    } catch (error) {
      await this.emitTaskFailure(task, error);
    }
  }

  async enrichCompanyData(
    companyName: string,
    options: {
      context?: string;
      session_id?: string;
      trace_id?: string;
      include_news?: boolean;
      include_competitors?: boolean;
    } = {}
  ): Promise<DomainIntelligence | null> {
    const normalizedName = companyName.toLowerCase().trim();
    const cacheKey = `${normalizedName}:${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.companyCache.has(cacheKey)) {
      return this.companyCache.get(cacheKey)!;
    }

    // Check rate limiting
    if (this.isRateLimited('company_enrichment')) {
      console.warn('Rate limited for company enrichment, using cache/fallback');
      return this.getFallbackCompanyData(normalizedName);
    }

    try {
      let companyProfile: CompanyProfile | null = null;
      const sources: SourceReference[] = [];
      
      // Try multiple data sources
      companyProfile = await this.fetchFromMultipleSources(companyName, sources);
      
      if (!companyProfile) {
        companyProfile = this.fallbackData.get(normalizedName) || null;
        if (companyProfile) {
          sources.push({
            type: 'database',
            title: 'Internal Company Database',
            confidence: 0.8,
            accessed_at: new Date(),
            snippet: 'Fallback company data from internal database'
          });
        }
      }

      if (!companyProfile) {
        return null;
      }

      // Fetch recent news if requested
      const news: NewsItem[] = options.include_news !== false 
        ? await this.fetchCompanyNews(companyName)
        : [];

      const domainIntelligence: DomainIntelligence = {
        company_name: companyProfile.name,
        overview: companyProfile.overview,
        tags: companyProfile.tags,
        employee_size: companyProfile.employee_size,
        industry: companyProfile.industry,
        news,
        confidence: this.calculateOverallConfidence(sources, news),
        last_updated: new Date(),
        sources
      };

      // Cache the result
      this.companyCache.set(cacheKey, domainIntelligence);
      
      // Limit cache size
      if (this.companyCache.size > 500) {
        const firstKey = this.companyCache.keys().next().value;
        if (firstKey) {
          this.companyCache.delete(firstKey);
        }
      }

      // Update rate limiter
      this.updateRateLimit('company_enrichment');

      return domainIntelligence;

    } catch (error) {
      console.error('Company enrichment failed:', error);
      
      // Try fallback data
      return this.getFallbackCompanyData(normalizedName);
    }
  }

  private async fetchFromMultipleSources(
    companyName: string, 
    sources: SourceReference[]
  ): Promise<CompanyProfile | null> {
    // In production, this would integrate with:
    // - Clearbit API
    // - Crunchbase API
    // - Apollo.io API
    // - LinkedIn Company API
    // - SEC filings
    // - Company websites
    
    // For now, simulate API calls and use fallback data
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));
    
    const normalizedName = companyName.toLowerCase();
    const profile = this.fallbackData.get(normalizedName);
    
    if (profile) {
      sources.push(
        {
          type: 'api',
          title: 'Company Intelligence API',
          confidence: 0.9,
          accessed_at: new Date(),
          snippet: `Retrieved comprehensive company profile for ${profile.name}`,
          url: 'https://api.clearbit.com/v2/companies/find'
        },
        {
          type: 'web',
          title: profile.website,
          confidence: 0.85,
          accessed_at: new Date(),
          snippet: `Official company website with overview and key information`,
          url: `https://${profile.website}`
        }
      );
      
      return profile;
    }
    
    // If not in fallback data, create a basic profile
    const basicProfile: CompanyProfile = {
      name: companyName,
      overview: `${companyName} is a company in the business sector. Additional intelligence gathering in progress.`,
      industry: 'Unknown',
      employee_size: 'Unknown',
      headquarters: 'Unknown',
      founded: 'Unknown',
      website: 'Unknown',
      tags: ['Business', 'Company']
    };
    
    sources.push({
      type: 'database',
      title: 'Basic Company Registry',
      confidence: 0.5,
      accessed_at: new Date(),
      snippet: 'Basic company information from registry lookup'
    });
    
    return basicProfile;
  }

  private async fetchCompanyNews(companyName: string): Promise<NewsItem[]> {
    // In production, integrate with:
    // - News API
    // - Google News API
    // - Bloomberg API
    // - Reuters API
    // - Company RSS feeds
    
    // Mock news data
    const mockNews: NewsItem[] = [
      {
        title: `${companyName} Announces Q3 Earnings Beat Expectations`,
        summary: `${companyName} reported strong quarterly results with revenue growth exceeding analyst expectations.`,
        url: `https://finance.yahoo.com/news/${companyName.toLowerCase()}-earnings`,
        published_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        relevance_score: 0.9,
        source: 'Financial Times'
      },
      {
        title: `${companyName} Expands Partnership with Major Enterprise Client`,
        summary: `New strategic partnership expected to drive significant revenue growth in the enterprise segment.`,
        url: `https://techcrunch.com/news/${companyName.toLowerCase()}-partnership`,
        published_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        relevance_score: 0.8,
        source: 'TechCrunch'
      },
      {
        title: `Industry Analysis: ${companyName}'s Market Position Strengthens`,
        summary: `Market analysts highlight ${companyName}'s competitive advantages and growth trajectory.`,
        url: `https://bloomberg.com/news/${companyName.toLowerCase()}-analysis`,
        published_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        relevance_score: 0.7,
        source: 'Bloomberg'
      }
    ];
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
    
    return mockNews;
  }

  private getFallbackCompanyData(normalizedName: string): DomainIntelligence | null {
    const profile = this.fallbackData.get(normalizedName);
    
    if (!profile) return null;
    
    return {
      company_name: profile.name,
      overview: profile.overview,
      tags: profile.tags,
      employee_size: profile.employee_size,
      industry: profile.industry,
      news: [],
      confidence: 0.7,
      last_updated: new Date(),
      sources: [{
        type: 'database',
        title: 'Fallback Company Database',
        confidence: 0.7,
        accessed_at: new Date(),
        snippet: 'Company information from fallback database'
      }]
    };
  }

  private calculateOverallConfidence(sources: SourceReference[], news: NewsItem[]): number {
    if (sources.length === 0) return 0;
    
    const sourceConfidence = sources.reduce((sum, source) => sum + source.confidence, 0) / sources.length;
    const newsBonus = Math.min(news.length * 0.1, 0.3); // Up to 0.3 bonus for news coverage
    
    return Math.min(sourceConfidence + newsBonus, 1.0);
  }

  private isRateLimited(operation: string): boolean {
    const now = Date.now();
    const lastCall = this.rateLimiter.get(operation) || 0;
    const minInterval = 1000; // 1 second between calls
    
    return (now - lastCall) < minInterval;
  }

  private updateRateLimit(operation: string): void {
    this.rateLimiter.set(operation, Date.now());
  }

  private async emitDomainIntelligence(data: {
    session_id: string;
    trace_id: string;
    domain_data: DomainIntelligence;
    source_entity: ExtractedEntity;
  }): Promise<void> {
    // Log the enrichment
    await this.logger.logEvent({
      event_type: 'domain.enriched',
      agent_id: 'domain-intelligence',
      session_id: data.session_id,
      data: {
        company_name: data.domain_data.company_name,
        confidence: data.domain_data.confidence,
        source_count: data.domain_data.sources.length,
        news_count: data.domain_data.news.length,
        tags: data.domain_data.tags
      },
      timestamp: new Date(),
      trace_id: data.trace_id,
      compliance_tags: ['company_intelligence', 'business_data']
    });

    // Emit to event bus
    this.eventBus.publish({
      type: 'domain.fetched',
      data: {
        session_id: data.session_id,
        domain_data: data.domain_data,
        source_entity: data.source_entity
      },
      timestamp: new Date(),
      source: 'domain-intelligence',
      trace_id: data.trace_id
    });
  }

  private async handleEnrichmentError(
    error: any, 
    entity: ExtractedEntity, 
    traceId: string
  ): Promise<void> {
    await this.logger.logEvent({
      event_type: 'domain.enrichment.error',
      agent_id: 'domain-intelligence',
      session_id: 'unknown',
      data: {
        error: error.message,
        entity_value: entity.value,
        entity_type: entity.type
      },
      timestamp: new Date(),
      trace_id: traceId,
      compliance_tags: ['error_handling', 'company_intelligence']
    });
  }

  private async emitTaskFailure(task: any, error: any): Promise<void> {
    this.eventBus.publish({
      type: 'agent.task.failed',
      data: {
        task_id: task.id,
        error: error.message || 'Domain intelligence enrichment failed'
      },
      timestamp: new Date(),
      source: 'domain-intelligence',
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
          agent_id: 'domain-intelligence',
          status: 'healthy',
          last_heartbeat: new Date(),
          response_time_avg_ms: 800,
          error_rate: 0.05,
          active_tasks: 0,
          version: '1.0.0',
          capabilities: [
            'company_overview',
            'industry_analysis',
            'news_monitoring',
            'competitive_intelligence',
            'market_research',
            'company_tagging'
          ]
        },
        timestamp: new Date(),
        source: 'domain-intelligence',
        trace_id: uuidv4()
      });
    }, 30000);
  }

  /**
   * Get cached company data
   */
  getCachedCompany(companyName: string): DomainIntelligence | null {
    const normalizedName = companyName.toLowerCase();
    
    for (const [key, data] of this.companyCache.entries()) {
      if (key.includes(normalizedName)) {
        return data;
      }
    }
    
    return null;
  }

  /**
   * Get agent statistics
   */
  getStats(): {
    cache_size: number;
    fallback_companies: number;
    is_active: boolean;
    rate_limits: Record<string, number>;
  } {
    return {
      cache_size: this.companyCache.size,
      fallback_companies: this.fallbackData.size,
      is_active: this.isActive,
      rate_limits: Object.fromEntries(this.rateLimiter)
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.companyCache.clear();
  }

  /**
   * Add API key
   */
  setApiKey(service: string, key: string): void {
    this.apiKeys[service as keyof typeof this.apiKeys] = key;
  }

  /**
   * Shutdown agent
   */
  shutdown(): void {
    this.isActive = false;
    this.companyCache.clear();
    this.rateLimiter.clear();
  }
}