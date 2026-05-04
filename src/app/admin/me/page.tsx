'use client';

import { BrandHeader } from '@/components/layout/brand-header';

export default function AdminMePage() {
  return (
    <>
      <BrandHeader />
      <main className="flex-1 pb-24">
        <div className="px-5 py-6">
          <h1 className="text-headline1">내 정보</h1>
          <p className="text-body-medium text-muted-foreground mt-2">
            이 페이지는 준비 중입니다.
          </p>
        </div>
      </main>
    </>
  );
}
