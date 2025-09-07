import { v4 as uuidv4 } from 'uuid';
import { PersonEnrichment, ExtractedEntity, SourceReference, ProvenanceEnvelope } from '../../types';
import { eventBus } from '../eventBus';

/**
 * Person Enrichment Agent - Resolves public profiles from email addresses
 * 
 * Capabilities:
 * - Email to profile resolution using public data sources
 * - LinkedIn profile enrichment (simulated)
 * - Professional background and experience extraction
 * - Company affiliation and role detection
 * - Confidence scoring with provenance tracking
 */
export class PersonEnrichmentAgent {
  private readonly agentId = 'person-enrichment';
  private cache: Map<string, PersonEnrichment> = new Map();
  private readonly cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

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
      const result = await this.enrichPerson(task.payload);
      
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

  async enrichPerson(payload: { entity?: ExtractedEntity; email?: string }): Promise<ProvenanceEnvelope> {
    const startTime = Date.now();
    const traceId = uuidv4();

    // Extract email from entity or use direct email
    const email = payload.email || this.extractEmailFromEntity(payload.entity);
    
    if (!email) {
      throw new Error('No email address provided for person enrichment');
    }

    // Check cache first
    const cached = this.getCachedPersonData(email);
    if (cached) {
      return this.createProvenanceEnvelope(email, cached, traceId, startTime, true);
    }

    // Perform person enrichment
    const personData = await this.performPersonEnrichment(email);
    
    // Cache the result
    this.cache.set(email, personData);

    return this.createProvenanceEnvelope(email, personData, traceId, startTime, false);
  }

  private extractEmailFromEntity(entity?: ExtractedEntity): string | null {
    if (!entity) return null;
    
    // Check if entity contains email pattern
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = entity.value.match(emailRegex);
    return match ? match[0] : null;
  }

  private getCachedPersonData(email: string): PersonEnrichment | null {
    const cached = this.cache.get(email);
    if (!cached) return null;

    // Check if cache is still valid
    const age = Date.now() - cached.last_updated.getTime();
    if (age > this.cacheTimeout) {
      this.cache.delete(email);
      return null;
    }

    return cached;
  }

  private async performPersonEnrichment(email: string): Promise<PersonEnrichment> {
    // Extract domain and name patterns from email
    const [localPart, domain] = email.split('@');
    const nameGuess = this.guessNameFromEmail(localPart);
    
    // Simulate API calls to various data sources
    const sources: SourceReference[] = [];
    
    // Simulate LinkedIn enrichment
    const linkedinData = await this.enrichFromLinkedIn(email, domain);
    if (linkedinData.found) {
      sources.push({
        type: 'api',
        title: 'LinkedIn Professional Network',
        confidence: 0.85,
        accessed_at: new Date(),
        snippet: 'Professional profile information'
      });
    }

    // Simulate company directory lookup
    const companyData = await this.enrichFromCompanyDirectory(email, domain);
    if (companyData.found) {
      sources.push({
        type: 'web',
        url: `https://${domain}/team`,
        title: 'Company Team Directory',
        confidence: 0.75,
        accessed_at: new Date(),
        snippet: 'Employee directory listing'
      });
    }

    // Simulate social media aggregation
    const socialData = await this.enrichFromSocialMedia(nameGuess, domain);
    if (socialData.found) {
      sources.push({
        type: 'web',
        title: 'Professional Social Profiles',
        confidence: 0.65,
        accessed_at: new Date(),
        snippet: 'Aggregated social media profiles'
      });
    }

    // Combine all data sources
    const personData: PersonEnrichment = {
      email,
      name: linkedinData.name || companyData.name || nameGuess,
      title: linkedinData.title || companyData.title,
      company: companyData.company || this.extractCompanyFromDomain(domain),
      linkedin_url: linkedinData.linkedin_url,
      profile_summary: this.generateProfileSummary(linkedinData, companyData, socialData),
      experience_bullets: this.generateExperienceBullets(linkedinData, companyData),
      confidence: this.calculateConfidence(sources),
      sources,
      last_updated: new Date()
    };

    return personData;
  }

  private guessNameFromEmail(localPart: string): string {
    // Common email formats: first.last, firstlast, f.last, etc.
    const cleaned = localPart.replace(/[0-9]/g, ''); // Remove numbers
    
    if (cleaned.includes('.')) {
      const parts = cleaned.split('.');
      return parts.map(part => this.capitalize(part)).join(' ');
    }
    
    if (cleaned.includes('_')) {
      const parts = cleaned.split('_');
      return parts.map(part => this.capitalize(part)).join(' ');
    }
    
    return this.capitalize(cleaned);
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  private async enrichFromLinkedIn(email: string, domain: string): Promise<any> {
    // Simulate LinkedIn API call
    await this.simulateAPIDelay(800, 1500);
    
    // Simulate success rate based on domain type
    const isBusinessDomain = !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain);
    const successRate = isBusinessDomain ? 0.7 : 0.3;
    
    if (Math.random() < successRate) {
      const sampleTitles = [
        'Senior Sales Manager', 'Business Development Director', 'VP of Sales',
        'Account Executive', 'Sales Director', 'Regional Sales Manager',
        'Enterprise Account Manager', 'Sales Operations Manager'
      ];
      
      return {
        found: true,
        name: this.guessNameFromEmail(email.split('@')[0]),
        title: sampleTitles[Math.floor(Math.random() * sampleTitles.length)],
        linkedin_url: `https://linkedin.com/in/${email.split('@')[0]}`
      };
    }
    
    return { found: false };
  }

  private async enrichFromCompanyDirectory(email: string, domain: string): Promise<any> {
    // Simulate company directory lookup
    await this.simulateAPIDelay(400, 800);
    
    // Higher success rate for business domains
    const isBusinessDomain = !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'].includes(domain);
    const successRate = isBusinessDomain ? 0.6 : 0.1;
    
    if (Math.random() < successRate) {
      return {
        found: true,
        name: this.guessNameFromEmail(email.split('@')[0]),
        title: 'Team Member',
        company: this.extractCompanyFromDomain(domain)
      };
    }
    
    return { found: false };
  }

  private async enrichFromSocialMedia(name: string, domain: string): Promise<any> {
    // Simulate social media aggregation
    await this.simulateAPIDelay(600, 1200);
    
    const successRate = 0.4;
    
    if (Math.random() < successRate) {
      return {
        found: true,
        platforms: ['Twitter', 'GitHub'],
        activity_level: 'moderate'
      };
    }
    
    return { found: false };
  }

  private extractCompanyFromDomain(domain: string): string {
    // Extract company name from domain
    const parts = domain.split('.');
    const mainPart = parts[0];
    
    // Handle common cases
    if (mainPart === 'www') {
      return this.capitalize(parts[1]);
    }
    
    return this.capitalize(mainPart);
  }

  private generateProfileSummary(linkedinData: any, companyData: any, socialData: any): string[] {
    const summary: string[] = [];
    
    if (linkedinData.found) {
      summary.push(`Professional with experience in ${linkedinData.title || 'business development'}`);
    }
    
    if (companyData.found) {
      summary.push(`Currently associated with ${companyData.company || 'their organization'}`);
    }
    
    if (socialData.found) {
      summary.push(`Active on professional networks with ${socialData.activity_level} engagement`);
    }
    
    if (summary.length === 0) {
      summary.push('Limited public profile information available');
    }
    
    return summary;
  }

  private generateExperienceBullets(linkedinData: any, companyData: any): string[] {
    const bullets: string[] = [];
    
    if (linkedinData.found && linkedinData.title) {
      bullets.push(`• ${linkedinData.title} with demonstrated leadership experience`);
      bullets.push(`• Proven track record in ${this.inferSkillsFromTitle(linkedinData.title)}`);
    }
    
    if (companyData.found) {
      bullets.push(`• Current team member contributing to organizational goals`);
    }
    
    if (bullets.length === 0) {
      bullets.push('• Professional background details not publicly available');
    }
    
    return bullets;
  }

  private inferSkillsFromTitle(title: string): string {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('sales')) {
      return 'sales strategy, client relationship management, and revenue generation';
    }
    if (titleLower.includes('business development')) {
      return 'business development, partnership building, and market expansion';
    }
    if (titleLower.includes('manager') || titleLower.includes('director')) {
      return 'team leadership, project management, and strategic planning';
    }
    if (titleLower.includes('engineer') || titleLower.includes('developer')) {
      return 'technical expertise, software development, and problem solving';
    }
    
    return 'professional expertise and cross-functional collaboration';
  }

  private calculateConfidence(sources: SourceReference[]): number {
    if (sources.length === 0) return 0.1;
    
    // Weight confidence based on source quality and quantity
    const totalConfidence = sources.reduce((sum, source) => sum + source.confidence, 0);
    const avgConfidence = totalConfidence / sources.length;
    
    // Bonus for multiple sources
    const sourceBonus = Math.min(sources.length * 0.1, 0.3);
    
    return Math.min(avgConfidence + sourceBonus, 0.95);
  }

  private async simulateAPIDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private createProvenanceEnvelope(
    email: string,
    personData: PersonEnrichment,
    traceId: string,
    startTime: number,
    fromCache: boolean
  ): ProvenanceEnvelope {
    return {
      agent_id: this.agentId,
      timestamp: new Date(),
      inputs: {
        email,
        previous_outputs: []
      },
      outputs: {
        person_data: personData,
        confidence_score: personData.confidence,
        reasoning_chain: [
          'Extracted email address from input',
          fromCache ? 'Retrieved from cache' : 'Performed multi-source enrichment',
          'LinkedIn profile lookup attempted',
          'Company directory search executed',
          'Social media aggregation performed',
          'Confidence calculated from source reliability'
        ]
      },
      confidence: personData.confidence,
      trace_id: traceId,
      sources: personData.sources,
      processing_time_ms: Date.now() - startTime,
      agent_version: '1.0.0'
    };
  }

  // Public API for direct usage
  async getPersonData(email: string): Promise<PersonEnrichment | null> {
    try {
      const result = await this.enrichPerson({ email });
      return result.outputs.person_data || null;
    } catch (error) {
      console.error('Person enrichment failed:', error);
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const personEnrichmentAgent = new PersonEnrichmentAgent();