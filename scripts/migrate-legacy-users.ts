import * as dotenv from 'dotenv';
import path from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { isNull, eq } from 'drizzle-orm';

// .env.local 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 스키마 정의 (최소한의 필드만)
import { users } from '../src/lib/db/schema';

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in .env.local');
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('기존 사용자 마이그레이션 시작...');

  try {
    // username이 null인 사용자 조회
    const legacyUsers = await db
      .select()
      .from(users)
      .where(isNull(users.username));

    console.log(`대상 사용자 수: ${legacyUsers.length}명`);

    for (const user of legacyUsers) {
      const initialUsername = user.name.replace(/\s+/g, '').toLowerCase();
      const initialPassword = await bcrypt.hash(user.phoneNumber, 10);

      console.log(`- ${user.name}(${user.phoneNumber}) 마이그레이션 중...`);

      try {
        await db
          .update(users)
          .set({
            username: initialUsername,
            password: initialPassword,
          })
          .where(eq(users.id, user.id));

        console.log(`  완료: 아이디="${initialUsername}"`);
      } catch (err: any) {
        if (err.code === '23505') {
          // Unique violation
          // 아이디가 중복되는 경우 전화번호 뒷자리 추가
          const suffix = user.phoneNumber.slice(-4);
          const newUsername = `${initialUsername}${suffix}`;

          await db
            .update(users)
            .set({
              username: newUsername,
              password: initialPassword,
            })
            .where(eq(users.id, user.id));

          console.log(`  중복 처리 완료: 아이디="${newUsername}"`);
        } else {
          console.error(`  오류 발생: ${err.message}`);
        }
      }
    }

    console.log('마이그레이션 작업이 완료되었습니다.');
  } catch (error) {
    console.error('마이그레이션 중 치명적 오류 발생:', error);
  } finally {
    await client.end();
  }
}

migrate();
