export interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '26.05.14',
    date: '2026-05-14',
    items: [
      '예약의 상세 변경 이력 조회 페이지 추가',
      '장소 목록 고정 및 순서 편집 기능 추가',
      '구글 캘린더 동기화 안정성 강화',
    ],
  },
  {
    version: '26.05.09',
    date: '2026-05-09',
    items: ['샘깊은교회 장소 예약 서비스 공식 배포'],
  },
];
