#!/bin/bash

# 환경 변수 로드
source .env

# 서비스 체크
if curl -sf https://yeyak.sgec.or.kr/api/health > /dev/null 2>&1; then
  echo "✅ 서버 정상 작동 중"
  exit 0
else
  echo "🚨 서버 다운 감지: https://yeyak.sgec.or.kr 접속 불가"
  # 서비스 다운: Telegram 알림
  curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}" \
    -d "text=🚨 *서버 다운*%0Ahttps://yeyak.sgec.or.kr 접속 불가" \
    -d "parse_mode=Markdown" \
    > /dev/null 2>&1
  exit 1
fi
