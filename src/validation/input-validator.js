import { container } from '../core/container.js'
import { ValidationError } from '../core/errors.js'

export class InputValidator {
  constructor() {
    this.logger = null
    this.configManager = null
    this.schemas = new Map()
  }

  async initialize() {
    this.logger = container.resolve('logger')
    this.configManager = container.resolve('configManager')
  }

  registerSchema(name, schema) {
    this.schemas.set(name, schema)
    this.logger.debug(`Validation schema registered: ${name}`)
  }

  validate(input, schemaName, options = {}) {
    const schema = this.schemas.get(schemaName)
    if (!schema) {
      throw new ValidationError('schema', schemaName, `Schema '${schemaName}' not found`)
    }

    const { strict = true, context = {} } = options
    const result = this.validateAgainstSchema(input, schema, strict, context)

    if (!result.valid) {
      throw new ValidationError('validation', input, result.errors.join(', '))
    }

    return result.data
  }

  validateAgainstSchema(input, schema, strict = true, context = {}) {
    const errors = []
    const data = {}

    for (const [field, rules] of Object.entries(schema)) {
      const value = input[field]
      const fieldErrors = this.validateField(field, value, rules, context)

      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors.map(err => `${field}: ${err}`))
      } else {
        data[field] = this.processValue(value, rules)
      }
    }

    if (strict) {
      for (const field of Object.keys(input)) {
        if (!schema[field]) {
          errors.push(`${field}: unexpected field`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data,
    }
  }

  validateField(field, value, rules, context) {
    const errors = []

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push('required field is missing or empty')
      return errors
    }

    if ((value === undefined || value === null) && !rules.required) {
      return errors
    }

    if (rules.type) {
      const typeError = this.validateType(field, value, rules.type)
      if (typeError) {
        errors.push(typeError)
      }
    }

    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`minimum length is ${rules.minLength}`)
      }

      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`maximum length is ${rules.maxLength}`)
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push('does not match required pattern')
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`must be one of: ${rules.enum.join(', ')}`)
      }

      if (rules.noWhitespace && /\s/.test(value)) {
        errors.push('cannot contain whitespace')
      }

      if (rules.trim) {
        value = value.trim()
      }
    }

    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`minimum value is ${rules.min}`)
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(`maximum value is ${rules.max}`)
      }

      if (rules.positive && value <= 0) {
        errors.push('must be positive')
      }

      if (rules.integer && !Number.isInteger(value)) {
        errors.push('must be an integer')
      }
    }

    if (Array.isArray(value)) {
      if (rules.minItems !== undefined && value.length < rules.minItems) {
        errors.push(`minimum items is ${rules.minItems}`)
      }

      if (rules.maxItems !== undefined && value.length > rules.maxItems) {
        errors.push(`maximum items is ${rules.maxItems}`)
      }

      if (rules.unique && new Set(value).size !== value.length) {
        errors.push('all items must be unique')
      }
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (rules.properties) {
        for (const [subField, subRules] of Object.entries(rules.properties)) {
          const subValue = value[subField]
          const subErrors = this.validateField(`${field}.${subField}`, subValue, subRules, context)

          if (subErrors.length > 0) {
            errors.push(...subErrors.map(err => `${subField}: ${err}`))
          }
        }
      }

      if (rules.additionalProperties === false) {
        const allowedKeys = new Set(Object.keys(rules.properties || {}))
        const actualKeys = Object.keys(value)

        for (const key of actualKeys) {
          if (!allowedKeys.has(key)) {
            errors.push(`${key}: unexpected property`)
          }
        }
      }
    }

    if (rules.validate && typeof rules.validate === 'function') {
      try {
        const customResult = rules.validate(value, field, context)
        if (customResult !== true) {
          errors.push(customResult || 'custom validation failed')
        }
      } catch (error) {
        errors.push(`validation error: ${error.message}`)
      }
    }

    if (rules.when) {
      const condition = this.evaluateCondition(rules.when, context)
      if (condition) {
        const conditionalErrors = this.validateField(field, value, rules.then, context)
        errors.push(...conditionalErrors)
      } else if (rules.else) {
        const elseErrors = this.validateField(field, value, rules.else, context)
        errors.push(...elseErrors)
      }
    }

    return errors
  }

  validateType(field, value, expectedType) {
    const actualType = Array.isArray(value) ? 'array' : typeof value

    if (actualType !== expectedType) {
      return `expected ${expectedType}, got ${actualType}`
    }

    return null
  }

  processValue(value, rules) {
    if (typeof value === 'string') {
      if (rules.lowercase) {
        return value.toLowerCase()
      }

      if (rules.uppercase) {
        return value.toUpperCase()
      }

      if (rules.trim) {
        return value.trim()
      }
    }

    if (typeof value === 'number') {
      if (rules.round) {
        return Math.round(value)
      }

      if (rules.floor) {
        return Math.floor(value)
      }

      if (rules.ceil) {
        return Math.ceil(value)
      }
    }

    return value
  }
  evaluateCondition(condition, context) {
    if (typeof condition === 'function') {
      return condition(context)
    }

    if (typeof condition === 'object') {
      const { field, operator, value } = condition
      const contextValue = this.getNestedValue(context, field)

      switch (operator) {
        case '==':
          return contextValue == value
        case '===':
          return contextValue === value
        case '!=':
          return contextValue != value
        case '!==':
          return contextValue !== value
        case '>':
          return contextValue > value
        case '>=':
          return contextValue >= value
        case '<':
          return contextValue < value
        case '<=':
          return contextValue <= value
        case 'in':
          return Array.isArray(value) && value.includes(contextValue)
        case 'not_in':
          return Array.isArray(value) && !value.includes(contextValue)
        default:
          return false
      }
    }

    return false
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  validateUserId(userId, options = {}) {
    const schema = {
      type: 'string',
      required: true,
      pattern: /^\d+@s\.whatsapp\.net$/,
      minLength: 15,
      maxLength: 30,
    }

    return this.validate({ userId }, 'userId', options)
  }

  validateCommandArgs(args, schema, options = {}) {
    const validationSchema = {
      type: 'array',
      minItems: schema.minItems || 0,
      maxItems: schema.maxItems || 10,
    }

    const result = this.validate({ args }, 'commandArgs', {
      ...options,
      strict: false,
    })

    if (!result.valid) {
      return result
    }

    const itemErrors = []
    const validatedArgs = []

    for (let i = 0; i < args.length; i++) {
      const argSchema = schema.items ? schema.items[i] : schema.itemSchema

      if (argSchema) {
        const argResult = this.validate({ [`arg${i}`]: args[i] }, `arg${i}`, options)

        if (!argResult.valid) {
          itemErrors.push(...argResult.errors)
        }

        validatedArgs.push(argResult.data[`arg${i}`])
      } else {
        validatedArgs.push(args[i])
      }
    }

    if (itemErrors.length > 0) {
      return {
        valid: false,
        errors: itemErrors,
        data: { args: validatedArgs },
      }
    }

    return {
      valid: true,
      errors: [],
      data: { args: validatedArgs },
    }
  }

  validateAmount(amount, options = {}) {
    const { min = 0, max = 1000000, allowZero = true } = options

    const schema = {
      type: 'number',
      required: true,
      min: allowZero ? min : Math.max(min, 1),
      max,
      integer: true,
    }

    return this.validate({ amount }, 'amount', options)
  }

  validatePagination(pagination, options = {}) {
    const schema = {
      type: 'object',
      properties: {
        page: {
          type: 'number',
          min: 1,
          integer: true,
          default: 1,
        },
        limit: {
          type: 'number',
          min: 1,
          max: 100,
          integer: true,
          default: 20,
        },
        offset: {
          type: 'number',
          min: 0,
          integer: true,
        },
      },
      additionalProperties: false,
    }

    return this.validate(pagination, 'pagination', options)
  }

  validateFilter(filter, options = {}) {
    const schema = {
      type: 'object',
      properties: {
        where: {
          type: 'object',
          additionalProperties: true,
        },
        orderBy: {
          type: 'string',
          enum: ['id', 'created_at', 'updated_at', 'name', 'balance', 'bank'],
        },
        order: {
          type: 'string',
          enum: ['asc', 'desc'],
          default: 'asc',
        },
        limit: {
          type: 'number',
          min: 1,
          max: 100,
          integer: true,
        },
        offset: {
          type: 'number',
          min: 0,
          integer: true,
        },
      },
      additionalProperties: false,
    }

    return this.validate(filter, 'filter', options)
  }

  validateMessage(message, options = {}) {
    const { maxLength = 4096, allowEmpty = false } = options

    const schema = {
      type: 'string',
      required: !allowEmpty,
      maxLength,
      trim: true,
    }

    return this.validate({ message }, 'message', options)
  }

  validateJID(jid, options = {}) {
    const { type = 'any' } = options

    let schema
    switch (type) {
      case 'user':
        schema = {
          type: 'string',
          required: true,
          pattern: /^\d+@s\.whatsapp\.net$/,
        }
        break
      case 'group':
        schema = {
          type: 'string',
          required: true,
          pattern: /^\d+@g\.us$/,
        }
        break
      case 'broadcast':
        schema = {
          type: 'string',
          required: true,
          pattern: /^\d+@broadcast$/,
        }
        break
      default:
        schema = {
          type: 'string',
          required: true,
          pattern: /^\d+(@s\.whatsapp\.net|@g\.us|@broadcast)$/,
        }
    }

    return this.validate({ jid }, 'jid', options)
  }

  validateConfig(config, schemaName, options = {}) {
    const schema = this.schemas.get(schemaName)
    if (!schema) {
      throw new ValidationError('schema', schemaName, `Config schema '${schemaName}' not found`)
    }

    return this.validate(config, schemaName, {
      ...options,
      context: { type: 'config' },
    })
  }

  sanitizeString(input, options = {}) {
    const { stripHtml = true, escapeHtml = false, maxLength = null } = options

    if (typeof input !== 'string') {
      return input
    }

    let sanitized = input

    if (stripHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '')
    }

    if (escapeHtml) {
      const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }

      sanitized = sanitized.replace(/[&<>"']/g, match => htmlEscapes[match])
    }

    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')

    sanitized = sanitized.trim()

    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength)
    }

    return sanitized
  }

  validateAndSanitizeInput(input, schemaName, options = {}) {
    const { sanitize = true, sanitizeOptions = {} } = options

    const validationResult = this.validate(input, schemaName, options)

    if (!validationResult.valid) {
      throw new ValidationError('input', input, validationResult.errors.join(', '))
    }

    if (sanitize && typeof validationResult.data === 'string') {
      validationResult.data = this.sanitizeString(validationResult.data, sanitizeOptions)
    }

    return validationResult.data
  }

  getSchemas() {
    return Array.from(this.schemas.keys())
  }

  getSchema(name) {
    return this.schemas.get(name)
  }

  removeSchema(name) {
    return this.schemas.delete(name)
  }

  createValidationMiddleware(schemaName, options = {}) {
    return context => {
      try {
        if (context.args && context.args.length > 0) {
          context.args = this.validateCommandArgs(context.args, this.getSchema(schemaName), options).data.args
        }

        return context
      } catch (error) {
        context.helpers.text(`❌ Validation error: ${error.message}`)
        context.stop()
        return context
      }
    }
  }

  createRateLimitValidator(maxRequests, windowMs) {
    const requests = new Map()

    return userId => {
      const now = Date.now()
      const userRequests = requests.get(userId) || []

      const validRequests = userRequests.filter(time => now - time < windowMs)

      if (validRequests.length >= maxRequests) {
        throw new ValidationError(
          'rate_limit',
          userId,
          `Rate limit exceeded: ${maxRequests} requests per ${windowMs}ms`
        )
      }

      validRequests.push(now)
      requests.set(userId, validRequests)

      return true
    }
  }
}

container.singleton('inputValidator', () => new InputValidator())
