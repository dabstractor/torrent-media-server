import React from 'react';

type HeaderProps = {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
};

const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="text-xl font-bold">Torrent UI</div>
        <div className="hidden md:flex space-x-4">
          <a href="#" className="hover:text-primary-500">Search</a>
          <a href="#" className="hover:text-primary-500">Downloads</a>
          <a href="#" className="hover:text-primary-500">Completed</a>
          <a href="#" className="hover:text-primary-500">Settings</a>
          <a href="#" className="hover:text-primary-500">Status</a>
        </div>
        <button 
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          aria-expanded={isSidebarOpen}
          aria-controls="sidebar-nav"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
