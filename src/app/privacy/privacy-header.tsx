'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

export function PrivacyHeader() {
  const router = useRouter();

  const handleBack = () => {
    // 이전 페이지가 있으면 뒤로 가고, 없으면 로그인 페이지로 이동
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-white px-4">
      <button
        onClick={handleBack}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-medium"
      >
        <ChevronLeftIcon className="h-5 w-5" />
        <span>뒤로가기</span>
      </button>
      <h1 className="ml-4 text-lg font-bold">개인정보 처리방침</h1>
    </header>
  );
}
