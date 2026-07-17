import { ForbiddenException } from '@nestjs/common';
import { AccessLevel, IncidentStatus } from '../database/enums';
import { FakeDb } from '../test-utils/fake-db';
import { MedicalAccessService } from './medical-access.service';

/** Access-control tests for the incident-scoped medical grant (PRD 11.3). */
describe('MedicalAccessService', () => {
  const medical = { bloodType: 'O+', allergies: ['Penicillin'] };
  const skilledVerified = { accessLevel: AccessLevel.SKILLED, skillVerified: true };
  const openIncident = { status: IncidentStatus.ACTIVE, triggeringUserId: 'victim' };

  const svc = (db: FakeDb) => new MedicalAccessService(db as any);

  it('grants to a verified Skilled Responder participant in an active incident', async () => {
    // await order: requester, incident, membership, (insert log), target
    const db = new FakeDb().onSelect(
      [skilledVerified],
      [openIncident],
      [{ id: 'm' }],
      [{ medicalInfo: medical }],
    );
    await expect(svc(db).getMedicalInfo('req', 'victim', 'I1')).resolves.toEqual(medical);
  });

  it('denies a non-Skilled requester', async () => {
    const db = new FakeDb().onSelect([{ accessLevel: AccessLevel.TIER2, skillVerified: false }]);
    await expect(svc(db).getMedicalInfo('req', 'victim', 'I1')).rejects.toThrow(ForbiddenException);
  });

  it('denies a Skilled but UNVERIFIED requester', async () => {
    const db = new FakeDb().onSelect([{ accessLevel: AccessLevel.SKILLED, skillVerified: false }]);
    await expect(svc(db).getMedicalInfo('req', 'victim', 'I1')).rejects.toThrow(ForbiddenException);
  });

  it('denies once the incident is closed (auto-revoke)', async () => {
    const db = new FakeDb().onSelect([skilledVerified], [{ status: IncidentStatus.CLOSED, triggeringUserId: 'victim' }]);
    await expect(svc(db).getMedicalInfo('req', 'victim', 'I1')).rejects.toThrow(/not active/i);
  });

  it('denies a Skilled Responder who is not a participant', async () => {
    const db = new FakeDb().onSelect([skilledVerified], [openIncident], []); // membership empty
    await expect(svc(db).getMedicalInfo('req', 'victim', 'I1')).rejects.toThrow(/participant/i);
  });
});
