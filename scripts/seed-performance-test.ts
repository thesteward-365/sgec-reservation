import * as dotenv from 'dotenv';
import path from 'path';
import { sql } from 'drizzle-orm';

// .env.local 및 .env 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function seed() {
  console.log('🌱 Seed start...');

  const { db, reservations, reservationHistories, users, places } = await import('../src/lib/db');

  // 1. Get a test user and a test place
  const testUser = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.role, 'user'),
  });

  const testPlace = await db.query.places.findFirst();

  if (!testUser || !testPlace) {
    console.error('❌ Could not find a test user or place. Please make sure they exist.');
    process.exit(1);
  }

  console.log(`Using User: ${testUser.name} (ID: ${testUser.id})`);
  console.log(`Using Place: ${testPlace.name} (ID: ${testPlace.id})`);

  // 2. Clear existing reservations & history
  console.log('🧹 Clearing existing reservations and histories...');
  await db.delete(reservationHistories);
  await db.delete(reservations);

  // 3. Generate 100 future reservations
  const count = 100;
  const now = new Date();
  const values = [];

  console.log(`Generating ${count} future reservations...`);

  for (let idx = 0; idx < count; idx++) {
    // 0 to 20 days in the future, 10 AM to 2 PM
    const daysOffset = Math.floor(idx / 5); 
    const hourOffset = (idx % 5) + 10; 
    
    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() + daysOffset + 1); // +1일 후부터 미래 시간으로 설정
    startTime.setHours(hourOffset, 0, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setHours(hourOffset + 1);

    values.push({
      userId: testUser.id,
      placeId: testPlace.id,
      startTime: startTime,
      endTime: endTime,
      purpose: `Future Reservation #${idx + 1}`,
      status: 'active' as const,
    });
  }

  // Insert in batches of 50
  const batchSize = 50;
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    await db.insert(reservations).values(batch);
    console.log(`Progress: ${i + batch.length}/${count}`);
  }

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
