export interface PlexServerInfo {
  name: string;
  version: string;
  platform: string;
  platformVersion: string;
  updatedAt: Date;
  machineIdentifier: string;
}

export interface PlexLibrary {
  id: string;
  title: string;
  type: 'movie' | 'show' | 'music' | 'photo';
  locations: string[];
  updatedAt: Date;
  scannedAt: Date;
}

export interface PlexMediaItem {
  id: string;
  title: string;
  type: 'movie' | 'episode' | 'season' | 'show' | 'track' | 'album';
  year?: number;
  rating?: number;
  summary?: string;
  poster?: string;
  addedAt: Date;
  duration?: number;
  viewCount: number;
  lastViewedAt?: Date;
}