import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { container } from '../core/container.js';
import { getErrorMessage } from '../utils/error-message.js';

/**
 * @typedef {{name?:string,message?:string,stack?:string}} ErrorLike
 */

export class AuditLogger {
  constructor() {
    /** @type {any|null} */
    this.logger = null;
    /** @type {any|null} */
    this.configManager = null;
    /** @type {any|null} */
    this.sessionManager = null;
    /** @type {string|null} */
    this.auditFile = null;
    /** @type {any[]} */
    this.buffer = [];
    /** @type {number} */
    this.bufferSize = 100;
    /** @type {number} */
    this.flushInterval = 5000;
    /** @type {any|null} */
    this.flushTimer = null;
    /** @type {string[]} */
    this.sensitiveFields = ['password', 'token', 'key', 'secret', 'auth'];
  }

  async initialize() {
    this.logger = container.resolve('logger');
    this.configManager = container.resolve('configManager');
    this.sessionManager = container.resolve('sessionManager');

    const auditDir = this.configManager.constant('AUDIT_LOG_DIR') || './logs/audit';
    if (!existsSync(auditDir)) {
      mkdirSync(auditDir, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    this.auditFile = join(auditDir, `audit-${date}.jsonl`);

    this.startFlushTimer();

    this.logger.info('Audit logger initialized', {
      auditFile: this.auditFile,
      bufferSize: this.bufferSize,
      flushInterval: this.flushInterval,
    });
  }

  /** @param {any} event @param {any} [options] */
  async log(event, options = {}) {
    const auditEvent = this.createAuditEvent(event, options);

    this.buffer.push(auditEvent);

    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }

    this.logger.info('Audit event logged', {
      eventType: auditEvent.type,
      userId: auditEvent.userId,
      action: auditEvent.action,
      resource: auditEvent.resource,
      correlationId: auditEvent.correlationId,
    });
  }

  /** @param {any} userId @param {boolean} success @param {string} method @param {any} [details] */
  async logAuthAttempt(userId, success, method, details = {}) {
    await this.log({
      type: 'authentication',
      success,
      method,
      userId,
      action: success ? 'login_success' : 'login_failed',
      resource: 'account',
      details: {
        method,
        ...details,
      },
    });
  }

  /** @param {any} userId @param {string} permission @param {string} action @param {any} grantedBy @param {any} [details] */
  async logPermissionChange(userId, permission, action, grantedBy, details = {}) {
    await this.log({
      type: 'authorization',
      userId,
      action,
      resource: 'permissions',
      details: {
        permission,
        grantedBy,
        ...details,
      },
    });
  }

  /** @param {any} userId @param {string} resource @param {string} action @param {any} [details] */
  async logSensitiveDataAccess(userId, resource, action, details = {}) {
    await this.log({
      type: 'data_access',
      severity: 'high',
      userId,
      action,
      resource,
      details: {
        ...this.sanitizeDetails(details),
      },
    });
  }

  /** @param {any} userId @param {string} command @param {any[]} args @param {boolean} success @param {number} duration @param {any} [details] */
  async logCommandExecution(userId, command, args, success, duration, details = {}) {
    await this.log({
      type: 'command',
      userId,
      success,
      action: 'execute',
      resource: command,
      details: {
        args: this.sanitizeArgs(args),
        duration,
        ...this.sanitizeDetails(details),
      },
    });
  }

  /** @param {any} userId @param {string} resource @param {string} action @param {any} changes @param {any} [details] */
  async logDataModification(userId, resource, action, changes, details = {}) {
    await this.log({
      type: 'data_modification',
      severity: 'medium',
      userId,
      action,
      resource,
      details: {
        changes: this.sanitizeChanges(changes),
        ...this.sanitizeDetails(details),
      },
    });
  }

  /** @param {string} event @param {string} [severity] @param {any} [details] */
  async logSecurityEvent(event, severity = 'medium', details = {}) {
    await this.log({
      type: 'security',
      severity,
      action: event,
      resource: 'system',
      details: this.sanitizeDetails(details),
    });
  }

  /** @param {any} userId @param {string} action @param {string} resource @param {any} [details] */
  async logAdminAction(userId, action, resource, details = {}) {
    await this.log({
      type: 'admin',
      severity: 'high',
      userId,
      action,
      resource,
      details: this.sanitizeDetails(details),
    });
  }

  /** @param {any} error @param {any} [context] */
  async logError(error, context = {}) {
    await this.log({
      type: 'error',
      severity: 'high',
      action: 'system_error',
      resource: 'system',
      details: {
        error: {
          name: error.name,
          message: getErrorMessage(error),
          stack: error.stack,
        },
        ...this.sanitizeDetails(context),
      },
    });
  }

  /** @param {any} userId @param {string} method @param {string} endpoint @param {number} statusCode @param {number} duration @param {any} [details] */
  async logApiAccess(userId, method, endpoint, statusCode, duration, details = {}) {
    await this.log({
      type: 'api_access',
      severity: statusCode >= 400 ? 'medium' : 'low',
      userId,
      action: method,
      resource: endpoint,
      details: {
        statusCode,
        duration,
        ...this.sanitizeDetails(details),
      },
    });
  }

  /** @param {any} userId @param {string} configKey @param {any} oldValue @param {any} newValue @param {any} [details] */
  async logConfigChange(userId, configKey, oldValue, newValue, details = {}) {
    await this.log({
      type: 'configuration',
      severity: 'medium',
      userId,
      action: 'config_change',
      resource: configKey,
      details: {
        oldValue: this.sanitizeValue(oldValue),
        newValue: this.sanitizeValue(newValue),
        ...this.sanitizeDetails(details),
      },
    });
  }

  /** @param {any} event @param {any} [options] @returns {any} */
  createAuditEvent(event, options) {
    const now = Date.now();
    const session = this.sessionManager
      ? this.sessionManager.getSession(event.userId, false)
      : null;

    return {
      timestamp: now,
      iso: new Date(now).toISOString(),
      type: event.type || 'general',
      severity: event.severity || 'low',
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      success: event.success !== undefined ? event.success : true,
      duration: event.duration,
      correlationId: event.correlationId || this.generateCorrelationId(),
      sessionId: session ? session.id : null,
      ipAddress: event.ipAddress || this.getClientIP(event),
      userAgent: event.userAgent || this.getUserAgent(event),
      details: event.details || {},
      metadata: {
        ...options.metadata,
        hostname: require('os').hostname(),
        pid: process.pid,
        memory: process.memoryUsage(),
        version: this.configManager?.constant('VERSION'),
      },
    };
  }

  generateCorrelationId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /** @param {any} event @returns {string|null} */
  getClientIP(event) {
    const sources = [
      event?.ipAddress,
      event?.message?.key?.remoteJid,
      event?.connection?.remoteAddress,
      event?.headers?.['x-forwarded-for'],
      event?.headers?.['x-real-ip'],
      event?.socket?.remoteAddress,
      event?.request?.ip,
      event?.request?.socket?.remoteAddress,
      event?.context?.ip,
      event?.context?.clientIP,
    ];

    for (const ip of sources) {
      if (typeof ip === 'string' && ip.trim() !== '') {
        if (ip) {
          const s = String(ip || '');
          if (s.includes(',')) {
            return (s.split(',')[0] || '').trim();
          }
          return s.trim();
        }
      }
    }

    return null;
  }

  /** @param {any} event @returns {string} */
  getUserAgent(event) {
    const sources = [
      event?.userAgent,
      event?.headers?.['user-agent'],
      event?.headers?.['User-Agent'],
      event?.request?.headers?.['user-agent'],
      event?.request?.headers?.['User-Agent'],
      event?.connection?.userAgent,
      event?.socket?.userAgent,
      event?.context?.userAgent,
      event?.context?.clientUserAgent,
      event?.message?.pushName,
      event?.message?.notifyName,
    ];

    for (const userAgent of sources) {
      if (typeof userAgent === 'string' && userAgent.trim() !== '') {
        return userAgent.trim();
      }
    }

    return 'WhatsApp Bot Client';
  }

  /** @param {any} details @returns {Record<string, any>} */
  sanitizeDetails(details) {
    /** @type {Record<string, any>} */
    const sanitized = {};

    for (const [key, value] of Object.entries(details || {})) {
      if (typeof value === 'string' && this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /** @param {string} field @returns {boolean} */
  isSensitiveField(field) {
    const lowerField = String(field || '').toLowerCase();
    return this.sensitiveFields.some((sensitive) => lowerField.includes(sensitive));
  }

  /** @param {any} obj @returns {Record<string, any>} */
  sanitizeObject(obj) {
    /** @type {Record<string, any>} */
    const sanitized = {};

    for (const [key, value] of Object.entries(obj || {})) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item) =>
          typeof item === 'object' ? this.sanitizeObject(item) : item,
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /** @param {any[]} args @returns {any[]} */
  sanitizeArgs(args) {
    return (args || []).map((/** @type {any} */ arg) => {
      if (typeof arg === 'string' && arg.length > 100) {
        return arg.substring(0, 100) + '...';
      }
      return arg;
    });
  }

  /** @param {any} value */
  sanitizeValue(value) {
    if (typeof value === 'string') {
      return value.length > 500 ? value.substring(0, 500) + '...' : value;
    }
    return value;
  }

  /** @param {any} changes @returns {Record<string, any>} */
  sanitizeChanges(changes) {
    /** @type {Record<string, any>} */
    const sanitized = {};

    for (const [key, change] of Object.entries(changes || {})) {
      sanitized[key] = {
        ...change,
        oldValue: this.sanitizeValue(change?.oldValue),
        newValue: this.sanitizeValue(change?.newValue),
      };
    }

    return sanitized;
  }

  async flush() {
    if (this.buffer.length === 0) {
      return;
    }

    const events = [...this.buffer];
    this.buffer = [];

    try {
      const logLines = events.map((event) => JSON.stringify(event)).join('\n');
      if (this.auditFile) appendFileSync(/** @type {string} */ (this.auditFile), logLines + '\n');

      this.logger.debug(`Flushed ${events.length} audit events to ${this.auditFile}`);
    } catch (error) {
      const e = /** @type {any} */ (error);
      this.logger.error('Failed to flush audit events', {
        error: e?.message || String(e),
        eventsCount: events.length,
        auditFile: this.auditFile,
      });

      for (const event of events) {
        try {
          if (this.auditFile)
            appendFileSync(/** @type {string} */ (this.auditFile), JSON.stringify(event) + '\n');
        } catch (retryError) {
          const re = /** @type {any} */ (retryError);
          this.logger.error('Failed to write audit event', {
            error: re?.message || String(re),
            event,
          });
        }
      }
    }
  }

  startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        const e = /** @type {any} */ (error);
        this.logger.error('Audit flush timer error', { error: e?.message || String(e) });
      });
    }, this.flushInterval);
  }

  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  async forceFlush() {
    await this.flush();
  }

  getStats() {
    return {
      bufferSize: this.buffer.length,
      bufferSizeMax: this.bufferSize,
      flushInterval: this.flushInterval,
      auditFile: this.auditFile,
      sensitiveFields: this.sensitiveFields,
      uptime: process.uptime(),
    };
  }

  /** @param {{startDate?:any,endDate?:any,userId?:any,eventType?:any,severity?:any,limit?:number,offset?:number}} [filters] */
  async queryAuditLogs(filters = {}) {
    const {
      startDate,
      endDate,
      userId,
      eventType,
      severity,
      limit = 100,
      offset = 0,
    } = /** @type {any} */ (filters);

    try {
      const auditDir = this.configManager?.constant('AUDIT_LOG_DIR') || './logs/audit';

      if (!existsSync(auditDir)) {
        return {
          events: [],
          total: 0,
          limit,
          offset,
          filters,
        };
      }

      const files = await readdir(auditDir);
      const auditFiles = files
        .filter((file) => file.startsWith('audit-') && file.endsWith('.jsonl'))
        .sort((a, b) => b.localeCompare(a));

      let allEvents = [];

      for (const file of auditFiles) {
        const filePath = join(auditDir, file);
        const content = await readFile(filePath, 'utf8');

        const lines = content
          .trim()
          .split('\n')
          .filter((line) => line.trim());

        for (const line of lines) {
          try {
            const event = JSON.parse(line);
            allEvents.push(event);
          } catch (parseError) {
            const pe = /** @type {any} */ (parseError);
            this.logger?.warn('Failed to parse audit log line', {
              file,
              line: line.substring(0, 100),
              error: pe?.message || String(pe),
            });
          }
        }
      }

      let filteredEvents = allEvents;

      if (startDate) {
        const start = new Date(startDate).getTime();
        filteredEvents = filteredEvents.filter((event) => event.timestamp >= start);
      }

      if (endDate) {
        const end = new Date(endDate).getTime();
        filteredEvents = filteredEvents.filter((event) => event.timestamp <= end);
      }

      if (userId) {
        filteredEvents = filteredEvents.filter((event) => event.userId === userId);
      }

      if (eventType) {
        filteredEvents = filteredEvents.filter((event) => event.type === eventType);
      }

      if (severity) {
        filteredEvents = filteredEvents.filter((event) => event.severity === severity);
      }

      filteredEvents.sort((a, b) => b.timestamp - a.timestamp);

      const total = filteredEvents.length;
      const paginatedEvents = filteredEvents.slice(offset, offset + limit);

      return {
        events: paginatedEvents,
        total,
        limit,
        offset,
        filters,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      const e = /** @type {any} */ (error);
      this.logger?.error('Failed to query audit logs', {
        error: e?.message || String(e),
        filters,
      });

      return {
        events: [],
        total: 0,
        limit,
        offset,
        filters,
        error: e?.message || String(e),
      };
    }
  }

  async getAuditSummary(timeRange = '24h') {
    return {
      timeRange,
      totalEvents: 0,
      eventsByType: {},
      eventsBySeverity: {},
      topUsers: [],
      securityEvents: [],
      errors: [],
    };
  }

  async exportAuditLogs(format = 'json', filters = {}) {
    const logs = await this.queryAuditLogs(filters);

    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      case 'csv':
        return this.convertToCSV(logs.events);
      case 'xml':
        return this.convertToXML(logs.events);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /** @param {any[]} events */
  convertToCSV(events) {
    if (!events || events.length === 0) {
      return '';
    }

    const headers = Object.keys(events[0]).join(',');
    const rows = events.map((event) =>
      Object.values(event)
        .map((value) => (typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value))
        .join(','),
    );

    return [headers, ...rows].join('\n');
  }

  /** @param {any[]} events */
  /** @param {any[]} events */
  convertToXML(events) {
    if (!events || events.length === 0) {
      return '<?xml version="1.0" encoding="UTF-8"?><events></events>';
    }

    const xmlEvents = events
      .map((event) => {
        const xmlElement = Object.entries(event)
          .map(([key, value]) => {
            const xmlValue =
              typeof value === 'string'
                ? value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                : JSON.stringify(value);
            return `<${key}>${xmlValue}</${key}>`;
          })
          .join('');

        return `<event>${xmlElement}</event>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?><events>${xmlEvents}</events>`;
  }

  async rotateLogs() {
    await this.forceFlush();

    const date = new Date().toISOString().split('T')[0];
    if (this.auditFile) {
      this.auditFile = this.auditFile.replace(
        /audit-\d{4}-\d{2}-\d{2}\.jsonl$/,
        `audit-${date}.jsonl`,
      );
    }

    this.logger.info('Audit log rotated', {
      newFile: this.auditFile,
    });
  }

  async cleanOldLogs(retentionDays = 30) {
    const auditDir = this.configManager?.constant('AUDIT_LOG_DIR') || './logs/audit';
    const fs = await import('fs/promises');

    try {
      const files = await fs.readdir(auditDir);
      const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (file.startsWith('audit-') && file.endsWith('.jsonl')) {
          const filePath = join(auditDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            this.logger.info('Deleted old audit log', { file });
          }
        }
      }
    } catch (error) {
      const e = /** @type {any} */ (error);
      this.logger.error('Failed to clean old audit logs', { error: e?.message || String(e) });
    }
  }

  async destroy() {
    this.stopFlushTimer();
    await this.forceFlush();

    this.logger.info('Audit logger destroyed');
  }
}

container.singleton('auditLogger', () => new AuditLogger());

// reference imports to avoid 'declared but never read' (kept intentionally)
void stat;
void writeFileSync;
