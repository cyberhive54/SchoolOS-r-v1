'use client';

import { useAuthStore } from '@/store/auth.store';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

const MANAGE_ROLES = ['super_admin', 'admin'];

interface NavItem {
  label: string;
  href: string;
  icon: string;
  active: boolean;
  subItems?: { label: string; href: string; manageOnly?: boolean }[];
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Platform',
    items: [
      { label: 'Dashboard', href: '/', icon: '⊞', active: true },
      { label: 'Settings', href: '/settings', icon: '⚙', active: true },
    ],
  },
  {
    group: 'Core Domain',
    items: [
      {
        label: 'Students',
        href: '/students',
        icon: '👥',
        active: true,
        subItems: [
          { label: 'All Students', href: '/students' },
          { label: 'Bulk Import', href: '/students/bulk-import', manageOnly: true },
          { label: 'Settings', href: '/students/settings', manageOnly: true },
        ],
      },
      { label: 'Admissions', href: '/admissions', icon: '📋', active: false },
      {
        label: 'Human Resources',
        href: '/hr',
        icon: '👨‍💼',
        active: true,
        subItems: [
          { label: 'Staff Directory', href: '/hr/staff' },
          { label: 'Leave Management', href: '/hr/leave' },
          { label: 'Attendance', href: '/hr/attendance' },
          { label: 'Settings', href: '/hr/settings', manageOnly: true },
        ],
      },
    ],
  },
  {
    group: 'Academic Operations',
    items: [
      {
        label: 'Academics',
        href: '/academics',
        icon: '📚',
        active: true,
        subItems: [
          { label: 'Academic Years', href: '/academics/years', manageOnly: true },
          { label: 'Classes', href: '/academics/classes', manageOnly: true },
          { label: 'Sections', href: '/academics/sections', manageOnly: true },
          { label: 'Class-Sections', href: '/academics/class-sections', manageOnly: true },
          { label: 'Subjects', href: '/academics/subjects', manageOnly: true },
          { label: 'Subject Groups', href: '/academics/subject-groups', manageOnly: true },
          { label: 'Assignments', href: '/academics/assignments', manageOnly: true },
          { label: 'Promotion', href: '/academics/promotion', manageOnly: true },
        ],
      },
      { label: 'Attendance', href: '/attendance', icon: '✓', active: false },
      { label: 'Examinations', href: '/exams', icon: '📝', active: false },
    ],
  },
  {
    group: 'Financial',
    items: [
      { label: 'Fees', href: '/fees', icon: '₹', active: false },
      { label: 'Payroll', href: '/payroll', icon: '💰', active: false },
    ],
  },
  {
    group: 'Communication',
    items: [
      { label: 'Messages', href: '/messages', icon: '✉', active: false },
      { label: 'Notices', href: '/notices', icon: '📢', active: false },
    ],
  },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const canManage = user && MANAGE_ROLES.includes(user.role);

  async function handleLogout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      logout();
      router.push('/login');
    }
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col h-full">
      <div className="h-14 flex items-center px-4 border-b border-slate-100">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm font-bold mr-2.5"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          S
        </div>
        <span className="font-semibold text-slate-900 text-sm">SchoolOS</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.group} className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 mb-1">
              {group.group}
            </p>
            {group.items.map((item) => {
              const isParentActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const showSubItems = item.subItems && item.active && isParentActive;

              return (
                <div key={item.href}>
                  <button
                    onClick={() => item.active && router.push(item.href)}
                    disabled={!item.active}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors text-left',
                      item.active
                        ? pathname === item.href
                          ? 'font-medium text-white'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        : 'text-slate-300 cursor-default',
                    )}
                    style={
                      item.active && pathname === item.href
                        ? { backgroundColor: 'var(--color-primary)', borderRadius: 'var(--radius-md)' }
                        : { borderRadius: 'var(--radius-md)' }
                    }
                  >
                    <span className="text-base w-5 text-center">{item.icon}</span>
                    {item.label}
                    {!item.active && (
                      <span className="ml-auto text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">
                        Soon
                      </span>
                    )}
                  </button>

                  {showSubItems && (
                    <div className="ml-4 mt-0.5 mb-1 border-l border-slate-100 pl-2 space-y-0.5">
                      {item.subItems!.map((sub) => {
                        if (sub.manageOnly && !canManage) return null;
                        const isSubActive = pathname === sub.href;
                        return (
                          <button
                            key={sub.href}
                            onClick={() => router.push(sub.href)}
                            className={cn(
                              'w-full text-left text-xs px-2 py-1 rounded-md transition-colors',
                              isSubActive
                                ? 'font-medium text-blue-600 bg-blue-50'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50',
                            )}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {user?.first_name?.[0] ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={() => void handleLogout()}
          className="w-full text-xs text-slate-500 hover:text-slate-800 text-left px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
