'use client';

import React from 'react';
import { BackupManagement } from '@/components/settings/backups';

const BackupSettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Backup & Restore</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create backups of your settings, restore from previous backups, and manage backup files.
        </p>
      </div>
      
      <BackupManagement />
    </div>
  );
};

export default BackupSettingsPage;