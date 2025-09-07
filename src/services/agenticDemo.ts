import { agenticSystem } from '../services/aiAgents';
import { v4 as uuidv4 } from 'uuid';

/**
 * Real-time workflow integration test and demonstration
 * Shows the complete flow: STT → Entity → Domain + Retriever → Suggestion → Ranking → UI
 */
export class AgenticSystemDemo {
  private sessionId: string;
  private isRunning = false;
  private demoTranscripts = [
    "Hello everyone, I'm excited to discuss our partnership with Salesforce today.",
    "We've been evaluating their CRM platform against HubSpot and Microsoft Dynamics.",
    "Our main concerns are pricing, implementation timeline, and integration with our existing systems.",
    "Can you tell us more about Salesforce's enterprise features and support options?",
    "We're looking at a 6-month implementation for our team of 500 users.",
    "What's your experience with companies similar to ours in the healthcare industry?",
    "I'd like to schedule a follow-up meeting to discuss the technical requirements."
  ];

  constructor() {
    this.sessionId = uuidv4();
  }

  async startDemo(): Promise<void> {
    if (this.isRunning) {
      console.log('Demo already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Agentic Sales Assistant Demo');
    console.log('==========================================');
    
    try {
      // Initialize the agentic system
      await agenticSystem.initialize();
      console.log('✅ Agentic system initialized');
      
      // Start a demo session
      await agenticSystem.startSession(this.sessionId, ['Demo Sales Rep', 'Demo Customer']);
      console.log('✅ Demo session started:', this.sessionId);
      
      // Setup event listeners to show the workflow
      this.setupEventListeners();
      
      // Simulate a real sales conversation
      await this.simulateConversation();
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      this.isRunning = false;
    }
  }

  private setupEventListeners(): void {
    const eventBus = agenticSystem.getEventBus();
    
    console.log('🔧 Setting up event listeners...');
    
    // Listen to utterance detection (STT Agent)
    eventBus.subscribe('utterance.detected', 'demo', (event) => {
      console.log('\n🎤 [STT Agent] Utterance detected:');
      console.log(`   Speaker: ${event.data.segment.speaker.speaker_id}`);
      console.log(`   Text: "${event.data.segment.text}"`);
      console.log(`   Confidence: ${(event.data.segment.confidence * 100).toFixed(1)}%`);
    });
    
    // Listen to entity extraction
    eventBus.subscribe('entity.extracted', 'demo', (event) => {
      console.log('\n🔍 [Entity Extraction Agent] Entities found:');
      event.data.entities.forEach((entity: any) => {
        console.log(`   ${entity.type}: "${entity.value}" (${(entity.confidence * 100).toFixed(1)}%)`);
      });
    });
    
    // Listen to domain intelligence
    eventBus.subscribe('domain.fetched', 'demo', (event) => {
      console.log('\n🏢 [Domain Intelligence Agent] Company data:');
      const data = event.data.domain_data;
      console.log(`   Company: ${data.company_name}`);
      console.log(`   Industry: ${data.industry}`);
      console.log(`   Size: ${data.employee_size}`);
      console.log(`   Confidence: ${(data.confidence * 100).toFixed(1)}%`);
    });
    
    // Listen to suggestions
    eventBus.subscribe('suggestions.generated', 'demo', (event) => {
      console.log('\n💡 [Suggestion Generator] Talking points:');
      event.data.suggestions.forEach((suggestion: any, index: number) => {
        console.log(`   ${index + 1}. ${suggestion.content}`);
      });
    });
    
    // Listen to ranked suggestions
    eventBus.subscribe('suggestions.ranked', 'demo', (event) => {
      console.log('\n📊 [Ranking Agent] Prioritized suggestions:');
      event.data.ranked_suggestions.forEach((suggestion: any, index: number) => {
        console.log(`   ${index + 1}. [Score: ${suggestion.relevance_score.toFixed(2)}] ${suggestion.content}`);
      });
    });
    
    // Listen to UI updates
    eventBus.subscribe('ui.update', 'demo', (event) => {
      console.log('\n📱 [UI Agent] Interface updated with new insights');
    });
    
    // Listen to agent task completions
    eventBus.subscribe('agent.task.completed', 'demo', (event) => {
      const result = event.data.result;
      console.log(`\n✅ [${result.agent_id}] Task completed in ${result.processing_time_ms}ms`);
    });
    
    // Listen to agent failures
    eventBus.subscribe('agent.task.failed', 'demo', (event) => {
      console.log(`\n❌ [Agent Task] Failed: ${event.data.error}`);
    });
    
    // Listen to workflow events
    eventBus.subscribe('workflow.started', 'demo', (event) => {
      console.log(`\n🔄 [Orchestrator] Workflow started: ${event.data.workflow}`);
    });
    
    // Listen to conversation state updates
    eventBus.subscribe('conversation.state.updated', 'demo', (event) => {
      const state = event.data;
      console.log('\n📋 [Conversation State] Updated:');
      console.log(`   Entities: ${state.entities.length}`);
      console.log(`   Topics: ${state.active_topics.join(', ')}`);
      console.log(`   Stage: ${state.meeting_stage}`);
    });
  }

  private async simulateConversation(): Promise<void> {
    console.log('\n🎭 Starting simulated sales conversation...');
    console.log('===============================================');
    
    for (let i = 0; i < this.demoTranscripts.length; i++) {
      const transcript = this.demoTranscripts[i];
      const speaker = i % 2 === 0 ? 'Sales Rep' : 'Customer';
      
      console.log(`\n--- Turn ${i + 1} ---`);
      console.log(`[${speaker}]: "${transcript}"`);
      
      // Process the utterance through the agentic system
      await agenticSystem.processUtterance(transcript, speaker);
      
      // Wait for processing to complete
      await this.waitForProcessing();
      
      // Add delay between conversations for realism
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n🎉 Demo conversation completed!');
    console.log('================================');
    
    // Show system health summary
    await this.showSystemSummary();
    
    // Stop the demo
    await this.stopDemo();
  }

  private async waitForProcessing(maxWaitMs: number = 5000): Promise<void> {
    const startTime = Date.now();
    const orchestrator = agenticSystem.getOrchestrator();
    
    while (orchestrator.getActiveTasks().length > 0 && (Date.now() - startTime) < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async showSystemSummary(): Promise<void> {
    console.log('\n📊 SYSTEM SUMMARY');
    console.log('==================');
    
    const health = agenticSystem.getSystemHealth();
    
    console.log('Orchestrator:');
    console.log(`  - Active Tasks: ${health.orchestrator?.active_tasks || 0}`);
    console.log(`  - Agent Health: ${Object.keys(health.orchestrator?.agent_health || {}).length} agents`);
    
    console.log('\nEvent Bus:');
    console.log(`  - Status: ${health.event_bus?.status}`);
    console.log(`  - Total Events: ${health.event_bus?.total_events}`);
    console.log(`  - Topics: ${health.event_bus?.total_topics}`);
    
    console.log('\nSTT Agent:');
    console.log(`  - Status: ${health.stt?.is_active ? 'Active' : 'Inactive'}`);
    console.log(`  - Total Segments: ${health.stt?.total_segments}`);
    console.log(`  - Speakers: ${health.stt?.unique_speakers}`);
    
    console.log('\nEntity Extraction:');
    console.log(`  - Cache Size: ${health.entity_extraction?.cache_size}`);
    console.log(`  - Patterns: ${health.entity_extraction?.total_patterns}`);
    
    console.log('\nDomain Intelligence:');
    console.log(`  - Cache Size: ${health.domain_intelligence?.cache_size}`);
    console.log(`  - Fallback Companies: ${health.domain_intelligence?.fallback_companies}`);
    
    console.log('\nLogger/Audit:');
    console.log(`  - Total Logs: ${health.logger?.total_logs}`);
    console.log(`  - Compliance Rules: ${health.logger?.compliance_rules}`);
  }

  async stopDemo(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log('\n🛑 Stopping demo...');
    
    try {
      await agenticSystem.stopSession();
      console.log('✅ Demo session stopped');
      
      await agenticSystem.shutdown();
      console.log('✅ Agentic system shutdown');
      
    } catch (error) {
      console.error('❌ Error stopping demo:', error);
    } finally {
      this.isRunning = false;
      console.log('\n👋 Demo completed. Thank you!');
    }
  }

  // Manual test methods for individual components
  async testEntityExtraction(): Promise<void> {
    console.log('🧪 Testing Entity Extraction...');
    
    const agent = agenticSystem.getEntityExtractionAgent();
    const result = await agent.extractEntities(
      "We're considering Salesforce for our CRM needs, but we're also looking at HubSpot and Microsoft Dynamics.",
      { confidence_threshold: 0.6 }
    );
    
    console.log('Entities found:', result.entities.length);
    result.entities.forEach(entity => {
      console.log(`  ${entity.type}: "${entity.value}" (${entity.confidence.toFixed(2)})`);
    });
  }

  async testDomainIntelligence(): Promise<void> {
    console.log('🧪 Testing Domain Intelligence...');
    
    const agent = agenticSystem.getDomainIntelligenceAgent();
    const result = await agent.enrichCompanyData('Salesforce', {
      include_news: true,
      include_competitors: true
    });
    
    if (result) {
      console.log('Company data:', {
        name: result.company_name,
        industry: result.industry,
        size: result.employee_size,
        tags: result.tags,
        news_count: result.news.length,
        confidence: result.confidence
      });
    } else {
      console.log('No company data found');
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  isDemoRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const agenticDemo = new AgenticSystemDemo();