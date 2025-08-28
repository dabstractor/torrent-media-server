// src/components/plex/PlexStatusDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { PlexServerInfo } from '@/lib/types/plex';

const PlexStatusDashboard: React.FC = () => {
  const [serverInfo, setServerInfo] = useState<PlexServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlexStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/plex/status');
        
        if (!response.ok) {
          throw new Error('Failed to fetch Plex status');
        }
        
        const data = await response.json();
        setServerInfo(data.server);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchPlexStatus();
    
    // Poll for status every 30 seconds
    const interval = setInterval(fetchPlexStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Plex Status</h2>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Plex Status</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error: {error}</p>
          <p className="text-sm mt-2">Please check your Plex configuration.</p>
        </div>
      </div>
    );
  }

  if (!serverInfo) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Plex Status</h2>
        <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
          <p>Plex server is offline or not configured.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Plex Status</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h3 className="font-semibold text-lg mb-2">Server Information</h3>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Name:</span> {serverInfo.name}
            </div>
            <div>
              <span className="font-medium">Version:</span> {serverInfo.version}
            </div>
            <div>
              <span className="font-medium">Platform:</span> {serverInfo.platform} {serverInfo.platformVersion}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span> {serverInfo.updatedAt.toLocaleString()}
            </div>
          </div>
        </div>
        
        <div className="border rounded p-4">
          <h3 className="font-semibold text-lg mb-2">Connection Status</h3>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-green-700 font-medium">Online</span>
          </div>
          <div className="mt-4">
            <a 
              href="http://localhost:32400/web" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Open Plex Web App
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlexStatusDashboard;