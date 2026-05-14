'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('message') === 'setup_complete') {
      setMessage('계정 설정이 완료되었습니다. 새로운 정보로 로그인해주세요.');
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? '로그인에 실패했습니다.');
        return;
      }

      const { role, status } = data.user || {};
      if (status === 'pending') {
        router.push('/pending');
      } else if (status === 'rejected') {
        toast.error(
          '승인 거부된 계정입니다. 자세한 문의는 관리자에게 연락해주세요.'
        );
        return;
      } else if (role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/reserve');
      }
    } catch {
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col px-6 pt-14 pb-10">
      {/* 로고 헤더 — 가로 한 줄, 페이지 최상단 */}
      <div className="mb-12 flex items-center gap-2.5">
        <Image
          src="/logos/logo-default.svg"
          alt="샘깊은교회 로고"
          width={28}
          height={40}
          priority
        />
        <span className="text-body-sm text-foreground font-bold tracking-tight">
          샘깊은교회 문화사역
        </span>
      </div>

      {/* 인사말 */}
      <div className="mb-8">
        <h1 className="text-title-1 text-foreground font-bold">반가워요!</h1>
        <p className="text-body text-muted-foreground mt-2">
          기쁨과 감사함으로 섬깁시다.
        </p>
      </div>

      {message && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-700 border border-green-200">
          {message}
        </div>
      )}

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 아이디 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">아이디</Label>
          <div className="relative">
            <Input
              id="username"
              type="text"
              placeholder="아이디를 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={cn(username && 'pr-10')}
            />
            {username && (
              <button
                type="button"
                aria-label="아이디 지우기"
                onClick={() => setUsername('')}
                className="bg-muted hover:bg-muted-foreground/20 absolute top-1/2 right-3 flex size-5 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
              >
                <XMarkIcon className="text-muted-foreground size-3" />
              </button>
            )}
          </div>
        </div>

        {/* 비밀번호 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* 로그인 상태 유지 */}
        <label className="flex cursor-pointer items-center gap-2.5 select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="accent-primary size-4 cursor-pointer rounded-sm"
          />
          <span className="text-body-sm text-muted-foreground">
            로그인 상태 유지
          </span>
        </label>

        <Button type="submit" className="mt-2 w-full" disabled={loading}>
          {loading ? '로그인 중...' : '로그인하기'}
        </Button>
      </form>

      {/* 하단 링크 — 남는 공간이 있으면 하단으로 */}
      <p className="text-body-sm text-muted-foreground mt-auto pt-10 text-center">
        아직 계정이 없으신가요?{' '}
        <Link href="/signup" className="font-semibold">
          계정만들기
        </Link>
      </p>
    </div>
  );
}
