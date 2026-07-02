declare module 'baileys' {
  export interface ILogger {
    level: string;
    trace: (obj: unknown, msg?: string) => void;
    debug: (obj: unknown, msg?: string) => void;
    info: (obj: unknown, msg?: string) => void;
    warn: (obj: unknown, msg?: string) => void;
    error: (obj: unknown, msg?: string) => void;
    child: (bindings: Record<string, unknown>) => ILogger;
  }
}

export {};
