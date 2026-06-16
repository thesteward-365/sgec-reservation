'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import {
  BuildingOfficeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface User {
  id: number;
  name: string;
  username: string | null;
  phoneNumber: string;
  departmentId: number | null;
  department: string | null;
  role: 'user' | 'admin';
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  createdAt: string | null;
}

interface Department {
  id: number;
  name: string;
}

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default function EditUserPage({ params }: EditPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const userId = parseInt(id);

  const [user, setUser] = useState<User | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // 필드별 에디트 상태
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState('');

  const [editPhone, setEditPhone] = useState(false);
  const [phoneVal, setPhoneVal] = useState('');

  const [editDept, setEditDept] = useState(false);
  const [deptVal, setDeptVal] = useState<string>('');

  // 비밀번호 재설정 상태
  const [newPassword, setNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (isNaN(userId)) return;

    Promise.all([
      fetch(`/api/admin/users/${userId}`).then((r) => {
        if (!r.ok) throw new Error('사용자 정보를 불러오지 못했습니다.');
        return r.json() as Promise<User>;
      }),
      fetch('/api/departments').then((r) => {
        if (!r.ok) throw new Error('소속 목록을 불러오지 못했습니다.');
        return r.json() as Promise<Department[]>;
      }),
    ])
      .then(([userData, deptsData]) => {
        setUser(userData);
        setNameVal(userData.name);
        setPhoneVal(userData.phoneNumber);
        setDeptVal(userData.departmentId ? String(userData.departmentId) : '');
        setDepartments(deptsData);
      })
      .catch((err) => {
        toast.error(err.message || '오류가 발생했습니다.');
        router.push('/admin/users');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId, router]);

  async function updateField(
    fieldName: 'name' | 'phoneNumber' | 'departmentId',
    value: any
  ) {
    if (!user) return;
    try {
      const body: any = { action: 'force-update' };
      if (fieldName === 'name') body.name = value;
      if (fieldName === 'phoneNumber') body.phoneNumber = value;
      if (fieldName === 'departmentId')
        body.departmentId = value === '' ? null : Number(value);

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '수정 중 오류가 발생했습니다.');
      }

      const updated = await res.json();
      setUser((prev) => (prev ? { ...prev, ...updated } : null));
      toast.success('수정되었습니다.');

      // 에디트 모드 닫기
      if (fieldName === 'name') setEditName(false);
      if (fieldName === 'phoneNumber') setEditPhone(false);
      if (fieldName === 'departmentId') setEditDept(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleResetPassword() {
    if (!user) return;
    if (!newPassword || newPassword.length < 4) {
      toast.error('비밀번호는 최소 4자 이상이어야 합니다.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-password', newPassword }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || '비밀번호 재설정 중 오류가 발생했습니다.'
        );
      }

      toast.success('비밀번호가 성공적으로 재설정되었습니다.');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPwdLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-(--color-neutral-150) p-6">
        <div className="text-muted-foreground text-body animate-pulse font-medium">
          로딩 중...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-(--color-neutral-150) p-6">
        <div className="text-muted-foreground text-body font-medium">
          사용자를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--color-neutral-150) pb-12">
      {/* AppBar 헤더 */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 bg-(--color-neutral-150) px-5">
        <button
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-neutral-200"
          aria-label="뒤로가기"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-foreground text-[17px] font-bold">
          회원 정보 수정
        </h1>
      </header>

      <main className="mx-auto mt-4 max-w-md space-y-5 px-5">
        {/* 회원 기본 정보 카드 */}
        <Card className="p-5">
          <h2 className="text-foreground mb-4 text-[15px] font-bold">
            기본 정보 수정
          </h2>

          <div className="space-y-4 divide-y divide-neutral-100">
            {/* 이름 필드 */}
            <div className="pt-2 pb-2">
              <div className="flex items-center justify-between">
                <Label className="text-caption text-muted-foreground font-semibold">
                  이름
                </Label>
                {!editName && (
                  <button
                    onClick={() => {
                      setNameVal(user.name);
                      setEditName(true);
                    }}
                    className="text-muted-foreground hover:text-primary flex items-center gap-1 text-[13px] font-semibold transition-colors"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                    수정
                  </button>
                )}
              </div>

              {editName ? (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={nameVal}
                    onChange={(e) => setNameVal(e.target.value)}
                    className="flex-1"
                    placeholder="이름 입력"
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => updateField('name', nameVal)}
                    disabled={!nameVal.trim()}
                  >
                    <CheckIcon className="mr-0.5 h-4 w-4" />
                    저장
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    onClick={() => setEditName(false)}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-body text-foreground mt-1.5 font-bold">
                  {user.name}
                </div>
              )}
            </div>

            {/* 전화번호 필드 */}
            <div className="pt-4 pb-2">
              <div className="flex items-center justify-between">
                <Label className="text-caption text-muted-foreground font-semibold">
                  전화번호
                </Label>
                {!editPhone && (
                  <button
                    onClick={() => {
                      setPhoneVal(user.phoneNumber);
                      setEditPhone(true);
                    }}
                    className="text-muted-foreground hover:text-primary flex items-center gap-1 text-[13px] font-semibold transition-colors"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                    수정
                  </button>
                )}
              </div>

              {editPhone ? (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={phoneVal}
                    onChange={(e) => setPhoneVal(e.target.value)}
                    className="flex-1"
                    placeholder="전화번호 입력 (01012345678)"
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => updateField('phoneNumber', phoneVal)}
                    disabled={!/^010\d{8}$/.test(phoneVal)}
                  >
                    <CheckIcon className="mr-0.5 h-4 w-4" />
                    저장
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    onClick={() => setEditPhone(false)}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-body text-foreground mt-1.5 font-bold">
                  {user.phoneNumber.replace(
                    /(\d{3})(\d{4})(\d{4})/,
                    '$1-$2-$3'
                  )}
                </div>
              )}
            </div>

            {/* 소속 필드 */}
            <div className="pt-4 pb-2">
              <div className="flex items-center justify-between">
                <Label className="text-caption text-muted-foreground font-semibold">
                  소속
                </Label>
                {!editDept && (
                  <button
                    onClick={() => {
                      setDeptVal(
                        user.departmentId ? String(user.departmentId) : ''
                      );
                      setEditDept(true);
                    }}
                    className="text-muted-foreground hover:text-primary flex items-center gap-1 text-[13px] font-semibold transition-colors"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                    수정
                  </button>
                )}
              </div>

              {editDept ? (
                <div className="mt-2 flex w-full gap-2">
                  <Select
                    value={deptVal || 'none'}
                    onValueChange={(val) =>
                      setDeptVal(val === 'none' ? '' : val)
                    }
                    size="small"
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="소속 선택 안 함" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">소속 선택 안 함</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={String(dept.id)}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => updateField('departmentId', deptVal)}
                  >
                    <CheckIcon className="mr-0.5 h-4 w-4" />
                    저장
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    onClick={() => setEditDept(false)}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-body text-foreground mt-1.5 flex items-center gap-1 font-bold">
                  <BuildingOfficeIcon className="text-muted-foreground h-4 w-4" />
                  {user.department || '미지정'}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 비밀번호 재설정 카드 */}
        <Card className="p-5">
          <h2 className="text-foreground mb-4 text-[15px] font-bold">
            비밀번호 재설정
          </h2>

          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="newPassword"
                className="text-caption text-muted-foreground font-semibold"
              >
                새 비밀번호
              </Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 입력 (최소 4자)"
              />
            </div>

            <Button
              variant="contained"
              color="primary"
              size="large"
              className="w-full"
              onClick={handleResetPassword}
              disabled={pwdLoading || !newPassword || newPassword.length < 4}
            >
              {pwdLoading ? '변경 중...' : '비밀번호 변경'}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
