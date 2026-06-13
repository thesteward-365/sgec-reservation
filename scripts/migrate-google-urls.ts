import * as dotenv from 'dotenv';
import path from 'path';
import { eq, and, isNotNull, isNull } from 'drizzle-orm';

// .env.local 및 .env 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function migrate() {
  console.log('🔄 기존 예약 구글 캘린더 URL 마이그레이션 시작...');

  const { db, reservations } = await import('../src/lib/db');
  const { getCalendarClient, getCalendarSettings } = await import('../src/lib/calendar/google-client');

  const calendar = await getCalendarClient();
  const settings = await getCalendarSettings();

  if (!calendar || !settings?.calendarId) {
    console.error('❌ 구글 캘린더 API 클라이언트 또는 캘린더 ID 설정이 완료되지 않았습니다.');
    process.exit(1);
  }

  try {
    // googleEventId는 있으나 googleEventUrl은 없는 활성 상태 예약 조회
    const targetReservations = await db
      .select({
        id: reservations.id,
        googleEventId: reservations.googleEventId,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.status, 'active'),
          isNotNull(reservations.googleEventId),
          isNull(reservations.googleEventUrl)
        )
      );

    console.log(`대상 예약 건수: ${targetReservations.length}건`);

    let successCount = 0;
    let failCount = 0;
    let deletedCount = 0;

    for (const res of targetReservations) {
      if (!res.googleEventId) continue;

      console.log(`- 예약 #${res.id} 처리 중 (Google Event ID: ${res.googleEventId})...`);

      try {
        const response = await calendar.events.get({
          calendarId: settings.calendarId,
          eventId: res.googleEventId,
        });

        const htmlLink = response.data.htmlLink ?? null;
        if (htmlLink) {
          await db
            .update(reservations)
            .set({ googleEventUrl: htmlLink })
            .where(eq(reservations.id, res.id));

          console.log(`  [성공] URL: ${htmlLink}`);
          successCount++;
        } else {
          console.warn(`  [경고] htmlLink가 존재하지 않습니다.`);
          failCount++;
        }
      } catch (err: any) {
        const status = err.status || (err.response && err.response.status);
        if (status === 404 || status === 410) {
          // 구글 캘린더에서 완전히 지워진 일정이므로 ID 및 URL을 초기화 처리합니다.
          await db
            .update(reservations)
            .set({ googleEventId: null, googleEventUrl: null })
            .where(eq(reservations.id, res.id));

          console.log(`  [삭제됨] 구글 캘린더에서 찾을 수 없어 연동 ID를 초기화했습니다.`);
          deletedCount++;
        } else {
          console.error(`  [실패] 구글 API 호출 오류: ${err.message}`);
          failCount++;
        }
      }

      // API 호출 사이 150ms 딜레이 부여하여 구글 API 속도 제한 방지
      await delay(150);
    }

    console.log('\n======================================');
    console.log('✅ 마이그레이션이 완료되었습니다.');
    console.log(`- 성공: ${successCount}건`);
    console.log(`- 구글캘린더에서 삭제됨 (초기화): ${deletedCount}건`);
    console.log(`- 실패: ${failCount}건`);
    console.log('======================================');

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
