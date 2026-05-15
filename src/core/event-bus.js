import { EventEmitter } from 'events'
import { container } from './container.js'

export class EventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(100)
    this.middleware = []
    this.logger = null
  }

  async initialize() {
    this.logger = container.resolve('logger')
    this.logger.info('EventBus initialized')
  }
  use(middleware) {
    this.middleware.push(middleware)
    return this
  }

  async emitEvent(eventName, data, options = {}) {
    const eventData = {
      name: eventName,
      data,
      timestamp: Date.now(),
      correlationId: options.correlationId || this.generateCorrelationId(),
      source: options.source || 'unknown',
    }

    try {
      for (const middleware of this.middleware) {
        await middleware(eventData)
      }

      this.emit(eventName, eventData)
      this.emit('*', eventData)

      this.logger.debug(`Event emitted: ${eventName}`, {
        correlationId: eventData.correlationId,
        source: eventData.source,
      })
    } catch (error) {
      this.logger.error(`Event processing failed: ${eventName}`, error)
      this.emit('event:error', { eventName, error, eventData })
    }
  }

  subscribe(eventName, listener, filter = null) {
    const wrappedListener = eventData => {
      if (!filter || filter(eventData)) {
        listener(eventData)
      }
    }

    this.on(eventName, wrappedListener)

    return () => {
      this.off(eventName, wrappedListener)
    }
  }

  subscribeOnce(eventName, listener, filter = null) {
    const wrappedListener = eventData => {
      if (!filter || filter(eventData)) {
        listener(eventData)
      }
    }

    this.once(eventName, wrappedListener)
  }

  createFilter(conditions) {
    return eventData => {
      return Object.entries(conditions).every(([key, value]) => {
        return eventData[key] === value || eventData.data?.[key] === value
      })
    }
  }

  generateCorrelationId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  getStats() {
    return {
      listenerCount: this.listenerCount(),
      middlewareCount: this.middleware.length,
      eventNames: this.eventNames(),
    }
  }

  clear() {
    this.removeAllListeners()
    this.middleware = []
    this.logger?.info('EventBus cleared')
  }
}

container.singleton('eventBus', () => new EventBus())
