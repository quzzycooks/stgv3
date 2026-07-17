import { BadRequestException } from '@nestjs/common';
import { IncidentStatus } from '../database/enums';

/**
 * Situation Room lifecycle state machine (PRD 6.5.6). Only these transitions
 * are legal; anything else is rejected. Terminal states (CLOSED, FALSE_ALARM)
 * have no outgoing transitions.
 */
const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  [IncidentStatus.ACTIVE]: [
    IncidentStatus.UNDER_CONTROL,
    IncidentStatus.TRANSFERRED,
    IncidentStatus.CLOSED,
    IncidentStatus.FALSE_ALARM,
  ],
  [IncidentStatus.UNDER_CONTROL]: [IncidentStatus.TRANSFERRED, IncidentStatus.CLOSED],
  [IncidentStatus.TRANSFERRED]: [IncidentStatus.CLOSED],
  [IncidentStatus.CLOSED]: [],
  [IncidentStatus.FALSE_ALARM]: [],
};

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: IncidentStatus, to: IncidentStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(`Illegal incident transition: ${from} → ${to}`);
  }
}

export const TERMINAL_STATES = [IncidentStatus.CLOSED, IncidentStatus.FALSE_ALARM];
export const OPEN_STATES = [IncidentStatus.ACTIVE, IncidentStatus.UNDER_CONTROL];
