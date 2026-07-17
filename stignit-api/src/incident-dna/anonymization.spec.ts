import { anonymizePayload, sessionToken } from './anonymization';

describe('incident DNA anonymization (PRD 6.9.3)', () => {
  const KEY = 'test-anon-key';

  it('is deterministic within an incident, unlinkable across incidents', () => {
    const a1 = sessionToken('I1', 'user-1', KEY);
    const a1b = sessionToken('I1', 'user-1', KEY);
    const a1_i2 = sessionToken('I2', 'user-1', KEY);
    expect(a1).toBe(a1b); // stable within incident
    expect(a1).not.toBe(a1_i2); // different incident → different token
    expect(sessionToken('I1', 'user-2', KEY)).not.toBe(a1); // different user
  });

  it('does not leak the raw user id', () => {
    expect(sessionToken('I1', 'user-1', KEY)).not.toContain('user-1');
  });

  it('tokenizes all user-id fields in a payload, leaves others intact', () => {
    const out = anonymizePayload(
      'I1',
      { userId: 'user-1', targetUserId: 'user-2', role: 'COORDINATOR', count: 3 },
      KEY,
    );
    expect(out.userId).toBe(sessionToken('I1', 'user-1', KEY));
    expect(out.targetUserId).toBe(sessionToken('I1', 'user-2', KEY));
    expect(out.role).toBe('COORDINATOR');
    expect(out.count).toBe(3);
  });
});
