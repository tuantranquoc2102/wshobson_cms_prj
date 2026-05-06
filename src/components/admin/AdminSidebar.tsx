'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Folder,
  Home,
  Image as ImageIcon,
  Inbox,
  Tag as TagIcon,
  Users as UsersIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/useAuth';
import { hasRole } from '@/lib/roles';
import type { Role } from '@/lib/types';

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  minRole?: Role;
};

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/content', label: 'Content', icon: FileText },
  { href: '/admin/review-queue', label: 'Review queue', icon: Inbox, minRole: 'EDITOR' },
  { href: '/admin/media', label: 'Media', icon: ImageIcon },
  { href: '/admin/categories', label: 'Categories', icon: Folder, minRole: 'EDITOR' },
  { href: '/admin/tags', label: 'Tags', icon: TagIcon, minRole: 'EDITOR' },
  { href: '/admin/users', label: 'Users', icon: UsersIcon, minRole: 'ADMIN' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  if (!user) return null;

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card md:block">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/admin" className="font-semibold tracking-tight">
          CMS Admin
        </Link>
      </div>
      <nav className="space-y-0.5 p-3">
        {NAV.filter((n) => !n.minRole || hasRole(user, n.minRole)).map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                active && 'bg-accent text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
