declare module 'better-sqlite3' {
  class Statement {
    run(...params: any[]): any;
    get(...params: any[]): any;
    all(...params: any[]): any[];
    iterate(...params: any[]): IterableIterator<any>;
  }

  export default class Database {
    constructor(path: string, options?: any);
    prepare(sql: string): Statement;
    exec(sql: string): Database;
    pragma(sql: string): any;
    transaction<T extends (...args: any[]) => any>(fn: T): T;
    close(): void;
  }
}
