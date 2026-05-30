'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SettingsActionRowProps = {
  icon: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  danger?: boolean;
};

export function SettingsActionRow({
  icon,
  label,
  description,
  onClick,
  danger,
}: SettingsActionRowProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-background shadow-1 flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left transition-colors',

        danger ? 'text-destructive hover:bg-destructive/10' : 'hover:bg-muted'
      )}
    >
      <span
        className={cn(
          'size-5 shrink-0',
          danger ? 'text-destructive' : 'text-foreground'
        )}
      >
        {icon}
      </span>
      <span className="block text-[15px] font-semibold">{label}</span>
    </button>
  );
}
