import { db, reservations, users, places } from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seed start...');

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

  // 2. Generate 3000 reservations
  const count = 3000;
  const now = new Date();
  const batchSize = 100;
  
  console.log(`Generating ${count} reservations...`);

  for (let i = 0; i < count; i += batchSize) {
    const values = [];
    for (let j = 0; j < batchSize && i + j < count; j++) {
      const idx = i + j;
      // Spread reservations across +/- 180 days
      const daysOffset = Math.floor(idx / 10) - 150; 
      const hourOffset = (idx % 10) + 8; // 8 AM to 5 PM
      
      const startTime = new Date(now);
      startTime.setDate(startTime.getDate() + daysOffset);
      startTime.setHours(hourOffset, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(hourOffset + 1);

      values.push({
        userId: testUser.id,
        placeId: testPlace.id,
        startTime: startTime,
        endTime: endTime,
        purpose: `Performance Test Reservation #${idx}`,
        status: 'active' as const,
      });
    }

    await db.insert(reservations).values(values);
    console.log(`Progress: ${i + values.length}/${count}`);
  }

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
