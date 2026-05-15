import { EventEmitter } from 'events'

export class Container extends EventEmitter {
  constructor() {
    super()
    this.services = new Map()
    this.singletons = new Map()
    this.factories = new Map()
  }

  register(name, factory, options = {}) {
    this.factories.set(name, { factory, options })
    return this
  }

  singleton(name, factory) {
    return this.register(name, factory, { singleton: true })
  }

  transient(name, factory) {
    return this.register(name, factory, { singleton: false })
  }

  resolve(name) {
    const factoryInfo = this.factories.get(name)
    if (!factoryInfo) {
      throw new Error(`Service '${name}' not registered`)
    }

    const { factory, options } = factoryInfo

    if (options.singleton) {
      if (!this.singletons.has(name)) {
        const instance = factory(this)
        this.singletons.set(name, instance)
        this.emit('service:created', { name, instance, singleton: true })
      }
      return this.singletons.get(name)
    }

    const instance = factory(this)
    this.emit('service:created', { name, instance, singleton: false })
    return instance
  }

  has(name) {
    return this.factories.has(name)
  }

  getRegisteredServices() {
    return Array.from(this.factories.keys())
  }

  clear() {
    this.services.clear()
    this.singletons.clear()
    this.factories.clear()
    this.emit('container:cleared')
  }
}

export const container = new Container()

export const Service = (name, options = {}) => {
  return target => {
    container.register(name, () => new target(), options)
    return target
  }
}

export const Singleton = name => {
  return Service(name, { singleton: true })
}

export const Transient = name => {
  return Service(name, { singleton: false })
}
