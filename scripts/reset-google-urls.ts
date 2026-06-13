import * as dotenv from 'dotenv';
import path from 'path';
import { isNotNull } from 'drizzle-orm';

// .env.local 및 .env 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function reset() {
  const { db, reservations } = await import('../src/lib/db');
  console.log('🔄 기존 예약의 googleEventUrl 값을 NULL로 초기화합니다...');

  const result = await db
    .update(reservations)
    .set({ googleEventUrl: null })
    .where(isNotNull(reservations.googleEventId));

  console.log('✅ 초기화 완료!');
  process.exit(0);
}

reset().catch((err) => {
  console.error('❌ 초기화 실패:', err);
  process.exit(1);
});
