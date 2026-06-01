'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { signupSchema } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { Eye, EyeOff } from 'lucide-react';

type FormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  });

  const username = watch('username');
  const password = watch('password');
  const name = watch('name');
  const phoneNumber = watch('phoneNumber');

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        toast.success(
          '회원가입이 완료되었습니다! 관리자 승인 후 이용 가능합니다.'
        );
        router.push('/pending');
      } else {
        toast.error(result.error || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-6 pt-14 pb-10">
      {/* 로고 헤더 */}
      <div className="flex items-center gap-2.5">
        <Image
          src="/logos/logo-with-text.png"
          alt="샘깊은교회 로고"
          width={625}
          height={200}
          className="h-12 w-auto shrink-0"
          priority
          loading="eager"
        />
      </div>

      {/* 인사말 */}
      <div className="mt-12 mb-8">
        <h1 className="text-title-1 text-foreground font-bold">
          가입을 환영합니다.
        </h1>
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

        {/* 이름 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">이름</Label>
          <div className="relative">
            <Input
              id="name"
              placeholder="실명을 입력하세요"
              {...register('name')}
              className={cn(name && 'pr-10')}
            />
            {name && (
              <button
                type="button"
                aria-label="이름 지우기"
                onClick={() => setValue('name', '')}
                className="bg-muted hover:bg-muted-foreground/20 absolute top-1/2 right-3 flex size-5 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
              >
                <XMarkIcon className="text-muted-foreground size-3" />
              </button>
            )}
          </div>
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        {/* 전화번호 */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phoneNumber">전화번호</Label>
          <div className="relative">
            <Input
              id="phoneNumber"
              placeholder="01012345678"
              {...register('phoneNumber')}
              className={cn(phoneNumber && 'pr-10')}
            />
            {phoneNumber && (
              <button
                type="button"
                aria-label="전화번호 지우기"
                onClick={() => setValue('phoneNumber', '')}
                className="bg-muted hover:bg-muted-foreground/20 absolute top-1/2 right-3 flex size-5 -translate-y-1/2 items-center justify-center rounded-full transition-colors"
              >
                <XMarkIcon className="text-muted-foreground size-3" />
              </button>
            )}
          </div>
          {errors.phoneNumber && (
            <p className="text-sm text-red-500">{errors.phoneNumber.message}</p>
          )}
        </div>
        <p className="text-body-xs text-muted-foreground mt-4 text-center">
          가입 시{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            개인정보 처리방침
          </Link>
          에 동의하는 것으로 간주합니다.
        </p>
        <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
          {isLoading ? '가입 중...' : '가입하기'}
        </Button>
      </form>

      {/* 하단 링크 */}
      <p className="text-body-sm text-muted-foreground mt-auto pt-10 text-center">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="font-semibold">
          로그인하기
        </Link>
      </p>
    </div>
  );
}
