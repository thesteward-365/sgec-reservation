FROM node:20-alpine AS base

# 1. 의존성 설치 스테이지
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# 2. 빌드 스테이지
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 빌드 시 메모리 부족 방지를 위해 힙 사이즈 확장 및 텔레메트리 비활성화
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV SESSION_PASSWORD=temporary_placeholder_password_at_least_32_chars_long

# migrate.js를 단일 파일로 번들링 (node_modules 불필요하게 만들기)
# esbuild JS API 사용 (CLI 네이티브 바이너리 플랫폼 문제 회피)
RUN node scripts/bundle-migrate.js

RUN npm run build

# 3. 실행 스테이지
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# standalone 빌드 결과물 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 마이그레이션 파일 복사 (번들된 단일 파일 + SQL 파일)
COPY --from=builder --chown=nextjs:nodejs /app/migrate.bundle.js ./migrate.js
COPY --from=builder --chown=nextjs:nodejs /app/drizzle-pg ./drizzle-pg

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 마이그레이션 실행 후 서버 시작
CMD ["sh", "-c", "node migrate.js && node server.js"]
