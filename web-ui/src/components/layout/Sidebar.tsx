import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Search' }, // Search is now the home page
    { href: '/downloads', label: 'Downloads' },
    { href: '/completed', label: 'Completed' },
    { href: '/services', label: 'Services' },
    { href: '/settings', label: 'Settings' },
  ];
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <aside 
        id="sidebar-nav"
        className={`
          fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 p-4 space-y-4 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:hidden
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        <nav className="flex flex-col space-y-2" role="menubar">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary-500 transition-colors min-h-[44px] flex items-center ${
                pathname === item.href 
                  ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 font-semibold' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}
              role="menuitem"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;