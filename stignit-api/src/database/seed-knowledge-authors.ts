import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { encryptField, blindIndex } from '../common/crypto/field-crypto';

/**
 * One-off: creates the two seed author accounts + one commenter account that
 * drizzle/seed_articles.sql references by fixed UUID, upgraded to verified
 * MEDICAL_DOCTOR / NURSE_PARAMEDIC directly via SQL (same approach documented
 * in that file's header). full_name and date_of_birth are encrypted columns
 * too (not just phone_number) — safe to re-run, upserts all three fields.
 */
async function main() {
  const pool = new Pool({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    user: process.env.DB_USER ?? 'stignit',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'stignit',
  });

  const seedUsers = [
    {
      id: 'b0adebb7-bbf7-4b4f-81a9-c609cc43d925',
      phone: '+2348021110001',
      fullName: 'Dr. Amaka Chukwu',
      dob: '1985-03-14',
      skill: 'MEDICAL_DOCTOR',
    },
    {
      id: 'd263b363-a4d9-4d45-9c86-a0bea6ae80bd',
      phone: '+2348021110002',
      fullName: 'Tunde Bakare',
      dob: '1990-07-22',
      skill: 'NURSE_PARAMEDIC',
    },
    {
      id: 'faf771b8-5074-40d0-bba7-c118d133f854',
      phone: '+2348021110003',
      fullName: 'Ngozi Eze',
      dob: '1996-11-02',
      skill: null,
    },
  ];

  for (const u of seedUsers) {
    const encryptedPhone = encryptField(u.phone);
    const phoneHash = blindIndex(u.phone);
    const encryptedFullName = encryptField(u.fullName);
    const encryptedDob = encryptField(u.dob);
    await pool.query(
      `INSERT INTO users
         (id, phone_hash, phone_number, full_name, date_of_birth, access_level,
          professional_skill, skill_verification_status, skill_verified, account_status)
       VALUES ($1, $2, $3, $4, $5, 'TIER1', $6, $7, $8, 'ACTIVE')
       ON CONFLICT (id) DO UPDATE SET
         phone_hash = excluded.phone_hash,
         phone_number = excluded.phone_number,
         full_name = excluded.full_name,
         date_of_birth = excluded.date_of_birth,
         professional_skill = excluded.professional_skill,
         skill_verification_status = excluded.skill_verification_status,
         skill_verified = excluded.skill_verified`,
      [
        u.id,
        phoneHash,
        encryptedPhone,
        encryptedFullName,
        encryptedDob,
        u.skill,
        u.skill ? 'APPROVED' : 'NONE',
        Boolean(u.skill),
      ],
    );
    console.log(`Seeded user ${u.fullName} (${u.id})`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
