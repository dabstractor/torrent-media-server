'use client';

import React, { useState, useEffect } from 'react';
import { plexService } from '@/lib/services/PlexService';
import type { PlexServerInfo } from '@/lib/types/plex';

const PlexStatusDashboard: React.FC = () => {
  const [serverInfo, setServerInfo] = useState<PlexServerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const info = await plexService.getServerInfo();
        setServerInfo(info);
        setError(null);
      } catch (err) {
        setError('Failed to fetch Plex status');
        console.error('Error fetching Plex status:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    
    // Poll for status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/10 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Plex Status</h2>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/10 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Plex Status</h2>
        <div className="error-container">
          <p className="error-text">{error}</p>
        </div>
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/10 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Plex Status</h2>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
          <p className="text-yellow-800 dark:text-yellow-200">Plex server not configured or unreachable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/10 p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Plex Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Server Information</h3>
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{serverInfo.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Version</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{serverInfo.version}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Platform</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{serverInfo.platform}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Last Updated</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {new Date(serverInfo.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Status</h3>
          <div className="mt-2 flex items-center">
            <div className="flex-shrink-0 h-4 w-4 rounded-full bg-green-400 dark:bg-green-400"></div>
            <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlexStatusDashboard;