import { EventEmitter } from 'events';
import { container } from '../core/container.js';

export class MetricsCollector extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, any>} */
    this.metrics = new Map();
    /** @type {Map<string, number>} */
    this.counters = new Map();
    /** @type {Map<string, number[]>} */
    this.timers = new Map();
    /** @type {Map<string, {count:number,sum:number,min:number,max:number,values:number[]}>} */
    this.histograms = new Map();
    /** @type {Map<string, number>} */
    this.gauges = new Map();
    /** @type {any|null} */
    this.logger = null;
    /** @type {any|null} */
    this.configManager = null;
    /** @type {any|null} */
    this.collectionInterval = null;
    this.startTime = Date.now();
  }

  async initialize() {
    this.logger = container.resolve('logger');
    this.configManager = container.resolve('configManager');

    this.startCollection();

    this.logger.info('Metrics collector initialized');
  }

  startCollection() {
    const interval = 60000;

    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, interval);
  }

  stopCollection() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  /** @param {string} name @param {number} [value] @param {Record<string,string>} [tags] */
  /** @param {string} name @param {number} [value] @param {Record<string,string>} [tags] */
  incrementCounter(name, value = 1, tags = {}) {
    const key = this.createKey(name, /** @type {any} */ (tags));

    if (!this.counters.has(key)) {
      this.counters.set(key, 0);
    }

    const current = /** @type {number} */ (this.counters.get(key) || 0);
    this.counters.set(key, current + value);

    this.emit('metric:increment', { name, value, tags, timestamp: Date.now() });
  }

  /** @param {string} name @param {number} duration @param {Record<string,string>} [tags] */
  /** @param {string} name @param {number} duration @param {Record<string,string>} [tags] */
  recordTimer(name, duration, tags = {}) {
    const key = this.createKey(name, /** @type {any} */ (tags));

    if (!this.timers.has(key)) {
      this.timers.set(key, []);
    }

    const arr = /** @type {number[]} */ (this.timers.get(key) || []);
    arr.push(duration);
    this.timers.set(key, arr);

    this.emit('metric:timer', { name, duration, tags, timestamp: Date.now() });
  }

  /** @param {string} name @param {number} value @param {Record<string,string>} [tags] */
  /** @param {string} name @param {number} value @param {Record<string,string>} [tags] */
  recordHistogram(name, value, tags = {}) {
    const key = this.createKey(name, /** @type {any} */ (tags));

    if (!this.histograms.has(key)) {
      this.histograms.set(key, {
        count: 0,
        sum: 0,
        min: value,
        max: value,
        values: [],
      });
    }

    const histogram = /** @type {any} */ (this.histograms.get(key));
    if (histogram) {
      histogram.count++;
      histogram.sum += value;
      histogram.values.push(value);

      if (value < histogram.min) histogram.min = value;
      if (value > histogram.max) histogram.max = value;
    }

    this.emit('metric:histogram', { name, value, tags, timestamp: Date.now() });
  }

  /** @param {string} name @param {number} value @param {Record<string,string>} [tags] */
  /** @param {string} name @param {number} value @param {Record<string,string>} [tags] */
  setGauge(name, value, tags = {}) {
    const key = this.createKey(name, /** @type {any} */ (tags));
    this.gauges.set(key, value);

    this.emit('metric:gauge', { name, value, tags, timestamp: Date.now() });
  }

  /** @param {string} name @param {any} value @param {Record<string,string>} [tags] */
  /** @param {string} name @param {any} value @param {Record<string,string>} [tags] */
  recordMetric(name, value, tags = {}) {
    const key = this.createKey(name, /** @type {any} */ (tags));
    this.metrics.set(key, {
      value,
      timestamp: Date.now(),
      tags,
    });

    this.emit('metric:record', { name, value, tags, timestamp: Date.now() });
  }

  /** @param {string} name @param {Record<string,string>} [tags] */
  /** @param {string} name @param {Record<string,string>} [tags] */
  getCounter(name, tags = {}) {
    const key = this.createKey(name, /** @type {any} */ (tags));
    return this.counters.get(key) || 0;
  }

  /** @param {string} name @param {Record<string,string>} [tags] */
  /** @param {string} name @param {Record<string,string>} [tags] */
  getTimerStats(name, tags = {}) {
    const key = this.createKey(name, /** @type {any} */ (tags));
    const values = this.timers.get(key) || [];

    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const median = this.calculatePercentile(sorted, 0.5);

    return {
      count,
      sum,
      mean,
      median,
      min: sorted[0],
      max: sorted[count - 1],
      p95: this.calculatePercentile(sorted, 0.95),
      p99: this.calculatePercentile(sorted, 0.99),
    };
  }

  /** @param {string} name @param {Record<string,string>} [tags] */
  /** @param {string} name @param {Record<string,string>} [tags] */
  getHistogramStats(name, tags = {}) {
    const key = this.createKey(name, /** @type {any} */ (tags));
    const histogram = this.histograms.get(key);

    if (!histogram) {
      return null;
    }

    const sorted = [...histogram.values].sort((a, b) => a - b);

    return {
      count: histogram.count,
      sum: histogram.sum,
      mean: histogram.sum / histogram.count,
      min: histogram.min,
      max: histogram.max,
      median: this.calculatePercentile(sorted, 0.5),
      p95: this.calculatePercentile(sorted, 0.95),
      p99: this.calculatePercentile(sorted, 0.99),
    };
  }

  /** @param {string} name @param {Record<string,string>} [tags] */
  /** @param {string} name @param {Record<string,string>} [tags] */
  getGauge(name, tags = {}) {
    const key = this.createKey(name, /** @type {any} */ (tags));
    return this.gauges.get(key);
  }

  getAllMetrics() {
    return {
      counters: Object.fromEntries(this.counters),
      timers: Object.fromEntries(
        Array.from(this.timers.keys()).map((key) => {
          const [name, tags] = this.parseKey(key);
          return [key, this.getTimerStats(name, tags)];
        }),
      ),
      histograms: Object.fromEntries(
        Array.from(this.histograms.keys()).map((key) => {
          const [name, tags] = this.parseKey(key);
          return [key, this.getHistogramStats(name, tags)];
        }),
      ),
      gauges: Object.fromEntries(this.gauges),
      metrics: Object.fromEntries(this.metrics),
      uptime: Date.now() - this.startTime,
    };
  }

  /** @param {string} pattern */
  /** @param {string} pattern */
  getMetricsByPattern(pattern) {
    const regex = new RegExp(pattern);
    /** @type {{counters:Record<string,number>,timers:Record<string,any>,histograms:Record<string,any>,gauges:Record<string,number>,metrics:Record<string,any>}} */
    const result = {
      counters: {},
      timers: {},
      histograms: {},
      gauges: {},
      metrics: {},
    };

    for (const [key, value] of this.counters) {
      if (regex.test(key)) {
        result.counters[key] = value;
      }
    }

    for (const [key] of this.timers) {
      if (regex.test(key)) {
        const [n, t] = this.parseKey(key);
        result.timers[key] = this.getTimerStats(n, t);
      }
    }

    for (const [key] of this.histograms) {
      if (regex.test(key)) {
        const [n, t] = this.parseKey(key);
        result.histograms[key] = this.getHistogramStats(n, t);
      }
    }

    for (const [key, value] of this.gauges) {
      if (regex.test(key)) {
        result.gauges[key] = value;
      }
    }

    for (const [key, value] of this.metrics) {
      if (regex.test(key)) {
        result.metrics[key] = value;
      }
    }

    return result;
  }

  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.setGauge('system.memory.used', memUsage.heapUsed);
    this.setGauge('system.memory.total', memUsage.heapTotal);
    this.setGauge('system.memory.external', memUsage.external);
    this.setGauge('system.uptime', process.uptime());

    if (this.lastCpuUsage) {
      const cpuPercent =
        (cpuUsage.user - this.lastCpuUsage.user + (cpuUsage.system - this.lastCpuUsage.system)) /
        1000000;
      this.setGauge('system.cpu.usage', cpuPercent);
    }

    this.lastCpuUsage = cpuUsage;

    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000;
      this.recordHistogram('system.event_loop.lag', lag);
    });
  }

  reset() {
    this.counters.clear();
    this.timers.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.metrics.clear();

    this.emit('metrics:reset', { timestamp: Date.now() });
    this.logger.info('All metrics reset');
  }

  /** @param {string} pattern */
  resetByPattern(pattern) {
    const regex = new RegExp(pattern);

    for (const key of this.counters.keys()) {
      if (regex.test(key)) {
        this.counters.delete(key);
      }
    }

    for (const key of this.timers.keys()) {
      if (regex.test(key)) {
        this.timers.delete(key);
      }
    }

    for (const key of this.histograms.keys()) {
      if (regex.test(key)) {
        this.histograms.delete(key);
      }
    }

    for (const key of this.gauges.keys()) {
      if (regex.test(key)) {
        this.gauges.delete(key);
      }
    }

    for (const key of this.metrics.keys()) {
      if (regex.test(key)) {
        this.metrics.delete(key);
      }
    }

    this.emit('metrics:reset:pattern', { pattern, timestamp: Date.now() });
    this.logger.info(`Metrics reset for pattern: ${pattern}`);
  }

  /** @param {string} name @param {Record<string,string>} tags */
  createKey(name, tags) {
    const tagString = Object.keys(tags || {})
      .sort()
      .map((key) => `${key}=${tags[key]}`)
      .join(',');

    return tagString ? `${name}{${tagString}}` : name;
  }

  /**
   * Parse a metric key into name and tags tuple.
   * @param {string} key
   * @returns {[string, Record<string,string>]}
   */
  parseKey(key) {
    const match = key.match(/^(.+?)\{(.*)\}$/);
    if (!match) {
      return [key, {}];
    }

    const name = String(match[1]);
    const tagString = match[2];
    /** @type {Record<string,string>} */
    const tags = {};

    if (tagString) {
      tagString.split(',').forEach((pair) => {
        if (typeof pair !== 'string' || pair.trim() === '') return;
        const parts = pair.split('=');
        const k = parts[0];
        if (!k) return;
        const v = parts.slice(1).join('=');
        const vstr = v === undefined ? '' : String(v);
        tags[String(k)] = vstr;
      });
    }

    return [name, tags];
  }

  /** @param {number[]} sortedValues @param {number} percentile */
  calculatePercentile(sortedValues, percentile) {
    if (!sortedValues || sortedValues.length === 0) return 0;

    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  getPerformanceSummary() {
    const allMetrics = this.getAllMetrics();

    return {
      uptime: allMetrics.uptime,
      system: {
        memory: {
          used: this.getGauge('system.memory.used'),
          total: this.getGauge('system.memory.total'),
          usage:
            (this.getGauge('system.memory.total') || 0) > 0
              ? ((this.getGauge('system.memory.used') || 0) /
                  (this.getGauge('system.memory.total') || 1)) *
                100
              : 0,
        },
        cpu: {
          usage: this.getGauge('system.cpu.usage'),
          uptime: this.getGauge('system.uptime'),
        },
        eventLoop: this.getHistogramStats('system.event_loop.lag'),
      },
      commands: {
        total: this.getCounter('commands.total'),
        success: this.getCounter('commands.success'),
        error: this.getCounter('commands.error'),
        avgResponseTime: this.getTimerStats('commands.response_time')?.mean || 0,
      },
      database: {
        queries: this.getCounter('database.queries'),
        connections: this.getGauge('database.connections'),
        avgResponseTime: this.getTimerStats('database.query_time')?.mean || 0,
      },
      cache: {
        hits: this.getCounter('cache.hits'),
        misses: this.getCounter('cache.misses'),
        hitRate: this.calculateHitRate(),
      },
    };
  }

  calculateHitRate() {
    const hits = this.getCounter('cache.hits');
    const misses = this.getCounter('cache.misses');
    const total = hits + misses;

    return total > 0 ? (hits / total) * 100 : 0;
  }

  exportPrometheus() {
    const metrics = this.getAllMetrics();
    let output = '';

    for (const [key, value] of Object.entries(metrics.counters)) {
      output += `# TYPE counter counter\n`;
      output += `counter_total{${this.getKeyLabels(key)}} ${value}\n`;
    }

    for (const [key, value] of Object.entries(metrics.gauges)) {
      output += `# TYPE gauge gauge\n`;
      output += `gauge_value{${this.getKeyLabels(key)}} ${value}\n`;
    }

    for (const [key, histogram] of Object.entries(metrics.histograms)) {
      if (!histogram) continue;
      output += `# TYPE histogram histogram\n`;
      output += `histogram_count{${this.getKeyLabels(key)}} ${histogram.count}\n`;
      output += `histogram_sum{${this.getKeyLabels(key)}} ${histogram.sum}\n`;
      output += `histogram_bucket{${this.getKeyLabels(key)},le="+Infinity"} ${histogram.max}\n`;
    }

    return output;
  }

  /** @param {string} key */
  getKeyLabels(key) {
    const [, tags] = this.parseKey(key);
    const labelPairs = Object.entries(tags).map(([k, v]) => `${k}="${v}"`);
    return labelPairs.length > 0 ? `{${labelPairs.join(',')}}` : '';
  }

  destroy() {
    this.stopCollection();
    this.reset();
    this.removeAllListeners();

    this.logger.info('Metrics collector destroyed');
  }
}

container.singleton('metricsCollector', () => new MetricsCollector());
