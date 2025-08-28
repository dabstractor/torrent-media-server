// src/hooks/usePlex.ts
'use client';

import { useState, useEffect } from 'react';
import { PlexServerInfo } from '@/lib/types/plex';

export const usePlex = () => {
  const [serverInfo, setServerInfo] = useState<PlexServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlexStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/plex/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch Plex status');
      }
      
      const data = await response.json();
      setServerInfo(data.server);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setServerInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlexStatus();
  }, []);

  return {
    serverInfo,
    loading,
    error,
    refresh: fetchPlexStatus,
  };
};