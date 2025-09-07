import { AuditLog, ComplianceRule } from '../../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Logger/Audit Agent for immutable logs, provenance chains, and audit traces
 * Ensures complete auditability and compliance for all agent activities
 */
export class LoggerAuditAgent {
  private auditLogs: AuditLog[] = [];
  private complianceRules: Map<string, ComplianceRule> = new Map();
  private retentionPolicies: Map<string, number> = new Map(); // category -> days
  private isInitialized = false;

  constructor() {
    this.initializeComplianceRules();
    this.initializeRetentionPolicies();
    this.startPeriodicCleanup();
  }

  private initializeComplianceRules(): void {
    const defaultRules: ComplianceRule[] = [
      {
        id: 'pii-detection',
        name: 'PII Detection and Protection',
        description: 'Automatically detect and protect personally identifiable information',
        category: 'pii',
        active: true,
        enforcement_level: 'block',
        conditions: {
          patterns: ['email', 'phone', 'ssn', 'credit_card'],
          sensitivity: 'high'
        },
        actions: ['mask', 'encrypt', 'audit']
      },
      {
        id: 'data-retention',
        name: 'Data Retention Policy',
        description: 'Enforce data retention limits based on data type and jurisdiction',
        category: 'retention',
        active: true,
        enforcement_level: 'warn',
        conditions: {
          default_retention_days: 90,
          sensitive_retention_days: 30
        },
        actions: ['warn', 'auto_delete']
      },
      {
        id: 'consent-tracking',
        name: 'Consent Tracking',
        description: 'Track and validate user consent for data processing',
        category: 'consent',
        active: true,
        enforcement_level: 'block',
        conditions: {
          required_for: ['recording', 'analysis', 'storage']
        },
        actions: ['validate_consent', 'block_processing']
      },
      {
        id: 'gdpr-compliance',
        name: 'GDPR Compliance',
        description: 'Ensure GDPR compliance for EU data subjects',
        category: 'privacy',
        active: true,
        enforcement_level: 'block',
        conditions: {
          applies_to: ['eu_users'],
          rights: ['access', 'rectification', 'erasure', 'portability']
        },
        actions: ['audit', 'enforce_rights']
      }
    ];

    defaultRules.forEach(rule => {
      this.complianceRules.set(rule.id, rule);
    });
  }

  private initializeRetentionPolicies(): void {
    this.retentionPolicies.set('session_management', 90);
    this.retentionPolicies.set('task_execution', 30);
    this.retentionPolicies.set('performance_monitoring', 7);
    this.retentionPolicies.set('error_handling', 30);
    this.retentionPolicies.set('workflow_execution', 60);
    this.retentionPolicies.set('compliance_audit', 365); // 1 year for compliance
    this.retentionPolicies.set('security_events', 365);
  }

  /**
   * Log an event with automatic compliance checking
   */
  async logEvent(log: Omit<AuditLog, 'id'>): Promise<string> {
    const auditLog: AuditLog = {
      id: uuidv4(),
      ...log
    };

    // Apply compliance rules
    await this.applyComplianceRules(auditLog);

    // Set retention date if not provided
    if (!auditLog.retention_until) {
      const retentionDays = this.getRetentionPeriod(auditLog.compliance_tags);
      auditLog.retention_until = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
    }

    // Store the log
    this.auditLogs.push(auditLog);

    // In production, this would be stored in a persistent audit database
    await this.persistAuditLog(auditLog);

    return auditLog.id;
  }

  /**
   * Apply compliance rules to audit log
   */
  private async applyComplianceRules(auditLog: AuditLog): Promise<void> {
    for (const rule of this.complianceRules.values()) {
      if (!rule.active) continue;

      try {
        await this.checkComplianceRule(auditLog, rule);
      } catch (error) {
        console.error(`Compliance rule ${rule.id} failed:`, error);
        
        if (rule.enforcement_level === 'block') {
          throw new Error(`Compliance violation: ${rule.name}`);
        }
      }
    }
  }

  /**
   * Check specific compliance rule against audit log
   */
  private async checkComplianceRule(auditLog: AuditLog, rule: ComplianceRule): Promise<void> {
    switch (rule.category) {
      case 'pii':
        await this.checkPIICompliance(auditLog, rule);
        break;
      case 'retention':
        await this.checkRetentionCompliance(auditLog, rule);
        break;
      case 'consent':
        await this.checkConsentCompliance(auditLog, rule);
        break;
      case 'privacy':
        await this.checkPrivacyCompliance(auditLog, rule);
        break;
    }
  }

  private async checkPIICompliance(auditLog: AuditLog, rule: ComplianceRule): Promise<void> {
    const dataString = JSON.stringify(auditLog.data);
    const patterns = rule.conditions.patterns || [];
    
    for (const pattern of patterns) {
      if (this.detectPII(dataString, pattern)) {
        // Apply masking or encryption
        auditLog.data = this.maskPII(auditLog.data, pattern);
        auditLog.compliance_tags.push('pii_processed');
      }
    }
  }

  private async checkRetentionCompliance(auditLog: AuditLog, rule: ComplianceRule): Promise<void> {
    // Check if retention period is appropriate
    const defaultDays = rule.conditions.default_retention_days || 90;
    const sensitivityDays = rule.conditions.sensitive_retention_days || 30;
    
    const isSensitive = auditLog.compliance_tags.some(tag => 
      ['pii', 'sensitive', 'personal'].includes(tag)
    );
    
    const retentionDays = isSensitive ? sensitivityDays : defaultDays;
    const maxRetention = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
    
    if (!auditLog.retention_until || auditLog.retention_until > maxRetention) {
      auditLog.retention_until = maxRetention;
      auditLog.compliance_tags.push('retention_adjusted');
    }
  }

  private async checkConsentCompliance(auditLog: AuditLog, rule: ComplianceRule): Promise<void> {
    const requiredFor = rule.conditions.required_for || [];
    
    if (requiredFor.includes(auditLog.event_type)) {
      // Check if consent exists for this user/session
      const hasConsent = await this.validateConsent(auditLog.user_id, auditLog.session_id);
      
      if (!hasConsent) {
        if (rule.enforcement_level === 'block') {
          throw new Error('User consent required for this operation');
        } else {
          auditLog.compliance_tags.push('consent_missing');
        }
      } else {
        auditLog.compliance_tags.push('consent_verified');
      }
    }
  }

  private async checkPrivacyCompliance(auditLog: AuditLog, rule: ComplianceRule): Promise<void> {
    // GDPR and other privacy regulation compliance
    auditLog.compliance_tags.push('privacy_reviewed');
    
    // Add data subject rights metadata
    if (auditLog.user_id) {
      auditLog.data.data_subject_rights = {
        can_access: true,
        can_rectify: true,
        can_erase: true,
        can_port: true,
        processing_lawful_basis: 'consent'
      };
    }
  }

  /**
   * Detect PII patterns in data
   */
  private detectPII(data: string, pattern: string): boolean {
    const patterns = {
      email: /\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b/g,
      phone: /\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b/g,
      ssn: /\\b\\d{3}-?\\d{2}-?\\d{4}\\b/g,
      credit_card: /\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b/g
    };

    const regex = patterns[pattern as keyof typeof patterns];
    return regex ? regex.test(data) : false;
  }

  /**
   * Mask PII in data
   */
  private maskPII(data: any, pattern: string): any {
    if (typeof data === 'string') {
      return this.maskStringPII(data, pattern);
    } else if (typeof data === 'object') {
      const masked = { ...data };
      for (const [key, value] of Object.entries(masked)) {
        masked[key] = this.maskPII(value, pattern);
      }
      return masked;
    }
    return data;
  }

  private maskStringPII(str: string, pattern: string): string {
    const patterns = {
      email: /\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b/g,
      phone: /\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b/g,
      ssn: /\\b\\d{3}-?\\d{2}-?\\d{4}\\b/g,
      credit_card: /\\b\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}[-\\s]?\\d{4}\\b/g
    };

    const regex = patterns[pattern as keyof typeof patterns];
    if (regex) {
      return str.replace(regex, '***MASKED***');
    }
    return str;
  }

  /**
   * Validate user consent
   */
  private async validateConsent(userId?: string, sessionId?: string): Promise<boolean> {
    // In production, this would check a consent database
    // For now, assume consent is given (would be handled by compliance agent)
    return true;
  }

  /**
   * Get retention period for compliance tags
   */
  private getRetentionPeriod(complianceTags: string[]): number {
    let maxRetention = 30; // default 30 days
    
    for (const tag of complianceTags) {
      const retention = this.retentionPolicies.get(tag);
      if (retention && retention > maxRetention) {
        maxRetention = retention;
      }
    }
    
    return maxRetention;
  }

  /**
   * Persist audit log to storage
   */
  private async persistAuditLog(auditLog: AuditLog): Promise<void> {
    // In production, this would write to:
    // - Immutable audit database (e.g., Amazon QLDB)
    // - Encrypted storage with integrity checks
    // - Blockchain for critical audit trails
    
    console.log(`Audit log persisted: ${auditLog.id}`);
  }

  /**
   * Retrieve audit logs with filtering
   */
  async getAuditLogs(filters: {
    session_id?: string;
    agent_id?: string;
    event_type?: string;
    user_id?: string;
    start_date?: Date;
    end_date?: Date;
    compliance_tags?: string[];
    trace_id?: string;
    limit?: number;
  } = {}): Promise<AuditLog[]> {
    let filtered = this.auditLogs;

    if (filters.session_id) {
      filtered = filtered.filter(log => log.session_id === filters.session_id);
    }

    if (filters.agent_id) {
      filtered = filtered.filter(log => log.agent_id === filters.agent_id);
    }

    if (filters.event_type) {
      filtered = filtered.filter(log => log.event_type === filters.event_type);
    }

    if (filters.user_id) {
      filtered = filtered.filter(log => log.user_id === filters.user_id);
    }

    if (filters.start_date) {
      filtered = filtered.filter(log => log.timestamp >= filters.start_date!);
    }

    if (filters.end_date) {
      filtered = filtered.filter(log => log.timestamp <= filters.end_date!);
    }

    if (filters.compliance_tags?.length) {
      filtered = filtered.filter(log => 
        filters.compliance_tags!.some(tag => log.compliance_tags.includes(tag))
      );
    }

    if (filters.trace_id) {
      filtered = filtered.filter(log => log.trace_id === filters.trace_id);
    }

    if (filters.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered;
  }

  /**
   * Get audit trail for a specific trace
   */
  async getAuditTrail(traceId: string): Promise<AuditLog[]> {
    return this.getAuditLogs({ trace_id: traceId });
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(period: { start: Date; end: Date }): Promise<{
    total_events: number;
    compliance_violations: number;
    pii_events: number;
    consent_events: number;
    retention_warnings: number;
    top_event_types: { type: string; count: number }[];
    agent_activity: { agent_id: string; event_count: number }[];
  }> {
    const logs = await this.getAuditLogs({
      start_date: period.start,
      end_date: period.end
    });

    const totalEvents = logs.length;
    const complianceViolations = logs.filter(log => 
      log.compliance_tags.includes('violation')
    ).length;
    const piiEvents = logs.filter(log => 
      log.compliance_tags.includes('pii_processed')
    ).length;
    const consentEvents = logs.filter(log => 
      log.compliance_tags.includes('consent_verified') || 
      log.compliance_tags.includes('consent_missing')
    ).length;
    const retentionWarnings = logs.filter(log => 
      log.compliance_tags.includes('retention_adjusted')
    ).length;

    // Top event types
    const eventTypeCounts = logs.reduce((acc, log) => {
      acc[log.event_type] = (acc[log.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topEventTypes = Object.entries(eventTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Agent activity
    const agentCounts = logs.reduce((acc, log) => {
      acc[log.agent_id] = (acc[log.agent_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const agentActivity = Object.entries(agentCounts)
      .map(([agent_id, event_count]) => ({ agent_id, event_count }))
      .sort((a, b) => b.event_count - a.event_count);

    return {
      total_events: totalEvents,
      compliance_violations: complianceViolations,
      pii_events: piiEvents,
      consent_events: consentEvents,
      retention_warnings: retentionWarnings,
      top_event_types: topEventTypes,
      agent_activity: agentActivity
    };
  }

  /**
   * Cleanup expired audit logs
   */
  private async cleanupExpiredLogs(): Promise<number> {
    const now = new Date();
    const initialCount = this.auditLogs.length;
    
    this.auditLogs = this.auditLogs.filter(log => 
      !log.retention_until || log.retention_until > now
    );
    
    const cleanedCount = initialCount - this.auditLogs.length;
    
    if (cleanedCount > 0) {
      await this.logEvent({
        event_type: 'audit.cleanup',
        agent_id: 'logger-audit',
        session_id: 'system',
        data: { cleaned_logs: cleanedCount },
        timestamp: new Date(),
        trace_id: uuidv4(),
        compliance_tags: ['data_retention', 'system_maintenance']
      });
    }
    
    return cleanedCount;
  }

  /**
   * Start periodic cleanup task
   */
  private startPeriodicCleanup(): void {
    setInterval(async () => {
      try {
        await this.cleanupExpiredLogs();
      } catch (error) {
        console.error('Audit log cleanup failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Get system health and statistics
   */
  getSystemHealth(): {
    total_logs: number;
    retention_policies: number;
    compliance_rules: number;
    oldest_log?: Date;
    newest_log?: Date;
    memory_usage_estimate_mb: number;
  } {
    const totalLogs = this.auditLogs.length;
    const oldestLog = totalLogs > 0 ? this.auditLogs[0].timestamp : undefined;
    const newestLog = totalLogs > 0 ? this.auditLogs[totalLogs - 1].timestamp : undefined;
    
    // Rough memory usage estimate
    const memoryUsageMB = JSON.stringify(this.auditLogs).length / 1024 / 1024;

    return {
      total_logs: totalLogs,
      retention_policies: this.retentionPolicies.size,
      compliance_rules: this.complianceRules.size,
      oldest_log: oldestLog,
      newest_log: newestLog,
      memory_usage_estimate_mb: memoryUsageMB
    };
  }

  /**
   * Add or update compliance rule
   */
  updateComplianceRule(rule: ComplianceRule): void {
    this.complianceRules.set(rule.id, rule);
  }

  /**
   * Get all compliance rules
   */
  getComplianceRules(): ComplianceRule[] {
    return Array.from(this.complianceRules.values());
  }

  /**
   * Update retention policy
   */
  updateRetentionPolicy(category: string, days: number): void {
    this.retentionPolicies.set(category, days);
  }
}