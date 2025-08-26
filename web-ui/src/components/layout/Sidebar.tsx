import React, { useEffect } from 'react';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
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
          fixed md:static top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 p-4 space-y-4 z-50
          transform transition-transform duration-300 ease-in-out
          md:transform-none md:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:block
        `}
      >
        <nav className="flex flex-col space-y-2">
          <a href="#" className="hover:text-primary-500">Search</a>
          <a href="#" className="hover:text-primary-500">Downloads</a>
          <a href="#" className="hover:text-primary-500">Completed</a>
          <a href="#" className="hover:text-primary-500">Settings</a>
          <a href="#" className="hover:text-primary-500">Status</a>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
