import { EncryptionService } from '../common/crypto/encryption.service';
import { FakeDb } from '../test-utils/fake-db';
import { EmergencyContactsService } from './emergency-contacts.service';

describe('EmergencyContactsService.addContacts — duplicate phone validation', () => {
  const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };
  let encryption: EncryptionService;

  beforeEach(() => {
    process.env.BLIND_INDEX_KEY = 'test-key';
    encryption = new EncryptionService();
    notifications.enqueue.mockClear();
  });

  const svc = (db: FakeDb) => new EmergencyContactsService(db as any, encryption, notifications as any);

  it('rejects a number that already exists for the user', async () => {
    const existingHash = encryption.blindIndex('+2348012345678');
    // await order: count(), existing contacts' phoneHashes
    const db = new FakeDb().onSelect([{ existing: 1 }]).onSelect([{ phoneHash: existingHash }]);

    await expect(
      svc(db).addContacts('user-1', [{ name: 'Mum', phone: '08012345678', relationship: 'Mother' }]),
    ).rejects.toThrow('This number is already saved as an emergency contact.');
    expect(notifications.enqueue).not.toHaveBeenCalled();
  });

  it('rejects the same number appearing twice in one submitted batch, regardless of formatting', async () => {
    const db = new FakeDb().onSelect([{ existing: 0 }]).onSelect([]); // no pre-existing contacts

    await expect(
      svc(db).addContacts('user-1', [
        { name: 'Mum', phone: '08012345678', relationship: 'Mother' },
        { name: 'Mummy', phone: '+234 801 234 5678', relationship: 'Mother' },
      ]),
    ).rejects.toThrow('This number is already saved as an emergency contact.');
  });

  it('allows distinct numbers', async () => {
    const db = new FakeDb()
      .onSelect([{ existing: 0 }])
      .onSelect([])
      .onWrite([{ id: 'c1' }])
      .onWrite([{ id: 'c2' }]);

    const rows = await svc(db).addContacts('user-1', [
      { name: 'Mum', phone: '08012345678', relationship: 'Mother' },
      { name: 'Dad', phone: '08087654321', relationship: 'Father' },
    ]);
    expect(rows).toHaveLength(2);
    expect(notifications.enqueue).toHaveBeenCalledTimes(2);
  });
});
