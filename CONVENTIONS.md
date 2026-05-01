# Coding Conventions & Architecture

## 1. Naming Conventions

- **Directories/Files**: `kebab-case` (예: `reservation-card.tsx`, `auth-service/`)
- **React Components**: `PascalCase` (예: `ReservationDetail`)
- **Functions/Variables**: `camelCase` (예: `getAvailableSlots`)
- **Types/Interfaces**: `PascalCase` (예: `ReservationSchema`)
- **Constants**: `SCREAMING_SNAKE_CASE` (예: `MAX_SLOT_COUNT`)

## 2. Architecture: Layered Feature

- **UI (Components)**: `components/` - 순수 UI, Storybook 작성
- **Logic (Services)**: `lib/services/` - 비즈니스 로직, Vitest 테스트
- **Data (Database)**: `lib/db/` - Drizzle 스키마 및 클라이언트
- **Routing (App)**: `app/` - 페이지 레이아웃 및 Server Actions(진입점)

## 3. Technical Standards

- **TypeScript**: Strict 모드 필수, `any` 사용 금지
- **Components**: Server Components 기본 사용, 클라이언트 인터랙션 시에만 `use client` 분리
- **Validation**: `zod`를 사용하여 입력값 및 환경 변수 검증
- **State Management**: URL 상태 및 Server Actions 우선 사용 (복잡한 클라이언트 상태 지양)
- **Google Calendar**: `lib/calendar` 어댑터로 API 호출 격리

## 4. Component Principles

- **Compactness**: 컴포넌트는 300줄 이내 유지
- **Props & State**:
  - **Props Limit**: 컴포넌트당 Props는 최대 5개 이하.
  - **Minimal State**: `useState` 사용을 최소화하고, 계산 가능한 값은 파생 상태(derived state)로 처리.
  - **Anti-Prop Drilling**: Props 전달은 2단계까지만 허용 (깊어지면 Composition 또는 Context 사용).
- **Definition Order (내부 선언 순서)**:
  1. `interface/type` 정의
  2. Hooks 선언 (`useState`, `useMemo`, `useContext` 등)
  3. `useEffect`
  4. 이벤트 핸들러 (`handle...`)
  5. 파생 데이터 계산 (Memoized values)
  6. JSX 반환 (`return`)
