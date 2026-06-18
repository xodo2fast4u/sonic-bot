import { container } from '../core/container.js';

export class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.logger = null;
    this.metricsCollector = null;
    this.connectionPool = null;
    this.cache = null;
    this.configManager = null;
  }

  async initialize() {
    this.logger = container.resolve('logger');
    this.metricsCollector = container.resolve('metricsCollector');
    this.connectionPool = container.resolve('connectionPool');
    this.cache = container.resolve('cache');
    this.configManager = container.resolve('configManager');

    this.registerDefaultChecks();
  }

  registerCheck(name, checkFunction, timeout = 5000) {
    this.checks.set(name, {
      name,
      check: checkFunction,
      timeout,
    });
  }

  removeCheck(name) {
    return this.checks.delete(name);
  }

  async runAllChecks() {
    const startTime = Date.now();
    const results = [];

    for (const [name, healthCheck] of this.checks) {
      const result = await this.runSingleCheck(name, healthCheck);
      results.push(result);
    }

    const overallStatus = this.calculateOverallStatus(results);
    const duration = Date.now() - startTime;

    this.metricsCollector.recordTimer('health.check.duration', duration);
    this.metricsCollector.setGauge('health.check.status', overallStatus === 'pass' ? 1 : 0);
    this.metricsCollector.incrementCounter('health.check.total');

    return {
      status: overallStatus,
      timestamp: startTime,
      uptime: process.uptime(),
      version: this.configManager.constant('VERSION'),
      duration,
      checks: results,
    };
  }

  async runSingleCheck(name, healthCheck) {
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        healthCheck.check(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), healthCheck.timeout),
        ),
      ]);

      const duration = Date.now() - startTime;
      const status = result.pass ? 'pass' : 'fail';

      this.metricsCollector.recordTimer(`health.check.${name}.duration`, duration);
      this.metricsCollector.setGauge(`health.check.${name}.status`, status === 'pass' ? 1 : 0);

      return {
        name,
        status,
        duration,
        message: result.message || '',
        details: result.details || {},
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.metricsCollector.recordTimer(`health.check.${name}.duration`, duration);
      this.metricsCollector.incrementCounter(`health.check.${name}.errors`);
      this.metricsCollector.setGauge(`health.check.${name}.status`, 0);

      return {
        name,
        status: 'fail',
        duration,
        message: error.message,
        details: { error: error.stack },
      };
    }
  }

  calculateOverallStatus(results) {
    const hasFailure = results.some((result) => result.status === 'fail');
    const hasWarning = results.some((result) => result.status === 'warn');

    if (hasFailure) {
      return 'unhealthy';
    } else if (hasWarning) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  registerDefaultChecks() {
    this.registerCheck(
      'database',
      async () => {
        if (!this.connectionPool) {
          return { pass: false, message: 'Database connection pool not initialized' };
        }

        const stats = this.connectionPool.getStats();

        if (stats.totalConnections === 0) {
          return { pass: false, message: 'No database connections available' };
        }

        if (stats.activeConnections / stats.totalConnections > 0.9) {
          return { pass: false, message: 'Database connection pool nearly exhausted' };
        }

        try {
          await this.connectionPool.get('SELECT 1');
          return {
            pass: true,
            details: stats,
          };
        } catch (error) {
          return {
            pass: false,
            message: `Database query failed: ${error.message}`,
          };
        }
      },
      10000,
    );

    this.registerCheck(
      'cache',
      async () => {
        if (!this.cache) {
          return { pass: false, message: 'Cache not initialized' };
        }

        const stats = this.cache.getStats();

        if (stats.size === 0) {
          return { pass: false, message: 'Cache is empty' };
        }

        try {
          const testKey = `health:test:${Date.now()}`;
          await this.cache.set(testKey, 'test', 1000);
          const retrieved = await this.cache.get(testKey);
          await this.cache.delete(testKey);

          if (retrieved !== 'test') {
            return { pass: false, message: 'Cache read/write test failed' };
          }

          return {
            pass: true,
            details: stats,
          };
        } catch (error) {
          return {
            pass: false,
            message: `Cache operation failed: ${error.message}`,
          };
        }
      },
      5000,
    );

    this.registerCheck(
      'memory',
      async () => {
        const memUsage = process.memoryUsage();
        const totalMemory = memUsage.heapTotal;
        const usedMemory = memUsage.heapUsed;
        const memoryUsage = (usedMemory / totalMemory) * 100;

        const warningThreshold = this.configManager.constant('MEMORY_WARNING_THRESHOLD') || 80;
        const criticalThreshold = this.configManager.constant('MEMORY_CRITICAL_THRESHOLD') || 90;

        if (memoryUsage >= criticalThreshold) {
          return {
            pass: false,
            message: `Memory usage critical: ${memoryUsage.toFixed(2)}%`,
            details: {
              used: usedMemory,
              total: totalMemory,
              usage: memoryUsage,
            },
          };
        } else if (memoryUsage >= warningThreshold) {
          return {
            pass: false,
            status: 'warn',
            message: `Memory usage high: ${memoryUsage.toFixed(2)}%`,
            details: {
              used: usedMemory,
              total: totalMemory,
              usage: memoryUsage,
            },
          };
        }

        return {
          pass: true,
          details: {
            used: usedMemory,
            total: totalMemory,
            usage: memoryUsage,
          },
        };
      },
      3000,
    );

    this.registerCheck(
      'cpu',
      async () => {
        const cpuUsage = process.cpuUsage();
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to percentage

        const warningThreshold = this.configManager.constant('CPU_WARNING_THRESHOLD') || 70;
        const criticalThreshold = this.configManager.constant('CPU_CRITICAL_THRESHOLD') || 85;

        if (cpuPercent >= criticalThreshold) {
          return {
            pass: false,
            message: `CPU usage critical: ${cpuPercent.toFixed(2)}%`,
            details: {
              user: cpuUsage.user,
              system: cpuUsage.system,
              usage: cpuPercent,
            },
          };
        } else if (cpuPercent >= warningThreshold) {
          return {
            pass: false,
            status: 'warn',
            message: `CPU usage high: ${cpuPercent.toFixed(2)}%`,
            details: {
              user: cpuUsage.user,
              system: cpuUsage.system,
              usage: cpuPercent,
            },
          };
        }

        return {
          pass: true,
          details: {
            user: cpuUsage.user,
            system: cpuUsage.system,
            usage: cpuPercent,
          },
        };
      },
      3000,
    );

    this.registerCheck(
      'event_loop',
      async () => {
        const start = process.hrtime.bigint();

        await new Promise((resolve) => setImmediate(resolve));

        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds

        const warningThreshold = this.configManager.constant('EVENT_LOOP_WARNING_LAG') || 10;
        const criticalThreshold = this.configManager.constant('EVENT_LOOP_CRITICAL_LAG') || 25;

        if (lag >= criticalThreshold) {
          return {
            pass: false,
            message: `Event loop lag critical: ${lag.toFixed(2)}ms`,
            details: { lag },
          };
        } else if (lag >= warningThreshold) {
          return {
            pass: false,
            status: 'warn',
            message: `Event loop lag high: ${lag.toFixed(2)}ms`,
            details: { lag },
          };
        }

        return {
          pass: true,
          details: { lag },
        };
      },
      2000,
    );

    this.registerCheck(
      'filesystem',
      async () => {
        const fs = await import('fs/promises');

        try {
          const testFile = './health-test.tmp';
          await fs.writeFile(testFile, 'test');
          await fs.unlink(testFile);

          return { pass: true };
        } catch (error) {
          return {
            pass: false,
            message: `File system error: ${error.message}`,
          };
        }
      },
      3000,
    );

    this.registerCheck(
      'dependencies',
      async () => {
        const dependencies = [
          { name: 'better-sqlite3', module: 'better-sqlite3' },
          { name: 'baileys', module: 'baileys' },
          { name: 'uuid', module: 'uuid' },
          { name: '@cacheable/node-cache', module: '@cacheable/node-cache' },
        ];

        const results = [];

        for (const dep of dependencies) {
          try {
            await import(dep.module);
            results.push({ name: dep.name, status: 'available' });
          } catch (error) {
            results.push({
              name: dep.name,
              status: 'unavailable',
              error: error.message,
            });
          }
        }

        const unavailable = results.filter((r) => r.status === 'unavailable');

        if (unavailable.length > 0) {
          return {
            pass: false,
            message: 'Some dependencies unavailable',
            details: { dependencies: results },
          };
        }

        return {
          pass: true,
          details: { dependencies: results },
        };
      },
      5000,
    );
  }

  getSummary() {
    return {
      totalChecks: this.checks.size,
      checkNames: Array.from(this.checks.keys()),
      lastRun: this.metricsCollector.getGauge('health.check.last_run'),
      averageDuration: this.metricsCollector.getTimerStats('health.check.duration')?.mean || 0,
    };
  }

  getCheck(name) {
    return this.checks.get(name);
  }

  getAllChecks() {
    return Array.from(this.checks.entries()).map(([name, check]) => ({
      name,
      timeout: check.timeout,
    }));
  }

  async runCheck(name) {
    const healthCheck = this.checks.get(name);
    if (!healthCheck) {
      throw new Error(`Health check '${name}' not found`);
    }

    return await this.runSingleCheck(name, healthCheck);
  }

  async getHealthJSON() {
    const health = await this.runAllChecks();

    return JSON.stringify(health, null, 2);
  }

  async getHealthHTTP() {
    const health = await this.runAllChecks();

    let statusCode = 200;
    if (health.status === 'degraded') {
      statusCode = 200;
    } else if (health.status === 'unhealthy') {
      statusCode = 503;
    }

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/health+json',
        'Cache-Control': 'no-cache',
        'X-Health-Status': health.status,
      },
      body: health,
    };
  }

  async createLivenessProbe() {
    return {
      status: 'pass',
      timestamp: Date.now(),
      uptime: process.uptime(),
    };
  }

  async createReadinessProbe() {
    const criticalChecks = ['database', 'cache'];
    const results = [];

    for (const checkName of criticalChecks) {
      const check = this.checks.get(checkName);
      if (check) {
        const result = await this.runSingleCheck(checkName, check);
        results.push(result);
      }
    }

    const overallStatus = this.calculateOverallStatus(results);

    return {
      status: overallStatus,
      timestamp: Date.now(),
      checks: results,
    };
  }
}

container.singleton('healthChecker', () => new HealthChecker());
