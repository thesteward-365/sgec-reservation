'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type SettingsProfileCardProps = {
  name: string;
  phoneNumber: string;
  role: 'user' | 'admin';
};

function getInitials(name: string): string {
  return name.trim().slice(0, 1);
}

export function SettingsProfileCard({
  name,
  phoneNumber,
  role,
}: SettingsProfileCardProps) {
  return (
    <Card className="bg-card gap-0 overflow-hidden rounded-3xl p-0 shadow-(--shadow-1)">
      <CardContent className="from-card flex items-center gap-4 bg-linear-to-br to-neutral-50/90 px-5 py-5">
        <div className="bg-background text-primary flex size-14 shrink-0 items-center justify-center rounded-full text-[18px] font-bold shadow-sm">
          {getInitials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-[18px] font-bold">
            {name}
          </p>
          <p className="text-muted-foreground mt-1 truncate text-[13px]">
            {phoneNumber}
          </p>
        </div>
        {role === 'admin' && (
          <Badge variant="subtle" color="blue">
            관리자
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
