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
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Plex Status</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Plex Status</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Plex Status</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">Plex server not configured or unreachable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Plex Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium text-gray-900">Server Information</h3>
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="text-sm font-medium text-gray-900">{serverInfo.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Version</dt>
              <dd className="text-sm font-medium text-gray-900">{serverInfo.version}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Platform</dt>
              <dd className="text-sm font-medium text-gray-900">{serverInfo.platform}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Last Updated</dt>
              <dd className="text-sm font-medium text-gray-900">
                {new Date(serverInfo.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Status</h3>
          <div className="mt-2 flex items-center">
            <div className="flex-shrink-0 h-4 w-4 rounded-full bg-green-400"></div>
            <span className="ml-2 text-sm text-gray-900">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlexStatusDashboard;