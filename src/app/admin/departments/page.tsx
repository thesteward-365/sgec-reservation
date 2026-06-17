'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeftIcon,
  PlusIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  Bars3Icon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Department {
  id: number;
  name: string;
  order: number;
}

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // 추가 기능 상태
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const newDeptInputRef = useRef<HTMLInputElement>(null);
  const isAddingDeptRef = useRef(false);

  // 수정 기능 상태
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // 정렬 모드 상태
  const [sortMode, setSortMode] = useState(false);
  const [sortItems, setSortItems] = useState<Department[]>([]);
  const [origSortIds, setOrigSortIds] = useState<number[]>([]);
  const [savingSort, setSavingSort] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function fetchDepartments() {
    try {
      const res = await fetch('/api/departments');
      const data: Department[] = await res.json();
      setDepartments(data);
    } catch (e) {
      console.error(e);
      toast.error('소속 목록을 가져오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDepartments();
  }, []);

  // 소속 추가
  async function handleAddDept() {
    if (isAddingDeptRef.current) return;
    const name = newDeptName.trim();
    if (!name) return;

    isAddingDeptRef.current = true;
    setAddingDept(true);
    try {
      const res = await fetch('/api/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '추가 실패');
        return;
      }
      toast.success('소속이 추가되었습니다.');
      setDepartments((prev) => [...prev, data]);
      setNewDeptName('');
      newDeptInputRef.current?.focus();
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setAddingDept(false);
      isAddingDeptRef.current = false;
    }
  }

  // 소속 이름 수정
  async function handleRenameDept(id: number) {
    const name = editingDeptName.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || '수정 실패');
        return;
      }
      toast.success('소속 이름이 수정되었습니다.');
      setDepartments((prev) => prev.map((d) => (d.id === id ? data : d)));
      setEditingDeptId(null);
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    }
  }

  // 소속 삭제
  async function handleDeleteDept(id: number, name: string) {
    if (
      !confirm(
        `'${name}' 소속을 삭제하시겠습니까?\n해당 소속의 사용자 데이터는 유지됩니다.`
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/departments/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || '삭제 중 오류가 발생했습니다.');
        return;
      }
      toast.success('소속이 삭제되었습니다.');
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    }
  }

  // 정렬 모드 진입
  const enterSortMode = () => {
    setSortItems([...departments]);
    setOrigSortIds(departments.map((d) => d.id));
    setSortMode(true);
  };

  // 정렬 저장
  const saveSortOrder = async () => {
    setSavingSort(true);
    try {
      const res = await fetch('/api/admin/departments/order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderedIds: sortItems.map((d) => d.id),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || '순서 저장 실패');
      }
      toast.success('정렬 순서가 저장되었습니다.');
      setSortMode(false);
      setDepartments(sortItems);
    } catch (err: any) {
      toast.error(err.message || '오류가 발생했습니다.');
    } finally {
      setSavingSort(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSortItems((items) => {
        const oldIdx = items.findIndex((i) => i.id === active.id);
        const newIdx = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIdx, newIdx);
      });
    }
  };

  const hasSortChanges = useMemo(() => {
    if (!sortMode) return false;
    return sortItems.map((d) => d.id).join(',') !== origSortIds.join(',');
  }, [sortMode, sortItems, origSortIds]);

  return (
    <div className="min-h-screen bg-(--color-neutral-150) pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 flex h-14 items-center bg-(--color-neutral-150) px-4">
        {sortMode ? (
          <p className="text-body text-foreground w-full text-center font-bold">
            소속 정렬 중
          </p>
        ) : (
          <>
            <Button
              variant="text"
              color="secondary"
              size="medium"
              onClick={() => router.push('/admin/users')}
              className="min-w-0 px-2"
              aria-label="뒤로가기"
            >
              <ChevronLeftIcon className="size-5" />
            </Button>
            <p className="text-body text-foreground flex-1 text-center font-bold">
              소속 관리
            </p>
            <Button
              variant="text"
              color="secondary"
              size="small"
              onClick={enterSortMode}
              disabled={departments.length <= 1}
            >
              정렬
            </Button>
          </>
        )}
      </header>

      <main className="mx-auto mt-2 max-w-md space-y-4 px-5">
        {/* 새 소속 추가 인풋 (정렬 모드가 아닐 때만 노출) */}
        {!sortMode && (
          <Card className="p-4">
            <div className="flex gap-2">
              <Input
                ref={newDeptInputRef}
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.nativeEvent.isComposing) return;
                    handleAddDept();
                  }
                }}
                placeholder="새 소속 입력 (ex: 청년회)"
                maxLength={50}
                className="bg-muted/40 placeholder:text-muted-foreground focus-visible:bg-white h-10 flex-1 px-3 text-[14px]"
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddDept}
                disabled={addingDept || !newDeptName.trim()}
                className="h-10 shrink-0 px-4"
              >
                <PlusIcon className="mr-1 h-5 w-5" />
                추가
              </Button>
            </div>
          </Card>
        )}

        {/* 소속 목록 카드 */}
        <Card className="overflow-hidden p-0">
          {loading ? (
            <div className="space-y-2.5 p-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-neutral-100"
                />
              ))}
            </div>
          ) : departments.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center text-[14px] font-medium">
              등록된 소속이 없습니다.
            </div>
          ) : sortMode ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortItems.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="divide-y divide-neutral-100">
                  {sortItems.map((dept) => (
                    <SortableDeptItem key={dept.id} dept={dept} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {departments.map((dept) => (
                <li
                  key={dept.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  {editingDeptId === dept.id ? (
                    <>
                      <Input
                        ref={editInputRef}
                        type="text"
                        value={editingDeptName}
                        onChange={(e) => setEditingDeptName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameDept(dept.id);
                          if (e.key === 'Escape') setEditingDeptId(null);
                        }}
                        maxLength={50}
                        autoFocus
                        className="h-8 flex-1 px-2.5 py-1 text-[14px]"
                      />
                      <button
                        onClick={() => handleRenameDept(dept.id)}
                        className="text-foreground flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 transition-colors hover:bg-neutral-200"
                        aria-label="저장"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setEditingDeptId(null)}
                        className="text-muted-foreground hover:text-foreground text-[12px] font-medium transition-colors"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <BuildingOfficeIcon className="text-muted-foreground h-4 w-4 shrink-0" />
                      <span className="text-foreground flex-1 text-[14px] font-medium">
                        {dept.name}
                      </span>
                      <button
                        onClick={() => {
                          setEditingDeptId(dept.id);
                          setEditingDeptName(dept.name);
                        }}
                        className="text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
                        aria-label="이름 수정"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDept(dept.id, dept.name)}
                        className="text-muted-foreground hover:text-danger flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-red-50"
                        aria-label="삭제"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>

      {/* 정렬 하단 바 */}
      {sortMode && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md gap-3 border-t border-neutral-100 bg-white px-5 py-4 shadow-lg">
          <Button
            variant="outlined"
            color="secondary"
            className="h-11 flex-1"
            onClick={() => setSortMode(false)}
          >
            취소
          </Button>
          <Button
            variant="contained"
            color="primary"
            className="h-11 flex-1"
            disabled={savingSort || !hasSortChanges}
            onClick={saveSortOrder}
          >
            {savingSort ? '저장 중...' : '순서 저장'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── 드래그앤드롭 아이템 컴포넌트 ──────────────────────────
function SortableDeptItem({ dept }: { dept: Department }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dept.id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 bg-white px-5 py-3.5"
    >
      <div
        className="min-w-0 shrink-0 cursor-grab touch-none p-1.5 text-neutral-400 transition-colors hover:text-neutral-600 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label="드래그 핸들"
      >
        <Bars3Icon className="size-5" />
      </div>
      <BuildingOfficeIcon className="text-muted-foreground h-4 w-4 shrink-0" />
      <span className="text-foreground flex-1 text-[14px] font-semibold select-none">
        {dept.name}
      </span>
    </li>
  );
}
