import { container } from '../core/container.js';
import { ValidationError } from '../core/errors.js';

/**
 * @typedef {{
 *   type?: string,
 *   required?: boolean,
 *   minLength?: number,
 *   maxLength?: number,
 *   pattern?: RegExp,
 *   enum?: string[],
 *   min?: number,
 *   max?: number,
 *   positive?: boolean,
 *   integer?: boolean,
 *   minItems?: number,
 *   maxItems?: number,
 *   unique?: boolean,
 *   properties?: Record<string, FieldRules>,
 *   additionalProperties?: boolean,
 *   validate?: (value: any, field: string, context: Record<string, any>) => boolean|string,
 *   when?: Record<string, any>|((context: Record<string, any>) => boolean),
 *   then?: FieldRules,
 *   else?: FieldRules,
 *   noWhitespace?: boolean,
 *   trim?: boolean,
 *   lowercase?: boolean,
 *   uppercase?: boolean,
 *   round?: boolean,
 *   floor?: boolean,
 *   ceil?: boolean,
 *   items?: FieldRules[],
 *   itemSchema?: FieldRules,
 *   default?: any,
 * }} FieldRules
 * @typedef {Record<string, FieldRules>} Schema
 * @typedef {{valid: boolean, errors: string[], data: Record<string, any>}} ValidationResult
 * @typedef {{strict?: boolean, context?: Record<string, any>, sanitize?: boolean, sanitizeOptions?: Record<string, any>}} ValidateOptions
 */

export class InputValidator {
  constructor() {
    /** @type {any} */
    this.logger = null;
    /** @type {any} */
    this.configManager = null;
    /** @type {Map<string, Schema>} */
    this.schemas = new Map();
  }

  /** Initialize dependencies from the container */
  async initialize() {
    this.logger = container.resolve('logger');
    this.configManager = container.resolve('configManager');
  }

  /** @param {string} name @param {Schema} schema */
  registerSchema(name, schema) {
    this.schemas.set(name, schema);
    this.logger.debug(`Validation schema registered: ${name}`);
  }

  /** @param {Record<string, any>} input @param {string} schemaName @param {ValidateOptions} [options]
   * @returns {Record<string, any>}
   */
  validate(input, schemaName, options = {}) {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      throw new ValidationError('schema', schemaName, `Schema '${schemaName}' not found`);
    }

    const { strict = true, context = {} } = options;
    const result = this.validateAgainstSchema(input, schema, strict, context);

    if (!result.valid) {
      throw new ValidationError('validation', input, result.errors.join(', '));
    }

    return result.data;
  }

  /** @param {Record<string, any>} input @param {Schema} schema @param {boolean} [strict] @param {Record<string, any>} [context]
   * @returns {ValidationResult}
   */
  validateAgainstSchema(input, schema, strict = true, context = {}) {
    /** @type {string[]} */
    const errors = [];
    /** @type {Record<string, any>} */
    const data = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = input[field];
      /** @type {string[]} */
      const fieldErrors = this.validateField(field, value, rules, context);

      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors.map((/** @type {string} */ err) => `${field}: ${err}`));
      } else {
        data[field] = this.processValue(value, rules);
      }
    }

    if (strict) {
      for (const field of Object.keys(input)) {
        if (!(field in schema)) {
          errors.push(`${field}: unexpected field`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      data,
    };
  }

  /** @param {string} field @param {any} value @param {FieldRules} rules @param {Record<string, any>} [context]
   * @returns {string[]}
   */
  validateField(field, value, rules, context) {
    /** @type {string[]} */
    const errors = [];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push('required field is missing or empty');
      return errors;
    }

    if ((value === undefined || value === null) && !rules.required) {
      return errors;
    }

    if (rules.type) {
      const typeError = this.validateType(field, value, rules.type);
      if (typeError) {
        errors.push(typeError);
      }
    }

    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`minimum length is ${rules.minLength}`);
      }

      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`maximum length is ${rules.maxLength}`);
      }

      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push('does not match required pattern');
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`must be one of: ${rules.enum.join(', ')}`);
      }

      if (rules.noWhitespace && /\s/.test(value)) {
        errors.push('cannot contain whitespace');
      }

      if (rules.trim) {
        value = value.trim();
      }
    }

    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`minimum value is ${rules.min}`);
      }

      if (rules.max !== undefined && value > rules.max) {
        errors.push(`maximum value is ${rules.max}`);
      }

      if (rules.positive && value <= 0) {
        errors.push('must be positive');
      }

      if (rules.integer && !Number.isInteger(value)) {
        errors.push('must be an integer');
      }
    }

    if (Array.isArray(value)) {
      if (rules.minItems !== undefined && value.length < rules.minItems) {
        errors.push(`minimum items is ${rules.minItems}`);
      }

      if (rules.maxItems !== undefined && value.length > rules.maxItems) {
        errors.push(`maximum items is ${rules.maxItems}`);
      }

      if (rules.unique && new Set(value).size !== value.length) {
        errors.push('all items must be unique');
      }
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (rules.properties) {
        for (const [subField, subRules] of Object.entries(rules.properties)) {
          const subValue = value[subField];
          /** @type {string[]} */
          const subErrors = this.validateField(`${field}.${subField}`, subValue, subRules, context);

          if (subErrors.length > 0) {
            errors.push(...subErrors.map((/** @type {string} */ err) => `${subField}: ${err}`));
          }
        }
      }

      if (rules.additionalProperties === false) {
        const allowedKeys = new Set(Object.keys(rules.properties || {}));
        const actualKeys = Object.keys(value);

        for (const key of actualKeys) {
          if (!allowedKeys.has(key)) {
            errors.push(`${key}: unexpected property`);
          }
        }
      }
    }

    if (rules.validate && typeof rules.validate === 'function') {
      try {
        const customResult = rules.validate(value, field, context ?? {});
        if (customResult !== true) {
          errors.push(customResult || 'custom validation failed');
        }
      } catch (/** @type {any} */ error) {
        errors.push(`validation error: ${error.message}`);
      }
    }

    if (rules.when) {
      const condition = this.evaluateCondition(rules.when, context ?? {});
      if (condition && rules.then) {
        /** @type {string[]} */
        const conditionalErrors = this.validateField(field, value, rules.then, context);
        errors.push(...conditionalErrors);
      } else if (rules.else) {
        /** @type {string[]} */
        const elseErrors = this.validateField(field, value, rules.else, context);
        errors.push(...elseErrors);
      }
    }

    return errors;
  }

  /** @param {string} field @param {any} value @param {string} expectedType */
  validateType(field, value, expectedType) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (actualType !== expectedType) {
      return `field ${field}: expected ${expectedType}, got ${actualType}`;
    }

    return null;
  }

  /** @param {any} value @param {FieldRules} rules @returns {any} */
  processValue(value, rules) {
    if (typeof value === 'string') {
      if (rules.lowercase) {
        return value.toLowerCase();
      }

      if (rules.uppercase) {
        return value.toUpperCase();
      }

      if (rules.trim) {
        return value.trim();
      }
    }

    if (typeof value === 'number') {
      if (rules.round) {
        return Math.round(value);
      }

      if (rules.floor) {
        return Math.floor(value);
      }

      if (rules.ceil) {
        return Math.ceil(value);
      }
    }

    return value;
  }
  /** @param {Record<string, any>|((context: Record<string, any>) => boolean)} condition @param {Record<string, any>} context @returns {boolean} */
  evaluateCondition(condition, context) {
    if (typeof condition === 'function') {
      return condition(context);
    }

    if (typeof condition === 'object') {
      const { field, operator, value } = condition;
      const contextValue = this.getNestedValue(context, field);

      switch (operator) {
        case '==':
          return contextValue == value;
        case '===':
          return contextValue === value;
        case '!=':
          return contextValue != value;
        case '!==':
          return contextValue !== value;
        case '>':
          return contextValue > value;
        case '>=':
          return contextValue >= value;
        case '<':
          return contextValue < value;
        case '<=':
          return contextValue <= value;
        case 'in':
          return Array.isArray(value) && value.includes(contextValue);
        case 'not_in':
          return Array.isArray(value) && !value.includes(contextValue);
        default:
          return false;
      }
    }

    return false;
  }

  /** @param {Record<string, any>} obj @param {string} path @returns {any} */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /** @param {string} userId @param {ValidateOptions} [options] @returns {Record<string, any>} */
  validateUserId(userId, options = {}) {
    const schema = {
      userId: {
        type: 'string',
        required: true,
        pattern: /^\d+@s\.whatsapp\.net$/,
        minLength: 15,
        maxLength: 30,
      },
    };

    if (!this.schemas.has('userId')) this.registerSchema('userId', schema);

    return this.validate({ userId }, 'userId', options);
  }

  /** @param {any[]} args @param {FieldRules} schema @param {ValidateOptions} [options] @returns {ValidationResult} */
  validateCommandArgs(args, schema, options = {}) {
    const validationSchema = {
      args: {
        type: 'array',
        minItems: schema.minItems || 0,
        maxItems: schema.maxItems || 10,
      },
    };

    if (!this.schemas.has('commandArgs')) {
      this.registerSchema('commandArgs', validationSchema);
    }

    const result = this.validateAgainstSchema(
      { args },
      validationSchema,
      false,
      options.context ?? {},
    );

    if (!result.valid) {
      return result;
    }

    /** @type {string[]} */
    const itemErrors = [];
    /** @type {any[]} */
    const validatedArgs = [];

    for (let i = 0; i < args.length; i++) {
      const argSchema = schema.items ? schema.items[i] : schema.itemSchema;

      if (argSchema) {
        const argFieldSchema = { [`arg${i}`]: argSchema };
        const argResult = this.validateAgainstSchema(
          { [`arg${i}`]: args[i] },
          argFieldSchema,
          true,
          options.context ?? {},
        );

        if (!argResult.valid) {
          itemErrors.push(...argResult.errors);
        } else {
          validatedArgs.push(argResult.data[`arg${i}`]);
        }
      } else {
        validatedArgs.push(args[i]);
      }
    }

    if (itemErrors.length > 0) {
      return {
        valid: false,
        errors: itemErrors,
        data: { args: validatedArgs },
      };
    }

    return {
      valid: true,
      errors: [],
      data: { args: validatedArgs },
    };
  }

  /** @param {number} amount @param {{min?: number, max?: number, allowZero?: boolean} & ValidateOptions} [options] @returns {Record<string, any>} */
  validateAmount(amount, options = {}) {
    const { min = 0, max = 1000000, allowZero = true } = options;

    const schema = {
      amount: {
        type: 'number',
        required: true,
        min: allowZero ? min : Math.max(min, 1),
        max,
        integer: true,
      },
    };

    if (!this.schemas.has('amount')) this.registerSchema('amount', schema);

    return this.validate({ amount }, 'amount', options);
  }

  /** @param {Record<string, any>} pagination @param {ValidateOptions} [options] @returns {Record<string, any>} */
  validatePagination(pagination, options = {}) {
    /** @type {Schema} */
    const schema = {
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
    };

    if (!this.schemas.has('pagination')) this.registerSchema('pagination', schema);

    return this.validate(pagination, 'pagination', options);
  }

  /** @param {Record<string, any>} filter @param {ValidateOptions} [options] @returns {Record<string, any>} */
  validateFilter(filter, options = {}) {
    /** @type {Schema} */
    const schema = {
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
    };

    if (!this.schemas.has('filter')) this.registerSchema('filter', schema);

    return this.validate(filter, 'filter', options);
  }

  /** @param {string} message @param {{maxLength?: number, allowEmpty?: boolean} & ValidateOptions} [options] @returns {Record<string, any>} */
  validateMessage(message, options = {}) {
    const { maxLength = 4096, allowEmpty = false } = options;

    const schema = {
      message: {
        type: 'string',
        required: !allowEmpty,
        maxLength,
        trim: true,
      },
    };

    if (!this.schemas.has('message')) this.registerSchema('message', schema);

    return this.validate({ message }, 'message', options);
  }

  /** @param {string} jid @param {{type?: 'user'|'group'|'broadcast'|'any'} & ValidateOptions} [options] @returns {Record<string, any>} */
  validateJID(jid, options = {}) {
    const { type = 'any' } = options;

    /** @type {FieldRules} */
    let fieldSchema;
    switch (type) {
      case 'user':
        fieldSchema = {
          type: 'string',
          required: true,
          pattern: /^\d+@s\.whatsapp\.net$/,
        };
        break;
      case 'group':
        fieldSchema = {
          type: 'string',
          required: true,
          pattern: /^\d+@g\.us$/,
        };
        break;
      case 'broadcast':
        fieldSchema = {
          type: 'string',
          required: true,
          pattern: /^\d+@broadcast$/,
        };
        break;
      default:
        fieldSchema = {
          type: 'string',
          required: true,
          pattern: /^\d+(@s\.whatsapp\.net|@g\.us|@broadcast)$/,
        };
    }

    const schema = { jid: fieldSchema };

    if (!this.schemas.has('jid')) this.registerSchema('jid', schema);

    return this.validate({ jid }, 'jid', options);
  }

  /** @param {Record<string, any>} config @param {string} schemaName @param {ValidateOptions} [options] @returns {Record<string, any>} */
  validateConfig(config, schemaName, options = {}) {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      throw new ValidationError('schema', schemaName, `Config schema '${schemaName}' not found`);
    }

    return this.validate(config, schemaName, {
      ...options,
      context: { type: 'config' },
    });
  }

  /** @param {string} input @param {{stripHtml?: boolean, escapeHtml?: boolean, maxLength?: number|null}} [options] @returns {string} */
  sanitizeString(input, options = {}) {
    const { stripHtml = true, escapeHtml = false, maxLength = null } = options;

    if (typeof input !== 'string') {
      return input;
    }

    let sanitized = input;

    if (stripHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    if (escapeHtml) {
      /** @type {Record<string, string>} */
      const htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };

      sanitized = sanitized.replace(
        /[&<>"']/g,
        (/** @type {string} */ match) => htmlEscapes[match] ?? match,
      );
    }

    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

    sanitized = sanitized.trim();

    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /** @param {Record<string, any>} input @param {string} schemaName @param {ValidateOptions} [options] @returns {any} */
  validateAndSanitizeInput(input, schemaName, options = {}) {
    const { sanitize = true, sanitizeOptions = {}, strict = true, context = {} } = options;

    const schema = this.schemas.get(schemaName);
    if (!schema) {
      throw new ValidationError('schema', schemaName, `Schema '${schemaName}' not found`);
    }

    const result = this.validateAgainstSchema(input, schema, strict, context);

    if (!result.valid) {
      throw new ValidationError('input', input, result.errors.join(', '));
    }

    /** @type {Record<string, any>} */
    const data = { ...result.data };

    if (sanitize) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          data[key] = this.sanitizeString(value, sanitizeOptions);
        }
      }
    }

    return data;
  }

  getSchemas() {
    return Array.from(this.schemas.keys());
  }
  /** @param {string} name @returns {Schema|undefined} */
  getSchema(name) {
    return this.schemas.get(name);
  }

  /** @param {string} name */
  removeSchema(name) {
    return this.schemas.delete(name);
  }

  /** @param {string} schemaName @param {ValidateOptions} [options] @returns {(context: Record<string, any>) => Record<string, any>} */
  createValidationMiddleware(schemaName, options = {}) {
    return (/** @type {Record<string, any>} */ context) => {
      try {
        const schema = this.getSchema(schemaName);
        if (context['args'] && context['args'].length > 0 && schema) {
          context['args'] = this.validateCommandArgs(
            context['args'],
            /** @type {FieldRules} */ (/** @type {unknown} */ (schema)),
            options,
          ).data['args'];
        }

        return context;
      } catch (/** @type {any} */ error) {
        context['helpers'].text(`❌ Validation error: ${error.message}`);
        context['stop']();
        return context;
      }
    };
  }

  /** @param {number} maxRequests @param {number} windowMs @returns {(userId: string) => boolean} */
  createRateLimitValidator(maxRequests, windowMs) {
    const requests = new Map();

    return (userId) => {
      const now = Date.now();
      const userRequests = requests.get(userId) || [];

      const validRequests = userRequests.filter(
        (/** @type {number} */ time) => now - time < windowMs,
      );

      if (validRequests.length >= maxRequests) {
        throw new ValidationError(
          'rate_limit',
          userId,
          `Rate limit exceeded: ${maxRequests} requests per ${windowMs}ms`,
        );
      }

      validRequests.push(now);
      requests.set(userId, validRequests);

      return true;
    };
  }
}

container.singleton('inputValidator', () => new InputValidator());
