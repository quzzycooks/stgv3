/**
 * Minimal in-memory Redis stand-in covering the commands used by OtpService and
 * TokenService. Not a full Redis; just enough for deterministic unit tests
 * (TTLs are tracked but not auto-expired unless expireNow() is called).
 */
export class FakeRedis {
  private store = new Map<string, string>();
  private sets = new Map<string, Set<string>>();
  private ttls = new Map<string, number>();

  async set(key: string, val: string, ...args: any[]): Promise<'OK' | null> {
    const nx = args.includes('NX');
    if (nx && this.store.has(key)) return null;
    this.store.set(key, val);
    const exIdx = args.indexOf('EX');
    if (exIdx >= 0) this.ttls.set(key, args[exIdx + 1]);
    return 'OK';
  }
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const k of keys) {
      if (this.store.delete(k)) n++;
      if (this.sets.delete(k)) n++;
      this.ttls.delete(k);
    }
    return n;
  }
  async exists(key: string): Promise<number> {
    return this.store.has(key) || this.sets.has(key) ? 1 : 0;
  }
  async ttl(key: string): Promise<number> {
    return this.ttls.get(key) ?? -1;
  }
  async incr(key: string): Promise<number> {
    const v = parseInt(this.store.get(key) ?? '0', 10) + 1;
    this.store.set(key, String(v));
    return v;
  }
  async expire(key: string, sec: number): Promise<number> {
    this.ttls.set(key, sec);
    return 1;
  }
  async sadd(key: string, member: string): Promise<number> {
    const s = this.sets.get(key) ?? new Set<string>();
    const had = s.has(member);
    s.add(member);
    this.sets.set(key, s);
    return had ? 0 : 1;
  }
  async srem(key: string, member: string): Promise<number> {
    return this.sets.get(key)?.delete(member) ? 1 : 0;
  }
  async smembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) ?? [])];
  }

  multi() {
    const ops: Array<() => Promise<unknown>> = [];
    const chain: any = {
      set: (...a: any[]) => (ops.push(() => this.set(...(a as [string, string]))), chain),
      del: (...a: string[]) => (ops.push(() => this.del(...a)), chain),
      sadd: (k: string, m: string) => (ops.push(() => this.sadd(k, m)), chain),
      srem: (k: string, m: string) => (ops.push(() => this.srem(k, m)), chain),
      expire: (k: string, s: number) => (ops.push(() => this.expire(k, s)), chain),
      exec: async () => {
        const res: Array<[null, unknown]> = [];
        for (const op of ops) res.push([null, await op()]);
        return res;
      },
    };
    return chain;
  }
}
