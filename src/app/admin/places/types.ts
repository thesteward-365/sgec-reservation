export const TABS = ['장소', '층', '태그'] as const;
export type TabType = (typeof TABS)[number];

export type PlaceRow = {
  id: number;
  name: string;
  description: string | null;
  floorId: number | null;
  floorName: string | null;
  sortOrder: number;
  isPinned: boolean;
  tags: { id: number; name: string }[];
};

export type FloorRow = { id: number; name: string; order: number };
export type TagRow = { id: number; name: string };

export type SheetConfig = {
  mode: '장소' | '층';
  editingId: number | null;
  initialValues: {
    name: string;
    desc: string;
    floorId: number | null;
    tagIds: number[];
  };
};
