// src/components/plex/ViewInPlexButton.tsx
'use client';

import React from 'react';
import { PlexMediaItem } from '@/lib/types/plex';

interface ViewInPlexButtonProps {
  mediaItem: PlexMediaItem;
  plexUrl?: string;
}

const ViewInPlexButton: React.FC<ViewInPlexButtonProps> = ({ 
  mediaItem, 
  plexUrl = 'http://localhost:32400' 
}) => {
  const handleClick = () => {
    // Construct the Plex web URL for the media item
    // This is a simplified version - in a real implementation, you'd need the server ID
    const plexWebUrl = `${plexUrl}/web/index.html#!/server/none/details?key=/library/metadata/${mediaItem.id}`;
    
    // Open in a new tab
    window.open(plexWebUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      <svg className="mr-2 -ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
      View in Plex
    </button>
  );
};

export default ViewInPlexButton;