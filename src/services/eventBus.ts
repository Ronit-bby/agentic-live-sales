import { EventBusEvent, AgentMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Browser-compatible EventEmitter replacement
class SimpleEventEmitter {
  private events: Map<string, ((event: EventBusEvent) => void)[]> = new Map();

  on(event: string, callback: (event: EventBusEvent) => void) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  emit(event: string, data: EventBusEvent) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  off(event: string, callback: (event: EventBusEvent) => void) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

/**
 * Event Bus Service for real-time agent communication
 * Simulates Redis Streams/Kafka functionality for message passing
 * In production, this would be replaced with actual Redis Streams or Kafka
 */
export class EventBusService {
  private emitter = new SimpleEventEmitter();
  private events: Map<string, EventBusEvent[]> = new Map();
  private subscribers: Map<string, Set<string>> = new Map(); // topic -> set of agent IDs
  private messageHistory: EventBusEvent[] = [];
  private maxHistorySize = 1000;
  private partitions: Map<string, EventBusEvent[]> = new Map();

  constructor() {
    // Browser-compatible initialization
    this.initializeDefaultTopics();
  }

  private initializeDefaultTopics(): void {
    const defaultTopics = [
      'agent.task.execute',
      'agent.task.completed',
      'agent.task.failed',
      'agent.heartbeat',
      'utterance.detected',
      'entity.extracted',
      'domain.fetched',
      'person.enriched',
      'suggestions.generated',
      'suggestions.ranked',
      'suggestions.ready',
      'conversation.state.updated',
      'compliance.check',
      'audit.log',
      'ui.update'
    ];

    defaultTopics.forEach(topic => {
      this.events.set(topic, []);
      this.subscribers.set(topic, new Set());
    });
  }

  /**
   * Publish an event to a topic
   */
  publish(event: Omit<EventBusEvent, 'id'>): string {
    const fullEvent: EventBusEvent = {
      id: uuidv4(),
      ...event
    };

    // Store in message history
    this.messageHistory.push(fullEvent);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Store in topic
    if (!this.events.has(event.type)) {
      this.events.set(event.type, []);
    }
    this.events.get(event.type)!.push(fullEvent);

    // Handle partitioning
    if (event.partition_key) {
      const partitionKey = `${event.type}:${event.partition_key}`;
      if (!this.partitions.has(partitionKey)) {
        this.partitions.set(partitionKey, []);
      }
      this.partitions.get(partitionKey)!.push(fullEvent);
    }

    // Emit to all subscribers
    this.emitter.emit(event.type, fullEvent);
    this.emitter.emit('*', fullEvent); // Global listener

    return fullEvent.id;
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic: string, agentId: string, callback: (event: EventBusEvent) => void): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(agentId);

    this.emitter.on(topic, callback);
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string, agentId: string, callback?: (event: EventBusEvent) => void): void {
    const subscribers = this.subscribers.get(topic);
    if (subscribers) {
      subscribers.delete(agentId);
    }

    if (callback) {
      this.emitter.off(topic, callback);
    }
  }

  /**
   * Get events from a topic with optional filtering
   */
  getEvents(
    topic: string, 
    options: {
      since?: Date;
      limit?: number;
      trace_id?: string;
      source?: string;
    } = {}
  ): EventBusEvent[] {
    const events = this.events.get(topic) || [];
    let filtered = events;

    if (options.since) {
      filtered = filtered.filter(event => event.timestamp >= options.since!);
    }

    if (options.trace_id) {
      filtered = filtered.filter(event => event.trace_id === options.trace_id);
    }

    if (options.source) {
      filtered = filtered.filter(event => event.source === options.source);
    }

    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  /**
   * Get events by trace ID across all topics
   */
  getEventsByTrace(traceId: string): EventBusEvent[] {
    return this.messageHistory.filter(event => event.trace_id === traceId);
  }

  /**
   * Get events from a partition
   */
  getPartitionEvents(topic: string, partitionKey: string): EventBusEvent[] {
    const key = `${topic}:${partitionKey}`;
    return this.partitions.get(key) || [];
  }

  /**
   * Stream events in real-time
   */
  streamEvents(
    topic: string,
    callback: (event: EventBusEvent) => void,
    options: {
      since?: Date;
      trace_id?: string;
    } = {}
  ): () => void {
    const wrappedCallback = (event: EventBusEvent) => {
      let shouldProcess = true;

      if (options.since && event.timestamp < options.since) {
        shouldProcess = false;
      }

      if (options.trace_id && event.trace_id !== options.trace_id) {
        shouldProcess = false;
      }

      if (shouldProcess) {
        callback(event);
      }
    };

    this.emitter.on(topic, wrappedCallback);

    // Return unsubscribe function
    return () => {
      this.emitter.off(topic, wrappedCallback);
    };
  }

  /**
   * Create a consumer group for load balancing
   */
  createConsumerGroup(
    groupId: string,
    topics: string[],
    handler: (event: EventBusEvent) => Promise<void>
  ): ConsumerGroup {
    return new ConsumerGroup(this, groupId, topics, handler);
  }

  /**
   * Publish agent message (higher-level API)
   */
  publishAgentMessage(message: Omit<AgentMessage, 'id'>): string {
    return this.publish({
      type: `agent.${message.type}`,
      data: message,
      timestamp: message.timestamp,
      source: message.from_agent,
      trace_id: message.trace_id,
      partition_key: message.to_agent || 'broadcast'
    });
  }

  /**
   * Get topic statistics
   */
  getTopicStats(topic: string): {
    total_events: number;
    subscribers: number;
    latest_event?: Date;
    events_per_minute: number;
  } {
    const events = this.events.get(topic) || [];
    const subscribers = this.subscribers.get(topic)?.size || 0;
    const latestEvent = events.length > 0 ? events[events.length - 1].timestamp : undefined;
    
    // Calculate events per minute (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEvents = events.filter(event => event.timestamp >= oneHourAgo);
    const eventsPerMinute = recentEvents.length / 60;

    return {
      total_events: events.length,
      subscribers,
      latest_event: latestEvent,
      events_per_minute: eventsPerMinute
    };
  }

  /**
   * Clear old events to manage memory
   */
  clearOldEvents(olderThan: Date): number {
    let clearedCount = 0;

    this.events.forEach((events, topic) => {
      const filtered = events.filter(event => event.timestamp >= olderThan);
      clearedCount += events.length - filtered.length;
      this.events.set(topic, filtered);
    });

    this.partitions.forEach((events, partition) => {
      const filtered = events.filter(event => event.timestamp >= olderThan);
      this.partitions.set(partition, filtered);
    });

    this.messageHistory = this.messageHistory.filter(event => event.timestamp >= olderThan);

    return clearedCount;
  }

  /**
   * Get all active topics
   */
  getActiveTopics(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Get subscriber count for a topic
   */
  getSubscriberCount(topic: string): number {
    return this.subscribers.get(topic)?.size || 0;
  }

  /**
   * Health check
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded';
    total_topics: number;
    total_events: number;
    total_subscribers: number;
    memory_usage_mb: number;
  } {
    const totalEvents = Array.from(this.events.values()).reduce((sum, events) => sum + events.length, 0);
    const totalSubscribers = Array.from(this.subscribers.values()).reduce((sum, subs) => sum + subs.size, 0);
    
    // Rough memory usage estimation
    const memoryUsageMB = (JSON.stringify(this.messageHistory).length + 
                          JSON.stringify(Array.from(this.events.values()).flat()).length) / 1024 / 1024;

    return {
      status: memoryUsageMB > 100 ? 'degraded' : 'healthy',
      total_topics: this.events.size,
      total_events: totalEvents,
      total_subscribers: totalSubscribers,
      memory_usage_mb: memoryUsageMB
    };
  }
}

/**
 * Consumer Group for load balancing event processing
 */
export class ConsumerGroup {
  private isRunning = false;
  private consumers: Map<string, boolean> = new Map();

  constructor(
    private eventBus: EventBusService,
    private groupId: string,
    private topics: string[],
    private handler: (event: EventBusEvent) => Promise<void>
  ) {}

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    this.topics.forEach(topic => {
      this.eventBus.subscribe(topic, this.groupId, this.processEvent.bind(this));
    });
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    this.topics.forEach(topic => {
      this.eventBus.unsubscribe(topic, this.groupId);
    });
  }

  private async processEvent(event: EventBusEvent): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.handler(event);
    } catch (error) {
      console.error(`Consumer group ${this.groupId} failed to process event:`, error);
      
      // Publish error event
      this.eventBus.publish({
        type: 'consumer.error',
        data: {
          group_id: this.groupId,
          original_event: event,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date(),
        source: 'event-bus',
        trace_id: event.trace_id
      });
    }
  }

  getStats(): {
    group_id: string;
    is_running: boolean;
    topics: string[];
    consumer_count: number;
  } {
    return {
      group_id: this.groupId,
      is_running: this.isRunning,
      topics: this.topics,
      consumer_count: this.consumers.size
    };
  }
}

// Export singleton instance
export const eventBus = new EventBusService();