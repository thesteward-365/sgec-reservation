/**
 * 유저 페이지에서 하단 내비게이션을 숨길 경로 패턴
 */
export const USER_NO_NAV_RE = /^\/reserve\/\d|^\/settings\/profile/;

/**
 * 관리자 페이지에서 하단 내비게이션을 숨길 경로들
 */
const ADMIN_HIDE_NAV_PATHS = [
  '/admin/places',
  '/admin/calendar',
  '/admin/calendar/events',
  '/admin/activities',
  '/admin/changelog',
  '/admin/departments',
];

const ADMIN_RESERVATION_DETAIL_RE = /^\/admin\/reservations\/\d+$/;
const ADMIN_CALENDAR_HISTORY_DETAIL_RE = /^\/admin\/calendar\/history\/.+$/;
const ADMIN_USER_EDIT_RE = /^\/admin\/users\/\d+\/edit$/;

/**
 * 주어진 경로에서 내비게이션 바를 숨겨야 하는지 확인합니다.
 */
export function shouldHideBottomNav(pathname: string | null): boolean {
  if (!pathname) return false;

  // 관리자 경로 체크
  if (pathname.startsWith('/admin')) {
    return (
      ADMIN_HIDE_NAV_PATHS.includes(pathname) ||
      ADMIN_RESERVATION_DETAIL_RE.test(pathname) ||
      ADMIN_CALENDAR_HISTORY_DETAIL_RE.test(pathname) ||
      ADMIN_USER_EDIT_RE.test(pathname)
    );
  }

  // 일반 사용자 경로 체크
  return USER_NO_NAV_RE.test(pathname);
}
