import { BadRequestException } from '@nestjs/common';
import { IncidentStatus } from '../database/enums';
import { assertTransition, canTransition } from './incident-lifecycle';

describe('incident lifecycle', () => {
  it('allows the documented forward transitions', () => {
    expect(canTransition(IncidentStatus.ACTIVE, IncidentStatus.UNDER_CONTROL)).toBe(true);
    expect(canTransition(IncidentStatus.ACTIVE, IncidentStatus.FALSE_ALARM)).toBe(true);
    expect(canTransition(IncidentStatus.UNDER_CONTROL, IncidentStatus.TRANSFERRED)).toBe(true);
    expect(canTransition(IncidentStatus.TRANSFERRED, IncidentStatus.CLOSED)).toBe(true);
  });

  it('rejects backward / illegal transitions', () => {
    expect(canTransition(IncidentStatus.CLOSED, IncidentStatus.ACTIVE)).toBe(false);
    expect(canTransition(IncidentStatus.TRANSFERRED, IncidentStatus.ACTIVE)).toBe(false);
    expect(canTransition(IncidentStatus.FALSE_ALARM, IncidentStatus.CLOSED)).toBe(false);
    expect(canTransition(IncidentStatus.UNDER_CONTROL, IncidentStatus.FALSE_ALARM)).toBe(false);
    expect(() => assertTransition(IncidentStatus.CLOSED, IncidentStatus.ACTIVE)).toThrow(
      BadRequestException,
    );
  });
});
