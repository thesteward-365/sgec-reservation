import { db, users, places, floors, calendarSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';

async function setup() {
  console.log('Seeding test data...');

  // 1. 관리자 유저 생성
  const adminPhone = '010-0000-0000';
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.phoneNumber, adminPhone),
  });

  if (!existingAdmin) {
    await db.insert(users).values({
      name: '관리자',
      phoneNumber: adminPhone,
      role: 'admin',
      status: 'approved',
    });
    console.log('Admin user created.');
  } else {
    await db.update(users).set({ role: 'admin', status: 'approved' }).where(eq(users.id, existingAdmin.id));
    console.log('Admin user updated.');
  }

  // 2. 층 및 장소 생성
  let floor = await db.query.floors.findFirst({
    where: eq(floors.name, '1층'),
  });

  if (!floor) {
    [floor] = await db.insert(floors).values({ name: '1층', order: 1 }).returning();
    console.log('Floor created.');
  }

  const placeName = '대예배당';
  const existingPlace = await db.query.places.findFirst({
    where: eq(places.name, placeName),
  });

  if (!existingPlace) {
    await db.insert(places).values({
      name: placeName,
      floorId: floor.id,
      description: 'E2E 테스트용 장소',
    });
    console.log('Place created.');
  }

  // 3. 캘린더 설정 (Mock용)
  const settings = await db.query.calendarSettings.findFirst();
  if (!settings) {
    await db.insert(calendarSettings).values({
      calendarId: 'mock-calendar-id',
      eventCalendarId: 'mock-event-calendar-id',
    });
    console.log('Calendar settings created.');
  }

  console.log('Test data seeding completed.');
}

setup().catch(console.error).finally(() => process.exit());
