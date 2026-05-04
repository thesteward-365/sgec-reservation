'use client';

import { useState } from 'react';
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

// 더미 데이터
const PLACES = [
  {
    id: 1,
    name: '본당',
    floor: '1층',
    capacity: 200,
    tags: ['예배', '대형모임'],
  },
  {
    id: 2,
    name: '카페 공간',
    floor: '2층',
    capacity: 50,
    tags: ['소모임', '휴식'],
  },
  {
    id: 3,
    name: '소예배실',
    floor: 'B1층',
    capacity: 30,
    tags: ['예배', '소모임'],
  },
];

const FLOORS = [
  { id: 1, name: '1층', placesCount: 5 },
  { id: 2, name: '2층', placesCount: 3 },
  { id: 3, name: 'B1층', placesCount: 2 },
];

const TAGS = [
  { id: 1, name: '예배', placesCount: 8 },
  { id: 2, name: '소모임', placesCount: 12 },
  { id: 3, name: '대형모임', placesCount: 3 },
  { id: 4, name: '휴식', placesCount: 5 },
];

export default function PlacesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('장소');

  const renderContent = () => {
    switch (activeTab) {
      case '장소':
        return (
          <div className="divide-border-subtle divide-y">
            {PLACES.map((place) => (
              <div
                key={place.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="flex-1">
                  <h3 className="text-body-medium mb-1 font-semibold">
                    {place.name}
                  </h3>
                  <div className="text-body-small text-muted-foreground flex items-center gap-2">
                    <span>{place.floor}</span>
                    <span>•</span>
                    <span>정원 {place.capacity}명</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    {place.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ChevronRightIcon className="text-muted-foreground h-5 w-5" />
              </div>
            ))}
          </div>
        );

      case '층':
        return (
          <div className="divide-border-subtle divide-y">
            {FLOORS.map((floor) => (
              <div
                key={floor.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="flex-1">
                  <h3 className="text-body-medium mb-1 font-semibold">
                    {floor.name}
                  </h3>
                  <p className="text-body-small text-muted-foreground">
                    {floor.placesCount}개 장소
                  </p>
                </div>
                <ChevronRightIcon className="text-muted-foreground h-5 w-5" />
              </div>
            ))}
          </div>
        );

      case '태그':
        return (
          <div className="divide-border-subtle divide-y">
            {TAGS.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="flex-1">
                  <h3 className="text-body-medium mb-1 font-semibold">
                    #{tag.name}
                  </h3>
                  <p className="text-body-small text-muted-foreground">
                    {tag.placesCount}개 장소
                  </p>
                </div>
                <ChevronRightIcon className="text-muted-foreground h-5 w-5" />
              </div>
            ))}
          </div>
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
        {/* 헤더 */}
        <div className="border-border-subtle flex items-center justify-between border-b px-5 py-4">
          <h1 className="text-headline2">장소 관리</h1>
          <Button size="sm">
            <PlusIcon className="mr-1 h-4 w-4" />
            추가
          </Button>
        </div>

        {/* 탭 */}
        <div className="border-border-subtle flex border-b px-5 py-3">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-body-medium rounded-lg px-4 py-2 transition-colors ${
                activeTab === tab
                  ? 'bg-fg-strong text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1">{renderContent()}</div>
      </main>
    </>
  );
}
