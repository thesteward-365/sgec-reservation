'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandHeader } from '@/components/layout/brand-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  UserIcon,
  CalendarIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export default function AdminMePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('정연희');
  const [phoneNumber, setPhoneNumber] = useState('010-4567-8901');
  const [tempName, setTempName] = useState(name);
  const [tempPhoneNumber, setTempPhoneNumber] = useState(phoneNumber);

  const handleEdit = () => {
    setTempName(name);
    setTempPhoneNumber(phoneNumber);
    setIsEditing(true);
  };

  const handleSave = () => {
    setName(tempName);
    setPhoneNumber(tempPhoneNumber);
    setIsEditing(false);
    // 실제 API 호출
  };

  const handleCancel = () => {
    setTempName(name);
    setTempPhoneNumber(phoneNumber);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    // 실제 로그아웃 API 호출
    router.push('/login');
  };

  return (
    <>
      <BrandHeader />

      <main className="flex-1 pb-24">
        <div className="space-y-6 p-5">
          {/* 프로필 카드 */}
          <Card className="p-5">
            <div className="flex items-center gap-4">
              {/* 아바타 */}
              <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
                <span className="text-headline1 text-muted-foreground font-semibold">
                  {name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </span>
              </div>

              {/* 프로필 정보 */}
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="text-headline2">{name}</h2>
                  <Badge variant="solid" color="neutral">관리자</Badge>
                </div>
                <p className="text-body-medium text-muted-foreground">
                  {phoneNumber}
                </p>
              </div>

              {/* 수정 버튼 */}
              {!isEditing && (
                <Button variant="secondary" size="sm" onClick={handleEdit}>
                  <PencilIcon className="mr-1 h-4 w-4" />
                  수정
                </Button>
              )}
            </div>

            {/* 수정 모드 */}
            {isEditing && (
              <div className="border-border-subtle mt-4 space-y-4 border-t pt-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">전화번호</Label>
                    <Input
                      id="phone"
                      value={tempPhoneNumber}
                      onChange={(e) => setTempPhoneNumber(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave}>
                    <CheckIcon className="mr-1 h-4 w-4" />
                    저장
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleCancel}>
                    <XMarkIcon className="mr-1 h-4 w-4" />
                    취소
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* 메뉴 목록 */}
          <div className="space-y-3">
            {/* 사용자 페이지로 이동 */}
            <Link href="/reserve">
              <Card className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                      <UserIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-body-medium font-semibold">
                        사용자 페이지로 이동
                      </p>
                      <p className="text-body-small text-muted-foreground">
                        일반 사용자 모드로 전환합니다
                      </p>
                    </div>
                  </div>
                  <ArrowRightOnRectangleIcon className="text-muted-foreground h-5 w-5" />
                </div>
              </Card>
            </Link>

            {/* Google Calendar 연동 */}
            <Link href="/admin/calendar">
              <Card className="p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
                      <CalendarIcon className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-body-medium font-semibold">
                        Google Calendar 연동
                      </p>
                      <p className="text-body-small text-muted-foreground">
                        캘린더 동기화 설정을 관리합니다
                      </p>
                    </div>
                  </div>
                  <ArrowRightOnRectangleIcon className="text-muted-foreground h-5 w-5" />
                </div>
              </Card>
            </Link>

            {/* 로그아웃 */}
            <Card className="border-red-200 p-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                    <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-body-medium font-semibold text-red-600">
                      로그아웃
                    </p>
                    <p className="text-body-small text-muted-foreground">
                      계정에서 로그아웃합니다
                    </p>
                  </div>
                </div>
                <ArrowRightOnRectangleIcon className="h-5 w-5 text-red-600" />
              </button>
            </Card>
          </div>

          {/* 버전 정보 */}
          <div className="border-border-subtle border-t pt-4 text-center">
            <p className="text-body-small text-muted-foreground">
              v1.0.0 · 샘깊은교회 문화사역 장소방
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
