import { ForbiddenException } from '@nestjs/common';
import { AccessLevel, IncidentStatus } from '../database/enums';
import { FakeDb } from '../test-utils/fake-db';
import { BreakoutRoomService } from './breakout-room.service';

/** Tier-gating / access-control tests for Breakout Room posting (PRD 6.6.2). */
describe('BreakoutRoomService', () => {
  function build(opts: {
    tier: AccessLevel;
    muted?: boolean;
    isParticipant?: boolean;
    incidentStatus?: IncidentStatus;
  }) {
    const { tier, muted = false, isParticipant = true, incidentStatus = IncidentStatus.ACTIVE } = opts;
    // await order: incident (status), participant, user (tier)
    const db = new FakeDb().onSelect(
      [{ status: incidentStatus }],
      isParticipant ? [{ id: 'p', breakoutRoomRole: null }] : [],
      [{ accessLevel: tier }],
    );
    db.onWrite([{ id: 'm1', flagged: /shit|fuck/i.test('') }]);
    const actionLog = { log: jest.fn() };
    const redis = { sismember: jest.fn().mockResolvedValue(muted ? 1 : 0), sadd: jest.fn(), srem: jest.fn() };
    const svc = new BreakoutRoomService(db as any, actionLog as any, redis as any);
    return { svc };
  }

  it('lets a Tier1 participant post', async () => {
    const { svc } = build({ tier: AccessLevel.TIER1 });
    const msg = await svc.sendMessage('I1', 'u1', 'On scene, one person unconscious.');
    expect(msg.id).toBe('m1');
  });

  it('blocks an Observer from posting', async () => {
    const { svc } = build({ tier: AccessLevel.OBSERVER });
    await expect(svc.sendMessage('I1', 'u1', 'hi')).rejects.toThrow(ForbiddenException);
  });

  it('blocks a muted user even if Tier2', async () => {
    const { svc } = build({ tier: AccessLevel.TIER2, muted: true });
    await expect(svc.sendMessage('I1', 'u1', 'hi')).rejects.toThrow(/muted/i);
  });

  it('blocks a non-participant', async () => {
    const { svc } = build({ tier: AccessLevel.TIER2, isParticipant: false });
    await expect(svc.sendMessage('I1', 'u1', 'hi')).rejects.toThrow(/participant/i);
  });

  it('rejects posting to a non-active incident', async () => {
    const { svc } = build({ tier: AccessLevel.TIER1, incidentStatus: IncidentStatus.CLOSED });
    await expect(svc.sendMessage('I1', 'u1', 'hi')).rejects.toThrow(/not active/i);
  });
});
