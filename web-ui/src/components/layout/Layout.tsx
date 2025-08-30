'use client'

import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { NotificationProvider } from '@/context/NotificationContext';
import ToastContainer from '@/components/common/ToastContainer';

type LayoutProps = {
  children: React.ReactNode;
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <NotificationProvider>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <div className="flex flex-1 relative">
          <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
          <main className="flex-1 p-4 sm:p-6 md:p-8 w-full">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
        <Footer />
        <ToastContainer />
      </div>
    </NotificationProvider>
  );
};

export default Layout;