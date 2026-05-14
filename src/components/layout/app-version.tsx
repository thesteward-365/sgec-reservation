'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import pkg from '../../../package.json';

export const AppVersion = () => {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  const versionText = (
    <span className="text-muted-foreground block text-[12px] transition-colors hover:text-foreground">
      v{pkg.version} · 샘깊은교회 문화사역 장소방
    </span>
  );

  return (
    <div className="pt-2 text-center">
      {isAdmin ? (
        <Link href="/admin/changelog" className="inline-block py-1 active:opacity-60">
          {versionText}
        </Link>
      ) : (
        <div className="py-1">
          {versionText}
        </div>
      )}
    </div>
  );
};
