# Next.js SSR(UTC)과 클라이언트(KST) 간 하이드레이션 에러 해결 기록

Next.js 예약 시스템 개발 중, 매일 새벽 00:00 ~ 오전 09:00 사이에 접속할 때만 간헐적으로 리액트 하이드레이션 오류가 발생하는 문제를 겪었다.

## 1. 발생한 문제
배포된 예약 시스템의 캘린더 페이지 접속 시 다음과 같은 하이드레이션 오류가 발생했다.
```text
monthly-calendar.tsx:251 A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
...
-   href="/reserve?date=2026-06-12"
+   href="/reserve?date=2026-06-13"
```
서버에서 만들어진 HTML 주소(6월 12일)와 클라이언트 브라우저가 복원할 때 계산한 주소(6월 13일)의 날짜가 맞지 않아 렌더링이 깨졌다. 이 에러는 유독 새벽 00시부터 오전 9시 사이에만 재현되었다.

## 2. 원인 분석
서버와 클라이언트 브라우저가 생각하는 "오늘"의 기준이 달랐기 때문에 발생한 문제였다. 로컬 도커 환경과 클라우드 배포 서버는 시스템 타임존이 **UTC**로 동작하지만, 사용자 기기의 브라우저는 **KST(UTC+9)**로 동작한다.

KST는 UTC보다 9시간 빠르므로 다음과 같은 시차가 생긴다.
- 한국 시간 기준 새벽 2시(02:00 KST)일 때, 서버(UTC) 시간은 전날 오후 5시(17:00 UTC)가 된다.
- 이 상태에서 접속하면:
  1. 서버(SSR)는 17:00 UTC를 기준으로 오늘을 판단하여 어제 날짜(`2026-06-12`) 기준으로 HTML을 생성한다.
  2. 클라이언트(KST)는 02:00 KST를 기준으로 오늘을 판단하여 오늘 날짜(`2026-06-13`) 기준으로 하이드레이션을 수행한다.
  3. 이 9시간 동안(새벽 0시 ~ 오전 9시) 양쪽의 날짜가 하루 어긋나면서 리액트가 렌더링 불일치 에러를 던지게 되었다.
- 오전 9시가 지나면 UTC도 다음 날짜로 넘어가기 때문에 에러가 발생하지 않았다.

## 3. 해결 방법
서버와 클라이언트 모두 시스템 설정과 관계없이 항상 동일한 KST 기준 자정 날짜를 바라보도록 수정했다.

### getKSTToday() 공통 함수 구현
시스템 타임존 오프셋을 구해서 어떤 환경에서도 한국 시간 기준 자정(`00:00:00`)을 반환하는 유틸리티 함수를 만들었다.
```typescript
export function getKSTToday(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (3600000 * 9));
  kst.setHours(0, 0, 0, 0);
  return kst;
}
```
서버와 클라이언트 양쪽에서 오늘 날짜를 가져올 때 `new Date()` 대신 `getKSTToday()`를 사용하여 항상 KST 날짜로 일치시켰다.

### 날짜 포맷팅 및 비교 시 KST 오프셋 직접 반영
날짜 객체를 문자열(`YYYY-MM-DD`)로 바꿀 때 로컬 시스템 시간대(UTC) 기준으로 출력되지 않도록, UTC 시간에 9시간을 더한 뒤 `getUTC...` 메서드를 사용하도록 가공 로직을 개선했다.
```typescript
export function formatLocalDate(date: Date | string | number): string {
  const d = toDate(date);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```
이로써 시차 때문에 날짜가 하루 전으로 롤백되거나 화면이 어긋나는 현상을 해결했다.

## 4. 정리
- SSR 환경에서 단순 `new Date()`는 하이드레이션 오류를 일으키기 쉬운 주범이다.
- 특히 KST(UTC+9) 기준의 서비스는 새벽 0시부터 오전 9시 사이에만 간헐적으로 버그가 발생하므로, 시차가 있는 환경에서의 날짜 연산은 하나의 타임존으로 조기에 고정하는 처리가 안전하다.