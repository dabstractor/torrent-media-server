'use client';

import React from 'react';
import { plexIntegrationManager } from '@/lib/managers/PlexIntegrationManager';

interface ViewInPlexButtonProps {
  mediaKey: string;
  className?: string;
}

const ViewInPlexButton: React.FC<ViewInPlexButtonProps> = ({ 
  mediaKey, 
  className = '' 
}) => {
  const handleClick = () => {
    const mediaLink = plexIntegrationManager.getMediaLink(mediaKey);
    
    if (mediaLink) {
      window.open(mediaLink, '_blank');
    } else {
      console.warn('Unable to generate Plex media link');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${className}`}
    >
      <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
      View in Plex
    </button>
  );
};

export default ViewInPlexButton;