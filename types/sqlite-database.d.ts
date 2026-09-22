export interface SqliteStatement {
  run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
  get(...params: any[]): any;
  all(...params: any[]): any[];
  iterate(...params: any[]): IterableIterator<any>;
}

export interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  exec(sql: string): SqliteDatabase;
  pragma(source: string): void;
  transaction<T extends (...args: any[]) => any>(fn: T): T;
  close(): void;
  readonly isTransaction: boolean;
}
