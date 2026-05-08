'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { type DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { PlaceTab } from './_components/place-tab';
import { FloorTab } from './_components/floor-tab';
import { TagTab } from './_components/tag-tab';
import { PlaceSheet } from './_components/place-sheet';
import { TagSheet } from './_components/tag-sheet';
import { FloorDeleteDialog } from './_components/floor-delete-dialog';
import { SortActionBar } from './_components/sort-action-bar';
import { TABS, type FloorRow, type PlaceRow, type SheetConfig, type TabType, type TagRow } from './types';

const EMPTY_CONFIG: SheetConfig = { mode: '장소', editingId: null, initialValues: { name: '', desc: '', floorId: null, tagIds: [] } };

export default function PlacesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('장소');
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [floors, setFloors] = useState<FloorRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetConfig, setSheetConfig] = useState<SheetConfig>(EMPTY_CONFIG);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);

  const [sortMode, setSortMode] = useState(false);
  const [sortItems, setSortItems] = useState<PlaceRow[]>([]);
  const [localPinnedIds, setLocalPinnedIds] = useState<Set<number>>(new Set());
  const [origSortIds, setOrigSortIds] = useState<number[]>([]);
  const [origPinnedIds, setOrigPinnedIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const [tagEditMode, setTagEditMode] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState<Set<number>>(new Set());
  const [deletingFloor, setDeletingFloor] = useState<FloorRow | null>(null);

  const loadAll = useCallback(async () => {
    const [p, f, t] = await Promise.all([
      fetch('/api/places').then((r) => r.json()),
      fetch('/api/floors').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ]);
    setPlaces(p ?? []);
    setFloors(f ?? []);
    setTags(t ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadAll().catch(console.error).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadAll]);

  const placesByFloor = useMemo(() => {
    const map = new Map<number, PlaceRow[]>();
    for (const p of places) {
      if (p.floorId !== null) {
        if (!map.has(p.floorId)) map.set(p.floorId, []);
        map.get(p.floorId)!.push(p);
      }
    }
    return map;
  }, [places]);

  const openSheet = (mode: '장소' | '층', id?: number) => {
    let initialValues = EMPTY_CONFIG.initialValues;
    if (id) {
      if (mode === '장소') {
        const p = places.find((x) => x.id === id);
        if (p) initialValues = { name: p.name, desc: p.description ?? '', floorId: p.floorId, tagIds: p.tags.map((t) => t.id) };
      } else if (mode === '층') {
        const f = floors.find((x) => x.id === id);
        if (f) initialValues = { name: f.name, desc: '', floorId: null, tagIds: [] };
      }
    }
    setSheetConfig({ mode, editingId: id ?? null, initialValues });
    setSheetOpen(true);
  };

  const handleTagDelete = async (tag: TagRow) => {
    const prevTags = tags;
    setTags((prev) => prev.filter((t) => t.id !== tag.id));
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast(`#${tag.name} 태그가 삭제되었습니다.`, {
        action: {
          label: '취소',
          onClick: async () => {
            await fetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: tag.name }) });
            await loadAll();
          },
        },
      });
    } catch {
      setTags(prevTags);
      toast.error('태그 삭제에 실패했습니다.');
    }
  };

  const enterSortMode = () => {
    const pinned = new Set(places.filter((p) => p.isPinned).map((p) => p.id));
    setSortItems([...places]);
    setLocalPinnedIds(pinned);
    setOrigSortIds(places.map((p) => p.id));
    setOrigPinnedIds(new Set(pinned));
    setSortMode(true);
  };

  const hasChanges = useMemo(() => {
    if (!sortMode) return false;
    if (sortItems.map((p) => p.id).join(',') !== origSortIds.join(',')) return true;
    const curr = [...localPinnedIds].sort((a, b) => a - b).join(',');
    const orig = [...origPinnedIds].sort((a, b) => a - b).join(',');
    return curr !== orig;
  }, [sortMode, sortItems, localPinnedIds, origSortIds, origPinnedIds]);

  const saveSortMode = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/places/order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: sortItems.map((p) => p.id), pinnedIds: Array.from(localPinnedIds) }),
      });
      if (!res.ok) throw new Error();
      toast.success('순서가 저장되었습니다.');
      setSortMode(false);
      await loadAll();
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSortItems((items) => {
        const oldIdx = items.findIndex((i) => i.id === active.id);
        const newIdx = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIdx, newIdx);
      });
    }
  };

  const toggleLocalPin = (id: number) =>
    setLocalPinnedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const switchTab = (tab: TabType) => { setActiveTab(tab); setSortMode(false); setTagEditMode(false); };

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 bg-(--color-neutral-150)">
        <div className="mx-auto flex h-14 max-w-107.5 items-center px-4">
          {sortMode ? (
            <p className="text-body w-full text-center font-bold text-foreground">정렬 중</p>
          ) : (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/admin/dashboard"><ChevronLeftIcon className="size-5" /></Link>
              </Button>
              <p className="text-body flex-1 text-center font-bold text-foreground">장소 관리</p>
              {activeTab === '장소' && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={enterSortMode}>정렬</Button>
                  <Button variant="ghost" size="icon" onClick={() => openSheet('장소')} className="text-primary">
                    <PlusIcon className="size-5" />
                  </Button>
                </div>
              )}
              {activeTab === '층' && (
                <Button variant="ghost" size="icon" onClick={() => openSheet('층')} className="text-primary">
                  <PlusIcon className="size-5" />
                </Button>
              )}
              {activeTab === '태그' && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTagEditMode((v) => !v)}
                    className={cn(tagEditMode && 'text-primary')}
                  >
                    {tagEditMode ? '완료' : '편집'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTagSheetOpen(true)}
                    className="text-primary"
                  >
                    <PlusIcon className="size-5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <main className={cn('flex-1 pt-14', sortMode ? 'pb-10' : 'pb-10')}>
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto px-5 py-4">
          {TABS.map((tab) => (
            <Chip key={tab} variant={activeTab === tab ? 'active' : 'inactive'} onClick={() => switchTab(tab)}>
              {tab}
            </Chip>
          ))}
        </div>

        <div className="px-5">
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <>
              {activeTab === '장소' && (
                <PlaceTab
                  places={places}
                  sortMode={sortMode}
                  sort={{ items: sortItems, pinnedIds: localPinnedIds, onDragEnd: handleDragEnd, onTogglePin: toggleLocalPin }}
                  onOpenSheet={(id) => openSheet('장소', id)}
                />
              )}
              {activeTab === '층' && (
                <FloorTab
                  floors={floors}
                  placesByFloor={placesByFloor}
                  expandedFloors={expandedFloors}
                  onToggleExpand={(id) => setExpandedFloors((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; })}
                  onOpenSheet={(id) => openSheet('층', id)}
                />
              )}
              {activeTab === '태그' && (
                <TagTab
                  tags={tags}
                  editMode={tagEditMode}
                  onDelete={handleTagDelete}
                  onOpenSheet={() => setTagSheetOpen(true)}
                />
              )}
            </>
          )}
        </div>
      </main>

      {sortMode && (
        <SortActionBar saving={saving} hasChanges={hasChanges} onCancel={() => setSortMode(false)} onSave={saveSortMode} />
      )}

      <PlaceSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        config={sheetConfig}
        data={{ floors, tags }}
        onSuccess={loadAll}
        onFloorDeleteRequest={(floorId) => {
          const floor = floors.find((f) => f.id === floorId) ?? null;
          setDeletingFloor(floor);
        }}
      />

      <TagSheet
        open={tagSheetOpen}
        onOpenChange={setTagSheetOpen}
        onSuccess={loadAll}
      />

      <FloorDeleteDialog
        floor={deletingFloor}
        otherFloors={floors.filter((f) => f.id !== deletingFloor?.id)}
        linkedPlaceCount={
          deletingFloor ? (placesByFloor.get(deletingFloor.id)?.length ?? 0) : 0
        }
        onClose={() => setDeletingFloor(null)}
        onSuccess={loadAll}
      />
    </>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-card/50 shadow-(--shadow-1)" />
      ))}
    </div>
  );
}
