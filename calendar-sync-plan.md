# Google Calendar Sync Plan

## 목적

Google Calendar 연동 기능을 실제 데이터와 안정적으로 연결하기 전에, 동기화 실행 단위 기록, 실패 추적, 상세 이력 페이지 조회를 지원할 수 있도록 구조를 정리한다.

이 문서는 다음을 정리한다.

- 현재 로직의 위험 요소
- 권장 데이터 구조
- 서비스/API 리팩터링 방향
- 구현 순서
- 테스트 계획

---

## 현재 확인된 위험 요소

### 1. 행사 일정 pull 페이지네이션 누락

`pullExternalEvents()`는 `maxResults: 250`만 사용하고 `nextPageToken`을 처리하지 않는다.

영향:

- 1년 범위 행사 수가 250건을 넘으면 일부 행사만 읽는다.
- 현재 응답에 없는 이벤트를 기준으로 로컬 `external_events`를 삭제할 경우, 정상 데이터가 지워질 수 있다.

### 2. 행사 일정이 0건일 때 stale 데이터 잔존 가능

현재는 `googleIds.length > 0`일 때만 로컬 정리 로직이 실행된다.

영향:

- Google Calendar에 일정이 0건이어도 기존 `external_events`가 남을 수 있다.

### 3. Google에서 수동 삭제된 예약 이벤트 복구 불가

예약이 `googleEventId`를 가지고 있으면 항상 `update`를 시도한다.

영향:

- Google 쪽 이벤트가 이미 삭제된 상태면 404가 발생한다.
- 현재는 `googleEventId`를 비우거나 재생성하지 않아서, 이후 동기화마다 계속 실패할 수 있다.

### 4. 수동 동기화 API가 부분 실패를 성공처럼 반환

현재 `syncAll()`은 숫자만 반환하고, API는 이를 그대로 성공 응답으로 내려준다.

영향:

- 일부 항목이 실패해도 UI에서는 “동기화 완료”로 보인다.
- 동기화 이력 상세에서 `success / partial / failed`를 정확히 표현하기 어렵다.

### 5. 현재 로그 구조로는 실행 단위 이력 복원이 불가능

`sync_logs`는 단순 `level/message/timestamp`만 저장한다.

영향:

- “동기화 1회 실행”과 “그 안에서 처리된 항목”을 묶어 보여줄 수 없다.
- 최근 이력 목록과 상세 페이지를 안정적으로 구성하기 어렵다.

---

## 삭제 규칙 정리

### 예약 캘린더

- 취소된 예약 이력(`reservation_histories.actionType = cancelled`)에 `googleEventId`가 남아 있으면 Google 이벤트를 삭제한다.
- 단순히 “Google Calendar에만 있고 우리 DB에는 없는 예약 이벤트”라는 이유만으로 자동 삭제하지는 않는다.

### 행사 캘린더

- Google Calendar를 source of truth로 본다.
- 따라서 Google에 없는 외부 행사는 로컬 `external_events`에서 정리될 수 있다.

### 예약 상세 링크

- 예약 항목은 `reservationId`가 있으면 `/admin/reservations/[id]`로 이동 가능하다.
- 외부 행사 항목은 예약 상세 대상이 없으므로 링크를 두지 않는다.

---

## 권장 데이터 구조

### 1. calendar_sync_runs

동기화 실행 1회 단위를 저장한다.

권장 컬럼:

- `id`
- `triggeredBy`
  - `manual`
  - `system`
- `startedAt`
- `finishedAt`
- `status`
  - `success`
  - `partial`
  - `failed`
- `reservationSyncStatus`
  - `success`
  - `failed`
  - `skipped`
- `eventSyncStatus`
  - `success`
  - `failed`
  - `skipped`
- `reservationCreatedCount`
- `reservationUpdatedCount`
- `reservationDeletedCount`
- `eventPulledCount`
- `failedCount`
- `errorSummary`

### 2. calendar_sync_items

실행 안의 개별 처리 항목을 저장한다.

권장 컬럼:

- `id`
- `runId`
- `category`
  - `reservation`
  - `event`
- `action`
  - `created`
  - `updated`
  - `cancelled`
- `status`
  - `success`
  - `failed`
- `reservationId` nullable
- `externalEventId` nullable
- `title`
- `payload`
  - 생성/취소: 전체 snapshot
  - 수정: 변경 필드만
- `errorMessage` nullable
- `processedAt`

---

## 서비스 반환 구조

`syncAll()`은 count만 반환하지 말고 실행 결과 객체를 반환해야 한다.

예시:

```ts
type SyncResult = {
  runId: string;
  status: 'success' | 'partial' | 'failed';
  reservationSyncStatus: 'success' | 'failed' | 'skipped';
  eventSyncStatus: 'success' | 'failed' | 'skipped';
  counts: {
    reservationCreated: number;
    reservationUpdated: number;
    reservationDeleted: number;
    eventPulled: number;
    failed: number;
  };
  items: SyncItemResult[];
  errors: SyncErrorResult[];
};
```

하위 함수들도 상세 결과를 반환하도록 맞춘다.

- `pushReservations()`
- `syncCancellations()`
- `pullExternalEvents()`

각 함수는 다음 정보를 반환해야 한다.

- 성공 건수
- 실패 건수
- 처리된 항목 목록
- 실패 원인 목록

---

## 서비스 리팩터링 방향

### pushReservations()

해야 할 일:

- 생성/수정 여부를 구분해서 결과 기록
- 성공 항목마다 `calendar_sync_items`에 기록 가능한 payload 준비
- `update` 실패 시 404/410이면 `googleEventId` 무효화 후 재생성 전략 검토

### syncCancellations()

해야 할 일:

- 삭제 성공 항목 기록
- 404/410은 정리 성공으로 간주
- 기타 에러는 실패 항목으로 기록

### pullExternalEvents()

해야 할 일:

- `nextPageToken` 기반 페이지네이션 처리
- 0건일 때도 로컬 stale 데이터 정리
- 가져온 외부 행사 항목 기록

### syncAll()

해야 할 일:

- 실행 시작 시 `calendar_sync_runs` 생성
- 하위 결과 병합
- `success / partial / failed` 계산
- counts 집계
- item/error 저장
- 실행 종료 시 run 업데이트

---

## API 리팩터링 방향

### 수동 동기화 API 응답

현재:

- 단순 count 기반 토스트용 메시지
- 부분 실패도 성공처럼 보임

목표:

```ts
{
  success: true,
  runId: "sync_run_xxx",
  status: "partial",
  counts: {
    reservationCreated: 12,
    reservationUpdated: 3,
    reservationDeleted: 2,
    eventPulled: 27,
    failed: 2
  }
}
```

이렇게 하면:

- 설정 페이지에서 최근 실행 결과를 즉시 갱신할 수 있다.
- 상세 페이지는 `runId`로 바로 연결할 수 있다.

### 조회 API

추가 필요:

- 최근 동기화 이력 목록 조회 API
- 동기화 이력 상세 조회 API

---

## UI 연동 기준

### 캘린더 연동 페이지

표시 대상:

- 최근 동기화 이력 목록
- 각 이력의 실행 시각
- 실패가 있으면 제목 옆 `실패` 배지

클릭:

- 동기화 이력 상세 페이지 이동

### 동기화 이력 상세 페이지

표시 대상:

- 동기화 일시
- 예약 캘린더 결과
- 행사 캘린더 결과
- 처리된 항목 목록

처리된 항목:

- 예약 항목만 상세 예약 페이지 링크 포함
- 행사 항목은 링크 없음
- 생성/취소는 전체 필드
- 수정은 변경 필드만

---

## 구현 우선순위

### 1단계

- `pullExternalEvents()` 페이지네이션 처리
- 행사 0건 시 stale 정리

### 2단계

- 예약 update 404 복구 처리
- `syncAll()` 결과 객체 도입

### 3단계

- `calendar_sync_runs`
- `calendar_sync_items`
- 저장 로직 추가

### 4단계

- 수동 동기화 API가 `runId + status + counts` 반환
- 최근 이력 목록 API
- 상세 이력 API

### 5단계

- 캘린더 설정 페이지 실제 데이터 연결
- 동기화 상세 페이지 실제 데이터 연결

---

## 테스트 계획

구현 시 테스트는 필수로 같이 작성한다.

### 1. 서비스 테스트

#### 예약 생성

- Google 이벤트 생성 성공
- `googleEventId` 저장 확인
- sync item 기록 데이터 생성 확인

#### 예약 수정

- 수정 성공 시 변경 필드만 기록
- Google 404 시 재생성 또는 복구 처리 확인

#### 취소 삭제

- 삭제 성공 시 history 정리
- 404/410은 성공 처리
- 기타 에러는 실패 처리

#### 행사 가져오기

- 1페이지 응답 처리
- 다중 페이지 응답 처리
- 0건일 때 stale 데이터 정리
- upsert 정상 동작

#### 전체 실행 상태

- 전부 성공이면 `success`
- 일부 실패면 `partial`
- 전체 실패면 `failed`

### 2. API 테스트

- 수동 동기화 성공 응답
- 부분 실패 응답
- 실패 응답
- `runId` 반환 확인
- 비관리자 접근 401

### 3. 조회 테스트

- 최근 이력 목록 조회
- 상세 이력 조회
- 예약 항목은 상세 링크 포함
- 행사 항목은 링크 없음

---

## 테스트 파일 제안

- `src/tests/calendar-service.test.ts`
- `src/tests/calendar-sync-route.test.ts`
- `src/tests/calendar-sync-history-route.test.ts`

### calendar-service.test.ts

대상:

- `pushReservations()`
- `syncCancellations()`
- `pullExternalEvents()`
- `syncAll()`

### calendar-sync-route.test.ts

대상:

- `/api/admin/calendar` POST sync
- 권한/응답/status 검증

### calendar-sync-history-route.test.ts

대상:

- 최근 이력 목록 조회
- 상세 조회
- 링크 필드 포함 여부 검증

---

## 최종 목표

최종적으로는 다음이 가능해야 한다.

- 수동 동기화 실행 시 부분 실패를 정확히 인식
- 최근 동기화 이력 목록 제공
- 실행 단위 상세 페이지 제공
- 어떤 예약이 생성/수정/취소되었는지 추적
- 실패한 항목과 이유를 확인
- 예약 항목은 상세 예약 페이지로 이동

# 작업 내역-v1

정리부터 짧게 말씀드리면, 지금 구현된 기준은 이렇습니다.

예약 캘린더/행사 캘린더 동기화 결과를 run/item 단위로 저장하도록 스키마를 추가했습니다.

syncAll()이 이제 단순 count가 아니라 runId, status, counts, items, errors를 포함한 결과를 만들고 저장합니다.

행사 일정 pull은 페이지네이션을 처리하고, Google 쪽 결과가 0건일 때도 로컬 external_events를 정리하도록 바꿨습니다.

예약 이벤트 업데이트가 404/410이면 googleEventId를 새 이벤트로 복구하도록 처리했습니다.

최근 동기화 이력 목록 API와 상세 API를 추가했고, 관리자 캘린더 설정 페이지에 최근 이력을 실제로 붙였습니다.

/admin/calendar/history/[runId] 상세 페이지도 실제 API를 읽어 열리도록 추가했습니다.

예약 항목은 상세 예약 페이지로 이동 가능하고, 외부 행사 항목은 링크 없이 유지됩니다.

주요 변경 파일은 아래입니다.

src/lib/db/schema.ts

src/lib/db/index.ts

src/lib/calendar/calendar-service.ts

src/app/api/admin/calendar/route.ts

src/app/api/admin/calendar/history/route.ts

src/app/api/admin/calendar/history/[runId]/route.ts

src/app/admin/calendar/page.tsx

src/app/admin/calendar/history/[runId]/page.tsx

drizzle-pg/0002_calendar_sync_history.sql

src/tests/calendar-service.test.ts

검증은 아래까지 통과했습니다.

npx eslint ... 대상 파일

npm test -- --run src/tests/calendar-service.test.ts

구현하면서 남겨둔 메모도 같이 드리면:

마이그레이션 파일은 추가했지만 실제 DB에는 아직 적용하지 않았습니다. 다음 단계에서 db:migrate가 필요합니다.

수정 예약 항목은 가능하면 변경 필드만 보여주도록 최신 reservation_histories를 참조하게 했지만, 과거 이력 데이터 형식에 따라 일부 항목은 전체 snapshot처럼 보일 수 있습니다.

동기화 상세의 “로그” 영역은 현재 sync_logs를 실행 단위로 완전히 묶지 못해서, 우선 item 에러 기반으로 보여주고 있습니다. 이건 나중에 더 정교하게 묶고 싶으면 sync_logs에도 runId를 추가하는 쪽이 좋습니다.

다음으로 바로 이어서 하면 좋은 건 2가지입니다.

DB 마이그레이션 적용
실제 상세 페이지 문구/필드 매핑 다듬기

## 남은 작업-v2

현재 확인된 기준으로, 다음 작업을 순서대로 진행한다.

### Todo

- [x] 1. reservation history payload 구조 통일
  - 생성/취소 이력 `snapshot`에 `placeName`, `userName`, `purpose`, `startTime`, `endTime`가 항상 들어가도록 맞춘다.
  - 상세 표시 기준 payload에서 `placeId`, `userId` 같은 원시 식별자 의존도를 낮춘다.
  - 완료 기준: 같은 유형의 예약 생성/취소 카드가 같은 필드 구조를 가진다.
  - 테스트 수행 방법: `npm test -- --run src/tests/reservation-service.test.ts`

- [x] 2. 상세 이력 페이지 필드 매핑 단순화
  - 예약 항목 표시 순서를 `장소`, `사용 목적`, `예약자`, `시작`, `종료`로 고정한다.
  - 시간 포맷은 `월.일(요일) 오전/오후 시간` 형식으로 유지한다.
  - `reservationId`, `placeId`, `userId` 같은 내부 필드는 노출하지 않는다.
  - 값이 비어 있으면 `-`로 표기한다.
  - 완료 기준: 생성/취소 카드의 UI가 동일한 구조와 라벨로 보이고, 누락 값이 있어도 UI가 흔들리지 않는다.
  - 테스트 수행 방법: `npx eslint src/app/admin/calendar/history/[runId]/page.tsx src/components/admin/calendar-sync-history-detail.tsx`
  - 수동 테스트: `/admin/calendar/history/[runId]`에서 생성/수정/취소 예약 카드가 의도한 순서와 포맷으로 보이는지 확인한다.

- [x] 3. 예약 상세 페이지에서 Google Calendar 이벤트 링크 제공 여부 검토 및 구현
  - 예약 상세 API 응답에 `googleEventId`를 포함할지 검토하고 구현한다.
  - Google Calendar event deep link 또는 관리용 캘린더 이동 방식 중 하나로 링크 구성을 결정한다.
  - 취소된 예약 또는 `googleEventId`가 없는 예약의 표시 규칙을 정한다.
  - 완료 기준: 가능한 경우 예약 상세 페이지에서 Google의 해당 이벤트로 이동할 수 있다.
  - 테스트 수행 방법: `npx eslint src/app/admin/reservations/[id]/page.tsx src/app/api/admin/reservations/[id]/route.ts src/components/reservations/reservation-detail-view.tsx`
  - 수동 테스트: 활성 예약 상세 페이지에서 `Google Calendar에서 보기` 버튼이 노출되고, 클릭 시 새 탭에서 해당 Google 이벤트가 열리는지 확인한다. 취소된 예약 또는 미연동 예약에서는 버튼이 숨겨지는지 확인한다.

- [x] 4. API 테스트 추가
  - `src/tests/calendar-sync-route.test.ts`
  - `src/tests/calendar-sync-history-route.test.ts`
  - `/api/admin/calendar` 수동 동기화 응답, `runId`, `status`, `counts`, 최근 이력 목록, 상세 이력, 비관리자 401을 검증한다.
  - 완료 기준: API 레벨 회귀 테스트가 추가된다.
  - 테스트 수행 방법: `npm test -- --run src/tests/calendar-sync-route.test.ts src/tests/calendar-sync-history-route.test.ts`
  - 수동 테스트: 없음

- [x] 5. DB 마이그레이션 실제 적용
  - `drizzle-pg/0002_calendar_sync_history.sql`를 실제 DB에 반영한다.
  - 적용 후 최근 이력/상세 이력 API 정상 동작을 확인한다.
  - 완료 기준: 코드와 DB 스키마 상태가 일치한다.
  - 테스트 수행 방법: `npm run db:migrate`
  - 수동 테스트: 로컬 서버 실행 후 `/admin/calendar`와 `/admin/calendar/history/[runId]`에서 최근 이력 및 상세 이력이 정상 조회되는지 확인한다.

- [x] 6. 과거 history 데이터 보정 여부 결정
  - 결정: 과거 데이터는 우선 UI fallback으로 대응하고, 운영상 문제가 확인될 때만 별도 보정 스크립트/마이그레이션을 추가한다.
  - 완료 기준: 과거 데이터 처리 전략이 문서 또는 코드로 확정된다.
  - 테스트 수행 방법: 없음

- [ ] 7. sync_logs 실행 단위 연결 고도화
  - 필요 시 `sync_logs`에 `runId`를 추가한다.
  - 실행 단위 상세 페이지에서 run 기반 로그 조회가 가능하도록 확장한다.
  - 완료 기준: run 단위 상세 로그 복원이 가능해진다.
  - 테스트 수행 방법: 구현 범위 확정 후 별도 기록

- [ ] 8. 행사 캘린더 동기화 이력 action 정교화
  - 현재 `pullExternalEventsDetailed()`는 행사 캘린더를 매번 다시 읽고, 기존에 있던 행사도 이력에 모두 `created`로 기록하고 있다.
  - `external_events` upsert 전에 기존 로컬 데이터 존재 여부를 확인해서, 신규 항목은 `created`, 기존 항목은 `updated` 또는 별도 `synced` 성격으로 기록하는 방안을 구현한다.
  - 동기화 이력 상세에서 “이전에 있던 행사인데 새로 생성된 것처럼 보이는 문제”를 해소한다.
  - 완료 기준: 같은 행사 이벤트가 다음 동기화에서 다시 들어와도 이력에 무조건 `created`로 보이지 않는다.
  - 테스트 수행 방법: `npm test -- --run src/tests/calendar-service.test.ts`
  - 수동 테스트: 연속 2회 동기화 후 `/admin/calendar/history/[runId]`에서 행사 항목 action이 실제 상태와 맞게 보이는지 확인한다.

- [ ] 9. skipped 상태 UI 표현 수정
  - 현재 서비스 레벨에서는 처리할 예약이 없으면 `skipped`로 계산하지만, 상세 페이지에서 이를 강제로 `failed`로 변환하고 있다.
  - `/admin/calendar/history/[runId]`와 최근 이력 요약에서 `skipped`를 실패가 아닌 “변경 없음” 또는 “건너뜀”으로 표시하도록 정리한다.
  - 필요하면 `CalendarSyncHistoryDetail`의 상태 타입/배지 문구를 `success | failed`에서 `success | skipped | failed`로 확장한다.
  - 완료 기준: 예약 캘린더에 반영할 변경이 없는 동기화가 실패처럼 보이지 않는다.
  - 테스트 수행 방법: `npm test -- --run src/tests/calendar-sync-history-route.test.ts`
  - 수동 테스트: 변경 없는 상태에서 동기화 후 최근 이력과 상세 이력에서 예약 캘린더 상태가 실패가 아닌 문구로 보이는지 확인한다.

- [ ] 10. 관리자 예약 상세에 Google 동기화 상태 표시
  - 관리자 예약 상세 페이지에서 현재는 Google 이벤트 링크만 제공하고, 최신 정보 반영 여부는 확인할 수 없다.
  - 예약 상세 API 응답에 Google 동기화 상태 계산에 필요한 정보가 부족하면 확장한다.
  - 최소 표시안:
    - `동기화됨`
    - `동기화 필요`
    - `Google 이벤트 없음`
    - 필요 시 `마지막 반영 시각`
  - 상태 계산 기준은 예약의 최신 변경 시점과 해당 예약이 마지막으로 성공 처리된 calendar sync item 또는 run 시점을 비교하는 쪽을 우선 검토한다.
  - 완료 기준: 관리자 예약 상세에서 해당 예약이 Google Calendar에 최신 상태로 반영되었는지 한눈에 확인할 수 있다.
  - 테스트 수행 방법: `npx eslint src/app/admin/reservations/[id]/page.tsx src/app/api/admin/reservations/[id]/route.ts`
  - 수동 테스트: 생성 직후, 수정 후 미동기화 상태, 동기화 완료 상태, 취소 상태 각각에서 배지/문구가 기대대로 보이는지 확인한다.

- [ ] 11. 행사 일정 전용 목록 화면 추가
  - 예약 현황의 일자별 상세와 별개로, 행사 일정만 모아서 볼 수 있는 관리자 화면을 추가한다.
  - 우선 배치안은 `/admin/calendar` 내부에서 `행사 일정 목록 보기` 진입점을 두고, 별도 페이지 `/admin/calendar/events`에서 `external_events`를 날짜순으로 보여주는 방식으로 잡는다.
  - 기본 범위는 다가오는 행사 리스트이며, 필요 시 월 단위 필터나 검색은 후속으로 분리한다.
  - 이 화면은 행사 캘린더의 현재 동기화 결과를 운영자가 점검하는 용도로 사용한다.
  - 완료 기준: 운영자가 예약 화면으로 들어가지 않고도 동기화된 행사 일정을 한 화면에서 확인할 수 있다.
  - 테스트 수행 방법: 구현 범위 확정 후 `eslint` 및 관련 route/page 테스트 추가
  - 수동 테스트: `/admin/calendar`에서 목록 화면으로 이동 가능하고, 행사 일정이 시간순으로 노출되는지 확인한다.
