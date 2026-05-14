'use client';

import { List, ListItem } from '@/components/ui/list';
import { CHANGELOG } from '@/lib/changelog';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export default function AdminChangelogPage() {
  const router = useRouter();

  return (
    <>
      {/* AppBar */}
      <div className="sticky top-0 z-30 bg-(--color-neutral-150)">
        <div className="mx-auto flex h-14 max-w-107.5 items-center px-4">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-neutral-200"
          >
            <ChevronLeftIcon className="text-foreground size-5" />
          </button>
          <p className="text-foreground flex-1 text-center text-[17px] font-bold">
            업데이트 소식
          </p>
          <div className="size-10" />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-8">
          {CHANGELOG.map((entry) => (
            <div key={entry.version} className="space-y-3">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-foreground text-xl font-bold">
                  v{entry.version}
                </h2>
                <span className="text-muted-foreground text-[13px] font-medium">
                  {entry.date}
                </span>
              </div>

              <List className="overflow-hidden rounded-2xl border-none bg-white shadow-sm">
                {entry.items.map((item, index) => (
                  <ListItem
                    key={index}
                    className="text-foreground border-b border-neutral-100 px-5 py-4 text-[14.5px] leading-relaxed font-medium break-keep last:border-b-0"
                  >
                    <span className="mr-2 shrink-0 opacity-40">•</span>
                    <span className="flex-1">{item}</span>
                  </ListItem>
                ))}
              </List>
            </div>
          ))}
        </div>
        <div className="h-10" /> {/* Bottom spacing */}
      </main>
    </>
  );
}
