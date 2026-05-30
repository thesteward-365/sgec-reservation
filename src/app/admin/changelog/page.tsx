'use client';

import { List, ListItem } from '@/components/ui/list';
import { CHANGELOG, ChangelogItem } from '@/lib/changelog';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminChangelogPage() {
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  );

  const toggleItem = (version: string, index: number) => {
    const key = `${version}-${index}`;
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isExpanded = (version: string, index: number) => {
    return !!expandedItems[`${version}-${index}`];
  };

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

              <List className="overflow-hidden rounded-lg border-none bg-white shadow-sm">
                {entry.items.map((item, index) => {
                  const isObject = typeof item !== 'string';
                  const title = isObject ? (item as ChangelogItem).title : item;
                  const details = isObject
                    ? (item as ChangelogItem).details
                    : null;
                  const expanded = isExpanded(entry.version, index);

                  return (
                    <div
                      key={index}
                      className="border-b border-neutral-100 last:border-b-0"
                    >
                      <ListItem
                        className={cn(
                          'text-foreground flex items-start gap-2 px-5 py-4 text-[14.5px] leading-relaxed font-medium break-keep',
                          details && 'cursor-pointer hover:bg-neutral-50/50'
                        )}
                        onClick={() =>
                          details && toggleItem(entry.version, index)
                        }
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300" />
                        <span className="flex-1">{title}</span>
                        {details && (
                          <ChevronDownIcon
                            className={cn(
                              'mt-0.5 size-4 shrink-0 text-neutral-400 transition-transform duration-200',
                              expanded && 'rotate-180'
                            )}
                          />
                        )}
                      </ListItem>

                      {details && (
                        <div
                          className={cn(
                            'grid transition-all duration-200 ease-in-out',
                            expanded
                              ? 'grid-rows-[1fr] opacity-100'
                              : 'grid-rows-[0fr] opacity-0'
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="bg-neutral-50/50 px-5 pt-1 pb-4">
                              <ul className="space-y-2.5 pl-3.5">
                                {details.map((detail, dIndex) => (
                                  <li
                                    key={dIndex}
                                    className="text-muted-foreground relative text-[13.5px] leading-relaxed break-keep"
                                  >
                                    <span className="absolute top-2.5 -left-3.5 h-1 w-1 rounded-full bg-neutral-300" />
                                    {detail}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </List>
            </div>
          ))}
        </div>
        <div className="h-10" /> {/* Bottom spacing */}
      </main>
    </>
  );
}
