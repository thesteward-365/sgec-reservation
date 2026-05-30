'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { migrationSchema } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { Eye, EyeOff } from 'lucide-react';

type FormData = z.infer<typeof migrationSchema>;

export default function SetupAccountPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(migrationSchema),
    mode: 'onChange',
  });

  const username = watch('username');
  const password = watch('password');
  const confirmPassword = watch('confirmPassword');

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/setup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username,
          password: data.password,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '계정 설정에 실패했습니다.');
      }

      toast.success('계정 설정이 완료되었습니다! 다시 로그인해주세요.');
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login?message=setup_complete');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-6 pt-14 pb-10">
      {/* 로고 헤더 */}
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
        <h1 className="text-title-1 text-foreground font-bold">
          계정 정보 설정
        </h1>
        <p className="text-body text-muted-foreground mt-2">
          서비스 이용을 위해 아이디와 비밀번호를 설정해주세요.
        </p>
      </div>
      {/* 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* 아이디 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">아이디</Label>
          <div className="relative">
            <Input
              id="username"
              placeholder="4~20자 영문 소문자, 숫자"
              {...register('username')}
              className={cn(username && 'pr-10')}
            />
            {username && (
              <button
                type="button"
                aria-label="아이디 지우기"
                onClick={() => setValue('username', '')}
                className="bg-muted hover:bg-muted-foreground/20 absolute top-1/2 right-3 flex size-5 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
              >
                <XMarkIcon className="text-muted-foreground size-3" />
              </button>
            )}
          </div>
          {errors.username && (
            <p className="text-sm text-red-500">{errors.username.message}</p>
          )}
        </div>

        {/* 비밀번호 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">비밀번호</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="8자 이상 영문/숫자/특수문자 포함"
              {...register('password')}
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
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        {/* 비밀번호 확인 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">비밀번호 확인</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="비밀번호를 다시 입력해주세요"
              {...register('confirmPassword')}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
          {isLoading ? '저장 중...' : '설정 완료'}
        </Button>
      </form>
      <form action="/api/auth/logout" method="POST" className="mt-4 w-full">
        <Button type="submit" variant="text" color="primary" className="w-full">
          로그아웃
        </Button>
      </form>
    </div>
  );
}
