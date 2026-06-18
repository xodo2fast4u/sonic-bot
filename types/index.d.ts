export interface SonicConfig {
  prefix: string;
  ownerNumber: string;
  botName: string;
  version: string;
  authDir: string;
  environment: 'development' | 'production' | 'test';
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  constants: CONSTANTS;
}

export interface CONSTANTS {
  DB_CONNECTION_TIMEOUT: number;
  DB_MAX_CONNECTIONS: number;
  DB_QUERY_TIMEOUT: number;

  COOLDOWN_GLOBAL_DURATION: number;
  COOLDOWN_WARN_THRESHOLD: number;
  COOLDOWN_IGNORE_THRESHOLD: number;

  DAILY_COOLDOWN: number;
  WORK_COOLDOWN: number;
  BEG_COOLDOWN: number;

  JOB_MIN_PAYOUT: number;
  JOB_MAX_PAYOUT: number;

  MAX_MESSAGE_LENGTH: number;
  MAX_MENTIONS: number;

  CACHE_TTL_USER: number;
  CACHE_TTL_COMMANDS: number;
  CACHE_TTL_PERMISSIONS: number;

  MAX_CONCURRENT_COMMANDS: number;
  COMMAND_TIMEOUT: number;

  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX_REQUESTS: number;
}

export interface SonicErrorData {
  name: string;
  message: string;
  code: string;
  context: Record<string, any>;
  correlationId: string;
  timestamp: string;
  severity: 'fatal' | 'error' | 'warn' | 'info';
  stack?: string;
}

export interface ValidationError {
  field: string;
  value: any;
  reason: string;
}

export interface User {
  id: string;
  balance: number;
  bank: number;
  totalEarned: number;
  createdAt: number;
  totalWealth: number;
}

export interface InventoryItem {
  userId: string;
  itemName: string;
  quantity: number;
}

export interface Transaction {
  id?: number;
  fromId?: string;
  toId?: string;
  amount: number;
  type: string;
  timestamp: number;
}

export interface QueryOptions {
  where?: Record<string, any>;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface Command {
  cmd: string[];
  desc: string;
  run: (helpers: CommandHelpers, args: string[]) => Promise<void>;
  category?: string;
  ownerOnly?: boolean;
  adminOnly?: boolean;
  cooldown?: number;
  fileName?: string;
  loadedAt?: number;
}

export interface CommandHelpers {
  text: (message: string) => Promise<void>;
  mention: (text: string, mentions: string[]) => Promise<void>;
  react: (emoji: string, key?: any) => Promise<void>;
  edit: (key: any, text: string) => Promise<void>;
  image: (url: string, caption?: string) => Promise<void>;
  sonic: any;
  msg: any;
}

export interface CommandMetadata {
  category: string;
  fileName: string;
  loaded: boolean;
  loadTime: number;
  accessCount: number;
  lastAccessed: number | null;
  commandCount: number;
}

export interface MiddlewareContext {
  helpers: CommandHelpers;
  args: string[];
  command: Command;
  user: string;
  message: any;
  correlationId: string;
  startTime: number;
  data: Map<string, any>;
  stopped: boolean;
  result: any;
}

export type MiddlewareFunction = (context: MiddlewareContext) => Promise<void>;

export interface CacheEntry {
  key: string;
  value: any;
  createdAt: number;
  ttl: number | null;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  expirations: number;
  memoryUsage: {
    estimatedBytes: number;
    estimatedMB: number;
  };
}

export interface CacheOptions {
  maxSize?: number;
  cleanupInterval?: number;
  defaultTTL?: number;
}

export interface UserSession {
  userId: string;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  permissions: Set<string>;
  metadata: Map<string, any>;
  groupMemberships: Set<string>;
  adminGroups: Set<string>;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  expiredSessions: number;
  totalAccessCount: number;
  uniquePermissions: string[];
  totalGroupMemberships: number;
}

export interface CooldownEntry {
  userId: string;
  command: string;
  duration: number;
  startTime: number;
  endTime: number;
  usageCount: number;
  lastUsed: number;
}

export interface CooldownResult {
  allowed: boolean;
  remaining: number;
  action: 'warn' | 'react' | 'ignore' | 'none';
}

export interface WhatsAppMessage {
  key: {
    remoteJid: string;
    id: string;
    participant?: string;
    participantAlt?: string;
    remoteJidAlt?: string;
  };
  message?: any;
  messageTimestamp?: number;
  pushName?: string;
}

export interface WhatsAppSocket {
  sendMessage: (jid: string, content: any, options?: any) => Promise<any>;
  ev: any;
  authState: {
    creds: any;
  };
}

export interface JIDUtils {
  decode: (rawJid: string) => any;
  encode: (user: string, server: string, device?: string, agent?: string) => string;
  toUser: (num: string) => string;
  fromUser: (jidStr: string) => string;
  isGroup: (jidStr: string) => boolean;
  isPN: (jidStr: string) => boolean;
  isLID: (jidStr: string) => boolean;
  isNewsletter: (jidStr: string) => boolean;
  isStatus: (jidStr: string) => boolean;
  isBot: (jidStr: string) => boolean;
  isMetaAI: (jidStr: string) => boolean;
  getSender: (msg: WhatsAppMessage) => string;
  getParticipantNumber: (participant: any) => string;
  normalize: (jidStr: string) => string;
}

export interface SendUtils {
  text: (sonic: WhatsAppSocket, msg: WhatsAppMessage, text: string) => Promise<void>;
  mention: (
    sonic: WhatsAppSocket,
    msg: WhatsAppMessage,
    text: string,
    mentions: string[],
  ) => Promise<void>;
  edit: (sonic: WhatsAppSocket, msg: WhatsAppMessage, key: any, text: string) => Promise<void>;
  react: (sonic: WhatsAppSocket, msg: WhatsAppMessage, emoji: string, key?: any) => Promise<void>;
  image: (
    sonic: WhatsAppSocket,
    msg: WhatsAppMessage,
    url: string,
    caption?: string,
  ) => Promise<void>;
}

export interface EventData {
  name: string;
  data: any;
  timestamp: number;
  correlationId: string;
  source: string;
}

export interface EventFilter {
  [key: string]: any;
}

export interface LogData {
  [key: string]: any;
  correlationId?: string;
}

export interface PerformanceMetrics {
  commands: Map<string, CommandMetric>;
  database: Map<string, OperationMetric>;
  network: Map<string, OperationMetric>;
  errors: Map<string, number>;
  uptime: number;
}

export interface CommandMetric {
  count: number;
  totalTime: number;
  errors: number;
  avgTime: number;
  errorRate: number;
}

export interface OperationMetric {
  count: number;
  totalTime: number;
  errors: number;
  avgTime: number;
  errorRate: number;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  version: string;
  checks: HealthCheckResult[];
}

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration?: number;
  message?: string;
  details?: Record<string, any>;
}

export interface SystemMetrics {
  timestamp: number;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  database: {
    connections: number;
    queries: number;
    avgResponseTime: number;
  };
  cache: {
    hitRate: number;
    size: number;
    memoryUsage: number;
  };
  commands: {
    total: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface Job {
  name: string;
  emoji: string;
  min: number;
  max: number;
  messages: string[];
}

export interface Migration {
  version: string;
  description: string;
  up: string;
  down: string;
  timestamp: string;
}

export interface MigrationStatus {
  currentVersion: string | null;
  totalMigrations: number;
  executedMigrations: number;
  pendingMigrations: number;
  executed: Array<{
    version: string;
    description: string;
    executed_at: number;
  }>;
  pending: Array<{
    version: string;
    description: string;
  }>;
}

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: string[];
  min?: number;
  max?: number;
  default?: any;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: any;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  responseTime?: number;
  error?: string;
}

export interface ServiceRegistry {
  register: (name: string, service: any) => void;
  get: (name: string) => any;
  list: () => string[];
  health: () => Promise<ServiceHealth[]>;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (context: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

export interface AuditLog {
  id?: string;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  timestamp: number;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: number;
    version: string;
  };
}

export interface APIRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export type Timer = {
  end: (success?: boolean, data?: any) => number;
};

export type EventHandler<T = any> = (data: T) => void | Promise<void>;

export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;

export type SyncFunction<T = any> = (...args: any[]) => T;
