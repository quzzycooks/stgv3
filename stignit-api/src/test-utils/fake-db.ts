/**
 * Minimal chainable stand-in for the Drizzle `Db` handle, for unit tests.
 *
 * Drizzle query builders are thenable; awaiting one resolves to rows. This fake
 * intercepts the whole chain and, on `await`, returns the next queued result:
 *  - select()/selectDistinct() → next `onSelect` value (default [])
 *  - insert()/update()/delete() with `.returning()` → next `onWrite` (default [{}]);
 *    without `.returning()` → resolves undefined (no queue consumed)
 *  - execute() → `{ rows: next onExecute value }` (default [])
 *
 * Queue values in the exact order the service awaits them.
 */
export class FakeDb {
  private selectResults: unknown[] = [];
  private writeResults: unknown[] = [];
  private executeResults: unknown[] = [];

  onSelect(...r: unknown[]): this {
    this.selectResults.push(...r);
    return this;
  }
  onWrite(...r: unknown[]): this {
    this.writeResults.push(...r);
    return this;
  }
  onExecute(...r: unknown[]): this {
    this.executeResults.push(...r);
    return this;
  }

  private shift(a: unknown[]): unknown {
    return a.length ? a.shift() : undefined;
  }

  private chain(kind: 'select' | 'write'): any {
    let returningCalled = false;
    const self = this;
    const proxy: any = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === 'then') {
          const val =
            kind === 'select'
              ? (self.shift(self.selectResults) ?? [])
              : returningCalled
                ? (self.shift(self.writeResults) ?? [{}])
                : undefined;
          return (res: any, rej: any) => Promise.resolve(val).then(res, rej);
        }
        if (prop === 'returning') {
          returningCalled = true;
          return () => proxy;
        }
        return () => proxy;
      },
      apply: () => proxy,
    });
    return proxy;
  }

  select() {
    return this.chain('select');
  }
  selectDistinct() {
    return this.chain('select');
  }
  insert() {
    return this.chain('write');
  }
  update() {
    return this.chain('write');
  }
  delete() {
    return this.chain('write');
  }
  async execute() {
    return { rows: this.shift(this.executeResults) ?? [] };
  }
}
