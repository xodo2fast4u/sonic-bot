import { EventEmitter } from 'events';
import { container } from './container.js';
import { getErrorMessage } from '../utils/error-message.js';

export class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
    /** @type {Array<(eventData: any) => void | Promise<void>>} */
    this.middleware = [];
    /** @type {any|null} */
    this.logger = null;
  }

  async initialize() {
    this.logger = container.resolve('logger');
    this.logger.info('EventBus initialized');
  }

  /** @param {(eventData: any) => void | Promise<void>} middleware */
  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * @param {string} eventName
   * @param {any} data
   * @param {{ correlationId?: string; source?: string }} [options]
   */
  async emitEvent(eventName, data, options = {}) {
    const eventData = {
      name: eventName,
      data,
      timestamp: Date.now(),
      correlationId: options.correlationId || this.generateCorrelationId(),
      source: options.source || 'unknown',
    };

    try {
      for (const middleware of this.middleware) {
        await middleware(eventData);
      }

      this.emit(eventName, eventData);
      this.emit('*', eventData);

      this.logger.debug(`Event emitted: ${eventName}`, {
        correlationId: eventData.correlationId,
        source: eventData.source,
      });
    } catch (error) {
      this.logger.error(`Event processing failed: ${eventName}`, {
        error: getErrorMessage(error),
      });
      this.emit('event:error', { eventName, error, eventData });
    }
  }

  /**
   * @param {string} eventName
   * @param {(eventData: any) => void} listener
   * @param {((eventData: any) => boolean)|null} [filter]
   */
  subscribe(eventName, listener, filter = null) {
    /** @param {any} eventData */
    const wrappedListener = (eventData) => {
      if (typeof filter === 'function' && !filter(eventData)) {
        return;
      }
      listener(eventData);
    };

    this.on(eventName, wrappedListener);

    return () => {
      this.off(eventName, wrappedListener);
    };
  }

  /**
   * @param {string} eventName
   * @param {(eventData: any) => void} listener
   * @param {((eventData: any) => boolean)|null} [filter]
   */
  subscribeOnce(eventName, listener, filter = null) {
    /** @param {any} eventData */
    const wrappedListener = (eventData) => {
      if (typeof filter === 'function' && !filter(eventData)) {
        return;
      }
      listener(eventData);
    };

    this.once(eventName, wrappedListener);
  }

  /** @param {Record<string, any>} conditions */
  createFilter(conditions) {
    /** @param {any} eventData */
    return (eventData) => {
      return Object.entries(conditions).every(([key, value]) => {
        return eventData[key] === value || eventData.data?.[key] === value;
      });
    };
  }

  generateCorrelationId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    return {
      listenerCount: this.eventNames().reduce(
        (count, eventName) => count + this.listenerCount(eventName),
        0,
      ),
      middlewareCount: this.middleware.length,
      eventNames: this.eventNames(),
    };
  }

  clear() {
    this.removeAllListeners();
    this.middleware = [];
    this.logger?.info('EventBus cleared');
  }
}

container.singleton('eventBus', () => new EventBus());
