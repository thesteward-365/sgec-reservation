'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BrandHeader } from '@/components/layout/brand-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronLeftIcon,
  PlusIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

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

    return () => {
      cancelled = true;
    };
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
            <div
              key={index}
              className="bg-card/50 h-24 animate-pulse rounded-3xl"
            />
          ))}
        </div>
      );
    }

    switch (activeTab) {
      case '장소':
        return places.length === 0 ? (
          <div className="bg-card rounded-3xl px-5 py-10 text-center">
            <p className="text-muted-foreground">등록된 장소가 없습니다.</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-border-subtle divide-y">
              {places.map((place) => (
                <Link
                  key={place.id}
                  href={`/admin/places?placeId=${place.id}`}
                  className="block px-4 py-4 hover:bg-neutral-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground text-[16px] font-semibold">
                        {place.name}
                      </p>
                      <div className="text-muted-foreground mt-1 flex flex-wrap gap-2 text-[13px]">
                        {place.floorName && <span>{place.floorName}</span>}
                        <span>{place.tags.length}개 태그</span>
                      </div>
                      {place.description ? (
                        <p className="text-muted-foreground mt-3 text-[13px]">
                          {place.description}
                        </p>
                      ) : null}
                    </div>
                    <ChevronRightIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        );

      case '층':
        return floors.length === 0 ? (
          <div className="bg-card rounded-3xl px-5 py-10 text-center">
            <p className="text-muted-foreground">등록된 층이 없습니다.</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-border-subtle divide-y">
              {floors.map((floor) => (
                <div key={floor.id} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-foreground text-[15px] font-semibold">
                        {floor.name}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[13px]">
                        {placeCountByFloor.get(floor.id) ?? 0}개 장소
                      </p>
                    </div>
                    <ChevronRightIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );

      case '태그':
        return tags.length === 0 ? (
          <div className="bg-card rounded-3xl px-5 py-10 text-center">
            <p className="text-muted-foreground">등록된 태그가 없습니다.</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-border-subtle divide-y">
              {tags.map((tag) => (
                <div key={tag.id} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-foreground text-[15px] font-semibold">
                        #{tag.name}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[13px]">
                        {placeCountByTag.get(tag.id) ?? 0}개 장소
                      </p>
                    </div>
                    <ChevronRightIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <BrandHeader
        action={
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ChevronLeftIcon className="h-5 w-5" />
            </Button>
          </Link>
        }
      />

      <main className="flex-1 pb-24">
        <div className="border-border-subtle flex items-center justify-between border-b px-5 py-4">
          <h1 className="text-headline2">장소 관리</h1>
          <Button size="sm">
            <PlusIcon className="mr-1 h-4 w-4" />
            추가
          </Button>
        </div>

        <div className="border-border-subtle flex gap-2 border-b px-5 py-3">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-body-small rounded-full px-3 py-1.5 transition-colors ${
                activeTab === tab
                  ? 'bg-fg-strong text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="px-5 pt-5">{renderContent()}</div>
      </main>
    </>
  );
}
