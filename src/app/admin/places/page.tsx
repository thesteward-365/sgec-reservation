'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ChevronLeftIcon,
  PlusIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TABS = ['장소', '층', '태그'] as const;
type TabType = (typeof TABS)[number];

type PlaceRow = {
  id: number;
  name: string;
  description: string | null;
  floorId: number | null;
  floorName: string | null;
  tags: { id: number; name: string }[];
};

type FloorRow = {
  id: number;
  name: string;
  order: number;
};

type TagRow = {
  id: number;
  name: string;
};

export default function PlacesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('장소');
  const [places, setPlaces] = useState<PlaceRow[]>([]);
  const [floors, setFloors] = useState<FloorRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [floorId, setFloorId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setFloorId(null);
    setSelectedTagIds([]);
    setEditingId(null);
  };

  const handleAddClick = () => {
    resetForm();
    setFormOpen(true);
  };

  useEffect(() => {
    if (editingId && activeTab === '장소') {
      const place = places.find(p => p.id === editingId);
      if (place) {
        setName(place.name);
        setDescription(place.description ?? '');
        setFloorId(place.floorId);
        setSelectedTagIds(place.tags.map(t => t.id));
      }
    }
  }, [editingId, activeTab, places]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      let endpoint = '';
      let method = editingId ? 'PATCH' : 'POST';
      let body: any = { name: name.trim() };

      if (activeTab === '장소') {
        endpoint = editingId ? `/api/places/${editingId}` : '/api/places';
        body = { ...body, description: description.trim(), floorId, tagIds: selectedTagIds };
      } else if (activeTab === '층') {
        endpoint = '/api/floors'; // floors/tags are add-only for now in this UI
      } else {
        endpoint = '/api/tags';
      }

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();

      toast.success(`${activeTab}가 ${editingId ? '수정' : '추가'}되었습니다.`);
      setFormOpen(false);
      resetForm();
      
      // Refresh data
      const [placesData, floorsData, tagsData] = await Promise.all([
        fetch('/api/places').then((r) => r.json()),
        fetch('/api/floors').then((r) => r.json()),
        fetch('/api/tags').then((r) => r.json()),
      ]);
      setPlaces(placesData ?? []);
      setFloors(floorsData ?? []);
      setTags(tagsData ?? []);
    } catch (error) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId || !confirm('정말 삭제하시겠습니까?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/places/${editingId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();

      toast.success('삭제되었습니다.');
      setFormOpen(false);
      resetForm();
      
      // Refresh data
      const [placesData] = await Promise.all([
        fetch('/api/places').then((r) => r.json()),
      ]);
      setPlaces(placesData ?? []);
    } catch (error) {
      toast.error('삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/places').then((r) => r.json()),
      fetch('/api/floors').then((r) => r.json()),
      fetch('/api/tags').then((r) => r.json()),
    ])
      .then(([placesData, floorsData, tagsData]) => {
        if (cancelled) return;
        setPlaces(placesData ?? []);
        setFloors(floorsData ?? []);
        setTags(tagsData ?? []);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const placeCountByFloor = useMemo(() => {
    const counts = new Map<number, number>();
    for (const place of places) {
      if (place.floorId !== null) {
        counts.set(place.floorId, (counts.get(place.floorId) ?? 0) + 1);
      }
    }
    return counts;
  }, [places]);

  const placeCountByTag = useMemo(() => {
    const counts = new Map<number, number>();
    for (const place of places) {
      for (const tag of place.tags) {
        counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [places]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-card/50 h-24 animate-pulse rounded-2xl shadow-(--shadow-1)" />
          ))}
        </div>
      );
    }

    const Container = ({ children }: { children: React.ReactNode }) => (
      <Card className="p-0 overflow-hidden shadow-(--shadow-1)">
        <div className="divide-y divide-border/50">{children}</div>
      </Card>
    );

    switch (activeTab) {
      case '장소':
        return places.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 text-center shadow-(--shadow-1)">
            <p className="text-muted-foreground font-medium">등록된 장소가 없습니다.</p>
          </div>
        ) : (
          <Container>
            {places.map((place) => (
              <button
                key={place.id}
                onClick={() => { setEditingId(place.id); setFormOpen(true); }}
                className="w-full block px-5 py-4 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100"
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-[16px] font-bold">
                      {place.name}
                    </p>
                    <div className="text-muted-foreground mt-1 flex flex-wrap gap-2 text-[13px] font-medium">
                      {place.floorName && <span>{place.floorName}</span>}
                      <span>{place.tags.length}개 태그</span>
                    </div>
                  </div>
                  <ChevronRightIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                </div>
              </button>
            ))}
          </Container>
        );

      case '층':
        return floors.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 text-center shadow-(--shadow-1)">
            <p className="text-muted-foreground font-medium">등록된 층이 없습니다.</p>
          </div>
        ) : (
          <Container>
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => { /* Edit floor */ }}
                className="w-full block px-5 py-4 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-foreground text-[15px] font-bold">
                      {floor.name}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[13px] font-medium">
                      {placeCountByFloor.get(floor.id) ?? 0}개 장소
                    </p>
                  </div>
                  <ChevronRightIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                </div>
              </button>
            ))}
          </Container>
        );

      case '태그':
        return tags.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 text-center shadow-(--shadow-1)">
            <p className="text-muted-foreground font-medium">등록된 태그가 없습니다.</p>
          </div>
        ) : (
          <Container>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => { /* Edit tag */ }}
                className="w-full block px-5 py-4 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-foreground text-[15px] font-bold">
                      #{tag.name}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[13px] font-medium">
                      {placeCountByTag.get(tag.id) ?? 0}개 장소
                    </p>
                  </div>
                  <ChevronRightIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                </div>
              </button>
            ))}
          </Container>
        );
      default: return null;
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 bg-(--color-neutral-150)">
        <div className="mx-auto flex h-14 max-w-107.5 items-center px-4">
          <Link
            href="/admin/dashboard"
            className="text-foreground flex size-10 items-center justify-center rounded-xl transition-colors duration-120 ease-(--ease-standard) hover:bg-neutral-200"
          >
            <ChevronLeftIcon className="size-5" />
          </Link>
          <p className="text-body text-foreground flex-1 text-center font-bold">
            장소 관리
          </p>
          <button
            onClick={handleAddClick}
            className="text-primary flex size-10 items-center justify-center rounded-xl transition-colors duration-120 ease-(--ease-standard) hover:bg-neutral-200"
          >
            <PlusIcon className="size-5" />
          </button>
        </div>
      </div>

      <main className="flex-1 pt-14 pb-24">
        <div className="scrollbar-none flex gap-1.5 overflow-x-auto px-5 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'inline-flex items-center font-semibold leading-none rounded-pill px-4 py-2 text-caption transition-colors duration-120 ease-(--ease-standard) cursor-pointer select-none whitespace-nowrap',
                activeTab === tab
                  ? 'bg-(--color-fg-strong) text-white'
                  : 'bg-neutral-200 text-muted-foreground'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="px-5">{renderContent()}</div>
      </main>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col max-w-107.5 mx-auto animate-in slide-in-from-bottom duration-300">
          <div className="flex h-14 items-center px-4">
            <button
              onClick={() => setFormOpen(false)}
              className="text-foreground flex size-10 items-center justify-center rounded-xl transition-colors duration-120 ease-(--ease-standard) hover:bg-neutral-200"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <p className="text-body text-foreground flex-1 text-center font-bold">
              {editingId ? '장소 수정' : `${activeTab} 추가`}
            </p>
            <div className="size-10" />
          </div>
          
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
             <div className="space-y-1.5">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`${activeTab} 이름을 입력하세요`}
                  autoFocus
                />
             </div>

             {activeTab === '장소' && (
               <>
                 <div className="space-y-1.5">
                    <Label htmlFor="description">설명 (선택)</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="장소에 대한 설명을 입력하세요"
                    />
                 </div>

                 <div className="space-y-3">
                    <Label>층 선택</Label>
                    <div className="flex flex-wrap gap-2">
                       {floors.map((f) => (
                         <button
                           key={f.id}
                           onClick={() => setFloorId(floorId === f.id ? null : f.id)}
                           className={cn(
                             'inline-flex items-center font-semibold leading-none rounded-pill px-3 py-1.5 text-[13px] transition-colors duration-120 ease-(--ease-standard) cursor-pointer select-none whitespace-nowrap',
                             floorId === f.id
                               ? 'bg-(--color-fg-strong) text-white font-bold'
                               : 'bg-neutral-200 text-muted-foreground'
                           )}
                         >
                           {f.name}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <Label>태그 선택</Label>
                    <div className="flex flex-wrap gap-2">
                       {tags.map((t) => (
                         <button
                           key={t.id}
                           onClick={() => {
                             setSelectedTagIds(prev => 
                               prev.includes(t.id) 
                                 ? prev.filter(id => id !== t.id)
                                 : [...prev, t.id]
                             );
                           }}
                           className={cn(
                             'inline-flex items-center font-semibold leading-none rounded-pill px-3 py-1.5 text-[13px] transition-colors duration-120 ease-(--ease-standard) cursor-pointer select-none whitespace-nowrap',
                             selectedTagIds.includes(t.id)
                               ? 'bg-(--color-fg-strong) text-white font-bold'
                               : 'bg-neutral-200 text-muted-foreground'
                           )}
                         >
                           #{t.name}
                         </button>
                       ))}
                    </div>
                 </div>
               </>
             )}
          </div>
          
          <div className="p-5 space-y-2" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
             <button
               onClick={handleSave}
               disabled={saving}
               className="w-full bg-primary text-white font-bold rounded-pill py-4 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
             >
               {saving ? '저장 중...' : '저장하기'}
             </button>
             {editingId && (
               <button
                 onClick={handleDelete}
                 disabled={saving}
                 className="w-full text-danger font-semibold py-3 transition-all active:opacity-70 disabled:opacity-50"
               >
                 {activeTab} 삭제하기
               </button>
             )}
          </div>
        </div>
      )}
    </>
  );
}
