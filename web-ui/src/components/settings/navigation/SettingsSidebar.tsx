'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationItem {
  href: string;
  label: string;
  exact?: boolean;
}

const navigationItems: NavigationItem[] = [
  { href: '/settings', label: 'General', exact: true },
  { href: '/settings/downloads', label: 'Downloads' },
  { href: '/settings/bandwidth', label: 'Bandwidth' },
  { href: '/settings/transmission', label: 'Transmission' },
  { href: '/settings/plex', label: 'Plex Integration' },
  { href: '/settings/advanced', label: 'Advanced' },
  { href: '/settings/backup', label: 'Backup & Restore' },
];

export default function SettingsSidebar() {
  const pathname = usePathname();
  
  return (
    <nav className="space-y-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Settings</h3>
      <ul className="space-y-2">
        {navigationItems.map((item) => {
          // Handle exact matching for index route
          const isActive = item.exact 
            ? pathname === item.href
            : pathname.startsWith(item.href);
            
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`
                  block px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150
                  ${isActive
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                  }
                `}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}