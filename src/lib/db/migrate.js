const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
const path = require('path');
const fs = require('fs');

const runMigration = async () => {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not defined');
    process.exit(1);
  }

  // URL에서 비밀번호 마스킹하여 로그 출력
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
  console.log('Target Database:', maskedUrl);

  const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(migrationClient);

  console.log('Running migrations...');

  try {
    const migrationsFolder = path.join(process.cwd(), 'drizzle-pg');
    await migrate(db, { migrationsFolder });

    console.log('Migrations completed successfully\n');

    // 적용된 모든 마이그레이션 목록 조회
    const appliedMigrations = await migrationClient`
      SELECT id, hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY id ASC
    `;

    if (appliedMigrations.length > 0) {
      // 고정 너비 테이블 포맷팅
      // ID(4) + Tag(31) + Date(21) = 56 (총 너비)
      console.log('┌────┬───────────────────────────────┬─────────────────────┐');
      console.log('│ ID │ Migration Tag                 │ Applied At          │');
      console.log('├────┼───────────────────────────────┼─────────────────────┤');
      
      appliedMigrations.forEach(m => {
        const id = String(m.id).padEnd(2);
        const tag = String(m.hash).padEnd(29);
        
        // 날짜 포맷을 고정 길이(19자)로 직접 생성하여 줄깨짐 방지 (YYYY-MM-DD HH:mm:ss)
        const d = new Date(Number(m.created_at));
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        
        console.log(`│ ${id} │ ${tag} │ ${date} │`);
      });
      
      console.log('└────┴───────────────────────────────┴─────────────────────┘');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
};

runMigration();
