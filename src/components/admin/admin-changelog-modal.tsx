'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CHANGELOG, ChangelogItem } from '@/lib/changelog';

export function AdminChangelogModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const latestEntry = CHANGELOG[0];

  React.useEffect(() => {
    if (!latestEntry) return;

    // Check if the administrator has already dismissed this version
    const dismissedVersion = localStorage.getItem('sgec_admin_changelog_dismissed_version');
    if (dismissedVersion !== latestEntry.version) {
      setIsOpen(true);
    }
  }, [latestEntry]);

  if (!latestEntry || !isOpen) return null;

  const handleClose = () => {
    localStorage.setItem('sgec_admin_changelog_dismissed_version', latestEntry.version);
    setIsOpen(false);
  };

  const handleViewDetails = () => {
    localStorage.setItem('sgec_admin_changelog_dismissed_version', latestEntry.version);
    setIsOpen(false);
    router.push('/admin/changelog');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // If dismissed by clicking overlay or close button, mark as dismissed in local storage as well
        localStorage.setItem('sgec_admin_changelog_dismissed_version', latestEntry.version);
      }
      setIsOpen(open);
    }}>
      <DialogContent className="max-w-lg w-[calc(100%-48px)] p-6 rounded-lg bg-card shadow-(--shadow-4)">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center rounded-full bg-accent-subtle px-2.5 py-0.5 text-xs font-semibold text-primary">
              v{latestEntry.version}
            </span>
          </div>
          <DialogTitle className="text-h5 text-foreground leading-[1.4] font-bold">
            신규 업데이트 안내
          </DialogTitle>
          <DialogDescription className="text-body-sm text-muted-foreground">
            더욱 편리한 서비스 이용을 위해 개선된 사항들을 확인해 보세요.
          </DialogDescription>
        </DialogHeader>

        {/* Changelog Content */}
        <div className="max-h-[300px] overflow-y-auto px-1 py-1 space-y-5 border-t border-b border-neutral-100 my-4 text-left">
          {latestEntry.items.map((item, index) => {
            const isObject = typeof item !== 'string';
            const title = isObject ? (item as ChangelogItem).title : item;
            const details = isObject ? (item as ChangelogItem).details : null;

            return (
              <div key={index} className="space-y-1.5">
                <h4 className="text-foreground text-[14.5px] font-bold flex items-start gap-2 leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="flex-1 break-keep">{title}</span>
                </h4>

                {details && (
                  <ul className="pl-6 space-y-1.5">
                    {details.map((detail, dIndex) => (
                      <li
                        key={dIndex}
                        className="text-muted-foreground relative text-[13px] leading-relaxed break-keep list-disc list-outside marker:text-neutral-300"
                      >
                        {detail}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-6 flex flex-row items-center justify-end gap-2 shrink-0">
          <Button
            variant="outlined"
            color="secondary"
            size="medium"
            onClick={handleViewDetails}
            className="flex-1 text-[13.5px]"
          >
            자세히 보기
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="medium"
            onClick={handleClose}
            className="flex-1 text-[13.5px]"
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
