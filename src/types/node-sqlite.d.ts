declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    prepare(sql: string): {
      get(...parameters: unknown[]): unknown;
      all(...parameters: unknown[]): unknown[];
      run(...parameters: unknown[]): unknown;
    };
    exec(sql: string): void;
    close(): void;
  }

  export function backup(database: DatabaseSync, path: string): Promise<unknown> | unknown;
}
