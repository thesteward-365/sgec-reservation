import { db, externalEvents } from '../src/lib/db';

async function seed() {
  console.log('🌱 External Events Seed start...');

  const now = new Date();
  const count = 100;
  const values = [];

  const eventTitles = [
    '전체 회의',
    '시스템 점검',
    '외부 감사',
    '네트워킹 데이',
    '신입 사원 교육',
    '기술 세미나',
    'CEO 타운홀',
    '프로젝트 킥오프',
    '워크샵',
    '사내 보안 교육'
  ];

  for (let i = 0; i < count; i++) {
    // Spread events across +/- 120 days
    const daysOffset = Math.floor(Math.random() * 240) - 120;
    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() + daysOffset);
    startTime.setHours(9, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(18, 0, 0, 0);

    const isAllDay = Math.random() > 0.7;
    const title = eventTitles[Math.floor(Math.random() * eventTitles.length)];

    values.push({
      googleEventId: `mock_event_${i}_${Date.now()}`,
      title: title,
      startTime: startTime,
      endTime: endTime,
      isAllDay: isAllDay,
      description: `${title}에 대한 상세 내용입니다.`,
    });
  }

  // Use insert with onConflictDoNothing in case of ID collisions
  await db.insert(externalEvents).values(values).onConflictDoNothing();

  console.log(`✅ Seed complete! Added ${values.length} external events.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
