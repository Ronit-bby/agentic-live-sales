import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  AgentTask, 
  AgentMessage, 
  ConversationState, 
  AgentHealthStatus
} from '../types';
import { AGENTIC_AGENT_TYPES, AGENT_WORKFLOWS } from './agentTypes';
import { eventBus } from './eventBus';
import { LoggerAuditAgent } from './agents/loggerAuditAgent';

/**
 * Orchestrator/Coordinator Agent - Central control for the agentic system
 * 
 * Responsibilities:
 * - Route tasks to appropriate agents based on dependencies and priorities
 * - Maintain conversation state and context
 * - Enforce SLAs with timeouts and fallback strategies
 * - Monitor agent health and coordinate recovery
 * - Manage workflow execution and parallel task processing
 */
export class OrchestratorAgent {
  private sessionId: string | null = null;
  private conversationState: ConversationState | null = null;
  private activeTasks: Map<string, AgentTask> = new Map();
  private taskQueue: AgentTask[] = [];
  private agentHealth: Map<string, AgentHealthStatus> = new Map();
  private slaTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventBus = eventBus;
  private logger = new LoggerAuditAgent();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    this.initializeEventBus();
    this.startHealthMonitoring();
    this.isInitialized = true;

    // Initialize agent health states
    for (const agentType of AGENTIC_AGENT_TYPES) {
      this.agentHealth.set(agentType.id, {
        agent_id: agentType.id,
        status: 'healthy',
        last_heartbeat: new Date(),
        response_time_avg_ms: 0,
        error_rate: 0,
        active_tasks: 0,
        version: '1.0.0',
        capabilities: [agentType.name]
      });
    }
  }

  private initializeEventBus(): void {
    this.eventBus.on('agent.task.completed', this.handleTaskCompletion.bind(this));
    this.eventBus.on('agent.task.failed', this.handleTaskFailure.bind(this));
    this.eventBus.on('agent.heartbeat', this.handleAgentHeartbeat.bind(this));
    this.eventBus.on('utterance.detected', this.handleUtteranceDetected.bind(this));
    this.eventBus.on('entity.extracted', this.handleEntityExtracted.bind(this));
    this.eventBus.on('suggestions.ready', this.handleSuggestionsReady.bind(this));
  }

  async startSession(sessionId: string, participants: string[]): Promise<void> {
    this.sessionId = sessionId;
    this.conversationState = {
      session_id: sessionId,
      participants,
      entities: [],
      domain_context: [],
      person_context: [],
      active_topics: [],
      meeting_stage: 'opening',
      sentiment_trend: [],
      last_updated: new Date(),
      context_summary: ''
    };

    // Log session start
    await this.logger.logEvent({
      event_type: 'session.started',
      agent_id: 'orchestrator',
      session_id: sessionId,
      data: { participants },
      timestamp: new Date(),
      trace_id: uuidv4(),
      compliance_tags: ['session_management'],
      retention_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
    });

    // Start compliance check workflow
    await this.executeWorkflow('compliance-check', { session_id: sessionId });

    this.eventBus.publish({
      type: 'session.started',
      data: { sessionId, participants },
      timestamp: new Date(),
      source: 'orchestrator',
      trace_id: uuidv4()
    });
  }

  async stopSession(): Promise<void> {
    if (!this.sessionId) return;

    // Complete any pending tasks
    await this.waitForPendingTasks();

    // Log session end
    await this.logger.logEvent({
      event_type: 'session.ended',
      agent_id: 'orchestrator',
      session_id: this.sessionId,
      data: { 
        duration: Date.now() - (this.conversationState?.last_updated.getTime() || Date.now()),
        total_tasks: this.activeTasks.size
      },
      timestamp: new Date(),
      trace_id: uuidv4(),
      compliance_tags: ['session_management']
    });

    this.eventBus.publish({
      type: 'session.stopped',
      data: { sessionId: this.sessionId },
      timestamp: new Date(),
      source: 'orchestrator',
      trace_id: uuidv4()
    });
    
    this.sessionId = null;
    this.conversationState = null;
    this.activeTasks.clear();
    this.clearAllSLATimers();
  }

  async executeWorkflow(workflowName: string, payload: any): Promise<void> {
    const workflow = (AGENT_WORKFLOWS as any)[workflowName];
    if (!workflow) {
      throw new Error(`Unknown workflow: ${workflowName}`);
    }

    const traceId = uuidv4();
    
    await this.logger.logEvent({
      event_type: 'workflow.started',
      agent_id: 'orchestrator',
      session_id: this.sessionId || 'unknown',
      data: { workflow: workflowName, payload },
      timestamp: new Date(),
      trace_id: traceId,
      compliance_tags: ['workflow_execution']
    });

    try {
      for (const step of workflow.sequence) {
        if (Array.isArray(step)) {
          // Parallel execution
          await this.executeParallelTasks(step, payload, traceId);
        } else {
          // Sequential execution
          await this.executeTask(step, payload, traceId);
        }
      }
    } catch (error) {
      await this.handleWorkflowError(workflowName, error, traceId);
    }
  }

  private async executeParallelTasks(agentIds: string[], payload: any, traceId: string): Promise<void> {
    const tasks = agentIds.map(agentId => this.createTask(agentId, payload, traceId));
    
    // Add all tasks to queue
    tasks.forEach(task => {
      this.activeTasks.set(task.id, task);
      this.taskQueue.push(task);
    });

    // Process tasks in parallel
    const promises = tasks.map(task => this.processTask(task));
    await Promise.allSettled(promises);
  }

  private async executeTask(agentId: string, payload: any, traceId: string): Promise<void> {
    const task = this.createTask(agentId, payload, traceId);
    this.activeTasks.set(task.id, task);
    this.taskQueue.push(task);
    
    await this.processTask(task);
  }

  private createTask(agentId: string, payload: any, traceId: string): AgentTask {
    const agentType = AGENTIC_AGENT_TYPES.find(a => a.id === agentId);
    
    return {
      id: uuidv4(),
      type: 'analysis',
      agent_id: agentId,
      payload,
      priority: agentType?.priority || 10,
      created_at: new Date(),
      status: 'pending',
      retries: 0,
      max_retries: 3,
      timeout_ms: agentType?.sla_timeout_ms || 5000,
      dependencies: agentType?.dependencies,
      trace_id: traceId
    };
  }

  private async processTask(task: AgentTask): Promise<void> {
    try {
      // Check dependencies
      if (task.dependencies) {
        const dependenciesMet = await this.checkDependencies(task.dependencies);
        if (!dependenciesMet) {
          // Wait for dependencies or fail
          setTimeout(() => this.processTask(task), 1000);
          return;
        }
      }

      task.status = 'running';
      task.started_at = new Date();
      
      // Set SLA timeout
      this.setSLATimer(task);

      // Execute the task via event bus
      this.eventBus.publish({
        id: uuidv4(),
        type: 'agent.task.execute',
        data: task,
        timestamp: new Date(),
        source: 'orchestrator',
        trace_id: task.trace_id
      });

    } catch (error) {
      await this.handleTaskError(task, error);
    }
  }

  private async handleTaskError(task: AgentTask, error: any): Promise<void> {
    await this.logger.logEvent({
      event_type: 'task.error',
      agent_id: task.agent_id,
      session_id: this.sessionId || 'unknown',
      data: { task_id: task.id, error: error.message },
      timestamp: new Date(),
      trace_id: task.trace_id,
      compliance_tags: ['error_handling']
    });
  }

  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    // Check if all dependency agents have completed their recent tasks
    for (const depAgentId of dependencies) {
      const agentHealth = this.agentHealth.get(depAgentId);
      if (!agentHealth || agentHealth.status === 'offline') {
        return false;
      }
    }
    return true;
  }

  private setSLATimer(task: AgentTask): void {
    const timer = setTimeout(async () => {
      if (task.status === 'running') {
        await this.handleTaskTimeout(task);
      }
    }, task.timeout_ms);
    
    this.slaTimers.set(task.id, timer);
  }

  private clearSLATimer(taskId: string): void {
    const timer = this.slaTimers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.slaTimers.delete(taskId);
    }
  }

  private clearAllSLATimers(): void {
    this.slaTimers.forEach(timer => clearTimeout(timer));
    this.slaTimers.clear();
  }

  private async handleTaskCompletion(message: AgentMessage): Promise<void> {
    const taskId = message.payload.task_id;
    const task = this.activeTasks.get(taskId);
    
    if (!task) return;

    this.clearSLATimer(taskId);
    task.status = 'completed';
    task.completed_at = new Date();
    
    // Update conversation state with results
    if (this.conversationState && message.payload.result) {
      await this.updateConversationState(message.payload.result);
    }

    // Log completion
    await this.logger.logEvent({
      event_type: 'task.completed',
      agent_id: task.agent_id,
      session_id: this.sessionId || 'unknown',
      data: { task_id: taskId, duration: task.completed_at.getTime() - (task.started_at?.getTime() || 0) },
      timestamp: new Date(),
      trace_id: task.trace_id,
      compliance_tags: ['task_execution']
    });

    this.activeTasks.delete(taskId);
    this.emit('task.completed', { task, result: message.payload.result });
  }

  private async handleTaskFailure(message: AgentMessage): Promise<void> {
    const taskId = message.payload.task_id;
    const task = this.activeTasks.get(taskId);
    
    if (!task) return;

    this.clearSLATimer(taskId);
    
    // Implement retry logic
    if (task.retries < task.max_retries) {
      task.retries++;
      task.status = 'pending';
      
      // Exponential backoff
      const delay = Math.pow(2, task.retries) * 1000;
      setTimeout(() => this.processTask(task), delay);
      
      return;
    }

    // Max retries exceeded, implement fallback strategy
    const agentType = AGENTIC_AGENT_TYPES.find(a => a.id === task.agent_id);
    await this.executeFallbackStrategy(task, agentType?.fallback_strategy || 'skip');
    
    task.status = 'failed';
    this.activeTasks.delete(taskId);
    this.emit('task.failed', { task, error: message.payload.error });
  }

  private async handleTaskTimeout(task: AgentTask): Promise<void> {
    task.status = 'timeout';
    
    await this.logger.logEvent({
      event_type: 'task.timeout',
      agent_id: task.agent_id,
      session_id: this.sessionId || 'unknown',
      data: { task_id: task.id, timeout_ms: task.timeout_ms },
      timestamp: new Date(),
      trace_id: task.trace_id,
      compliance_tags: ['performance_monitoring']
    });

    // Treat timeout as failure and apply retry/fallback logic
    await this.handleTaskFailure({
      id: uuidv4(),
      type: 'response',
      from_agent: 'orchestrator',
      payload: { task_id: task.id, error: 'Task timeout' },
      timestamp: new Date(),
      trace_id: task.trace_id,
      priority: 'high'
    });
  }

  private async executeFallbackStrategy(task: AgentTask, strategy: string): Promise<void> {
    switch (strategy) {
      case 'retry':
        // Already handled in retry logic
        break;
      case 'degraded':
        // Use simplified/cached results
        await this.provideDegradedService(task);
        break;
      case 'skip':
        // Continue workflow without this agent's contribution
        await this.skipAgent(task);
        break;
      default:
        console.warn(`Unknown fallback strategy: ${strategy}`);
    }
  }

  private async provideDegradedService(task: AgentTask): Promise<void> {
    // Provide basic/cached response
    const degradedResult = {
      agent_id: task.agent_id,
      outputs: {
        confidence_score: 0.3,
        reasoning_chain: ['Degraded service - using fallback data'],
        analysis: `Fallback analysis from ${task.agent_id} due to service degradation`
      },
      degraded: true
    };

    this.emit('task.completed', { task, result: degradedResult });
  }

  private async skipAgent(task: AgentTask): Promise<void> {
    await this.logger.logEvent({
      event_type: 'agent.skipped',
      agent_id: task.agent_id,
      session_id: this.sessionId || 'unknown',
      data: { task_id: task.id, reason: 'fallback_strategy_skip' },
      timestamp: new Date(),
      trace_id: task.trace_id,
      compliance_tags: ['workflow_execution']
    });
  }

  private async handleWorkflowError(workflowName: string, error: any, traceId: string): Promise<void> {
    await this.logger.logEvent({
      event_type: 'workflow.failed',
      agent_id: 'orchestrator',
      session_id: this.sessionId || 'unknown',
      data: { workflow: workflowName, error: error.message },
      timestamp: new Date(),
      trace_id: traceId,
      compliance_tags: ['error_handling']
    });

    this.emit('workflow.failed', { workflow: workflowName, error });
  }

  private async updateConversationState(result: any): Promise<void> {
    if (!this.conversationState) return;

    // Update conversation state based on agent results
    if (result.entities) {
      this.conversationState.entities.push(...result.entities);
    }
    
    if (result.domain_data) {
      this.conversationState.domain_context.push(result.domain_data);
    }
    
    if (result.person_data) {
      this.conversationState.person_context.push(result.person_data);
    }
    
    this.conversationState.last_updated = new Date();
    
    // Broadcast updated state
    this.eventBus.publish({
      id: uuidv4(),
      type: 'conversation.state.updated',
      data: this.conversationState,
      timestamp: new Date(),
      source: 'orchestrator',
      trace_id: uuidv4()
    });
  }

  private handleAgentHeartbeat(message: AgentMessage): void {
    const healthStatus: AgentHealthStatus = message.payload;
    this.agentHealth.set(healthStatus.agent_id, healthStatus);
    
    // Check for unhealthy agents and trigger alerts
    if (healthStatus.status === 'unhealthy' || healthStatus.error_rate > 0.1) {
      this.emit('agent.unhealthy', healthStatus);
    }
  }

  private async handleUtteranceDetected(message: AgentMessage): Promise<void> {
    // Trigger real-time sales intelligence workflow
    await this.executeWorkflow('real-time-sales-intelligence', message.payload);
  }

  private async handleEntityExtracted(message: AgentMessage): Promise<void> {
    const entities = message.payload.entities;
    
    // Trigger intelligence gathering for new entities
    for (const entity of entities) {
      if (entity.type === 'company') {
        await this.executeTask('domain-intelligence', { entity }, message.trace_id);
      }
      if (entity.type === 'person') {
        await this.executeTask('person-enrichment', { entity }, message.trace_id);
      }
    }
  }

  private async handleSuggestionsReady(message: AgentMessage): Promise<void> {
    // Trigger UI update
    await this.executeTask('ui-agent', message.payload, message.trace_id);
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.checkAgentHealth();
    }, 30000); // Check every 30 seconds
  }

  private checkAgentHealth(): void {
    const now = new Date();
    
    this.agentHealth.forEach((health, agentId) => {
      const timeSinceHeartbeat = now.getTime() - health.last_heartbeat.getTime();
      
      if (timeSinceHeartbeat > 60000) { // 1 minute
        health.status = 'offline';
        this.emit('agent.offline', { agentId, health });
      }
    });
  }

  private async waitForPendingTasks(timeoutMs: number = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (this.activeTasks.size > 0 && (Date.now() - startTime) < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Public API methods
  getConversationState(): ConversationState | null {
    return this.conversationState;
  }

  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values());
  }

  getAgentHealth(): Map<string, AgentHealthStatus> {
    return new Map(this.agentHealth);
  }

  getSystemHealth() {
    return {
      orchestrator: {
        active_tasks: this.activeTasks.size,
        session_active: !!this.sessionId,
        agent_health_count: this.agentHealth.size
      },
      event_bus: {
        status: 'healthy',
        total_events: eventBus.getEventCount(),
        subscriptions: eventBus.getSubscriberCount()
      }
    };
  }

  async processUtterance(transcript: string, speaker: string): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session');
    }

    await this.executeWorkflow('real-time-sales-intelligence', {
      transcript,
      speaker,
      timestamp: new Date(),
      session_id: this.sessionId
    });
  }
}

// Singleton instance
export const orchestrator = new OrchestratorAgent();