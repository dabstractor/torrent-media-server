// Comprehensive settings types for torrent management system
// Follows patterns from web-ui/src/lib/types/index.ts

// PRIMARY SETTINGS INTERFACES
export interface AppSettings {
  // General Settings
  theme: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    downloadComplete: boolean;
    errorAlerts: boolean;
    soundEnabled: boolean;
  };
  language: string;
  autoUpdate: boolean;

  // Download Settings
  defaultDownloadPath: string;
  defaultCategory: string;
  autoStartTorrents: boolean;
  maxConcurrentDownloads: number;
  deleteCompletedTorrents: boolean;
  moveTorrentOnCompletion: boolean;
  completedTorrentPath: string;

  // Bandwidth Settings
  maxUploadSpeed: number; // KB/s, 0 for unlimited
  maxDownloadSpeed: number; // KB/s, 0 for unlimited
  altSpeedEnabled: boolean;
  altUploadSpeed: number;
  altDownloadSpeed: number;
  scheduleEnabled: boolean;
  scheduleFromHour: number;
  scheduleFromMin: number;
  scheduleToHour: number;
  scheduleToMin: number;
  scheduleDays: number; // Bitmask: 1=Mon, 2=Tue, 4=Wed, etc.

  // Transmission Integration
  transmission: {
    url: string;
    username: string;
    password: string;
    syncEnabled: boolean;
    syncInterval: number; // seconds
    autoLogin: boolean;
    trustSelfSignedCerts: boolean;
    scheduler: {
      enabled: boolean;
      fromHour: number;
      fromMin: number;
      toHour: number;
      toMin: number;
      days: number; // Bitmask: 1=Sunday, 2=Monday, 4=Tuesday...
    };
  };

  // Plex Integration
  plex: {
    enabled: boolean;
    token: string;
    url: string;
    updateLibraryOnComplete: boolean;
    categories: string[]; // Categories to sync with Plex
  };

  // Advanced Settings
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    maxLogSize: number; // MB
    keepLogDays: number;
  };
  database: {
    autoVacuum: boolean;
    vacuumInterval: number; // days
    maxHistoryEntries: number;
  };
  performance: {
    cacheSize: number; // MB
    backgroundSync: boolean;
    maxConcurrentRequests: number;
  };
}

// VALIDATION SCHEMAS
export interface SettingsValidationRule {
  field: string; // Path to nested field (e.g., 'notifications.enabled', 'maxUploadSpeed')
  rules: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// BACKUP/RESTORE TYPES
export interface SettingsBackup {
  id: string;
  name: string;
  description?: string;
  settings: AppSettings;
  createdAt: Date;
  version: string;
  checksum: string;
}

export interface BackupMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  version: string;
  size: number; // bytes
}

export interface RestoreResult {
  success: boolean;
  errors: string[];
  restoredSettings?: Partial<AppSettings>;
}

// SYNC TYPES
export interface SyncResult {
  success: boolean;
  conflicts: SettingsConflict[];
  syncedFields: string[];
  errors: string[];
}

export interface SettingsConflict {
  field: string;
  appValue: any;
  qbValue: any;
  resolution: 'app_wins' | 'qb_wins' | 'manual';
  timestamp: Date;
}

export interface TransmissionPreferences {
  'speed-limit-down-enabled': boolean;
  'speed-limit-down': number;
  'speed-limit-up-enabled': boolean;
  'speed-limit-up': number;
  'alt-speed-enabled': boolean;
  'alt-speed-down': number;
  'alt-speed-up': number;
  'alt-speed-time-enabled': boolean;
  'alt-speed-time-begin': number; // minutes since midnight
  'alt-speed-time-end': number;
  'alt-speed-time-day': number; // bitmask
  'download-queue-enabled': boolean;
  'download-queue-size': number;
  'seed-queue-enabled': boolean;
  'seed-queue-size': number;
  'start-added-torrents': boolean;
  'download-dir': string;
}

export interface QBPreferences {
  // Core qBittorrent preferences mapping to AppSettings
  max_upload: number;
  max_download: number;
  alt_up_limit: number;
  alt_dl_limit: number;
  scheduler_enabled: boolean;
  schedule_from_hour: number;
  schedule_from_min: number;
  schedule_to_hour: number;
  schedule_to_min: number;
  scheduler_days: number;
  autorun_enabled: boolean;
  autorun_program: string;
  queueing_enabled: boolean;
  max_active_downloads: number;
  max_active_torrents: number;
  max_active_uploads: number;
  dont_count_slow_torrents: boolean;
  slow_torrent_dl_rate_threshold: number;
  slow_torrent_ul_rate_threshold: number;
  slow_torrent_inactive_timer: number;
  max_ratio_enabled: boolean;
  max_ratio: number;
  max_ratio_act: number;
  listen_port: number;
  upnp: boolean;
  random_port: boolean;
  dl_limit: number;
  up_limit: number;
  max_connec: number;
  max_connec_per_torrent: number;
  max_uploads_per_torrent: number;
  enable_utp: boolean;
  limit_utp_rate: boolean;
  limit_tcp_overhead: boolean;
  limit_lan_peers: boolean;
  alt_speeds_on: boolean;
}

// SETTINGS CATEGORIES
export type SettingsCategory = 
  | 'general'
  | 'download' 
  | 'bandwidth'
  | 'transmission'
  | 'plex'
  | 'advanced';

export interface SettingsCategoryInfo {
  id: SettingsCategory;
  name: string;
  description: string;
  icon: string;
  fields: string[];
}

// FORM TYPES
export interface FormFieldProps {
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  label: string;
  description?: string;
}

export interface NumberInputProps extends Omit<FormFieldProps, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  step?: number;
}

export interface ToggleSwitchProps extends Omit<FormFieldProps, 'value' | 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface PathSelectorProps extends Omit<FormFieldProps, 'value' | 'onChange'> {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  type?: 'directory' | 'file';
}

export interface TimeScheduleProps {
  schedule: {
    enabled: boolean;
    fromHour: number;
    fromMin: number;
    toHour: number;
    toMin: number;
    days: number;
  };
  onScheduleChange: (schedule: TimeScheduleProps['schedule']) => void;
  error?: string;
}

// UPDATE TYPES
export interface SettingsUpdateRequest {
  category?: SettingsCategory;
  settings: Partial<AppSettings>;
  options?: {
    validateOnly?: boolean;
    skipSync?: boolean;
    createBackup?: boolean;
  };
}

export interface SettingsUpdateResult {
  success: boolean;
  updatedSettings: AppSettings;
  validation: ValidationResult;
  syncResult?: SyncResult;
  backupId?: string;
  errors: string[];
}

// MIGRATION TYPES
export interface SettingsMigration {
  version: number;
  description: string;
  up: (settings: any) => AppSettings;
  down: (settings: AppSettings) => any;
}

// CACHE TYPES
export interface SettingsCache {
  settings: AppSettings;
  timestamp: number;
  version: string;
  checksum: string;
}

// EXPORT TYPES
export interface SettingsExport {
  version: string;
  exportedAt: Date;
  settings: AppSettings;
  metadata: {
    appVersion: string;
    userAgent: string;
    hostname: string;
  };
}

export interface SettingsImport {
  settings: Partial<AppSettings>;
  options: {
    overwrite: boolean;
    categories: SettingsCategory[];
    createBackup: boolean;
  };
}

// DEFAULT SETTINGS
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  notifications: {
    enabled: true,
    downloadComplete: true,
    errorAlerts: true,
    soundEnabled: false,
  },
  language: 'en',
  autoUpdate: true,
  defaultDownloadPath: '',
  defaultCategory: '',
  autoStartTorrents: true,
  maxConcurrentDownloads: 3,
  deleteCompletedTorrents: false,
  moveTorrentOnCompletion: false,
  completedTorrentPath: '',
  maxUploadSpeed: 0,
  maxDownloadSpeed: 0,
  altSpeedEnabled: false,
  altUploadSpeed: 0,
  altDownloadSpeed: 0,
  scheduleEnabled: false,
  scheduleFromHour: 8,
  scheduleFromMin: 0,
  scheduleToHour: 20,
  scheduleToMin: 0,
  scheduleDays: 127, // All days
  transmission: {
    url: 'http://localhost:9091',
    username: 'admin',
    password: 'adminpass123',
    syncEnabled: true,
    syncInterval: 30,
    autoLogin: true,
    trustSelfSignedCerts: false,
    scheduler: {
      enabled: false,
      fromHour: 8,
      fromMin: 0,
      toHour: 20,
      toMin: 0,
      days: 127, // All days
    },
  },
  plex: {
    enabled: false,
    token: '',
    url: '',
    updateLibraryOnComplete: false,
    categories: [],
  },
  logging: {
    level: 'info',
    maxLogSize: 10,
    keepLogDays: 30,
  },
  database: {
    autoVacuum: true,
    vacuumInterval: 7,
    maxHistoryEntries: 1000,
  },
  performance: {
    cacheSize: 50,
    backgroundSync: true,
    maxConcurrentRequests: 10,
  },
};

export { DEFAULT_SETTINGS };

// SETTINGS CATEGORIES CONFIGURATION
export const SETTINGS_CATEGORIES: SettingsCategoryInfo[] = [
  {
    id: 'general',
    name: 'General',
    description: 'Application behavior, notifications, and theme preferences',
    icon: 'settings',
    fields: ['theme', 'notifications', 'language', 'autoUpdate'],
  },
  {
    id: 'download',
    name: 'Downloads',
    description: 'Default paths, categories, and download behavior',
    icon: 'download',
    fields: [
      'defaultDownloadPath',
      'defaultCategory', 
      'autoStartTorrents',
      'maxConcurrentDownloads',
      'deleteCompletedTorrents',
      'moveTorrentOnCompletion',
      'completedTorrentPath',
    ],
  },
  {
    id: 'bandwidth',
    name: 'Bandwidth',
    description: 'Upload/download limits, scheduling, and throttling',
    icon: 'network',
    fields: [
      'maxUploadSpeed',
      'maxDownloadSpeed',
      'altSpeedEnabled',
      'altUploadSpeed', 
      'altDownloadSpeed',
      'scheduleEnabled',
      'scheduleFromHour',
      'scheduleFromMin',
      'scheduleToHour',
      'scheduleToMin',
      'scheduleDays',
    ],
  },
  {
    id: 'transmission',
    name: 'Transmission',
    description: 'Connection settings, sync preferences, and authentication',
    icon: 'link',
    fields: ['transmission'],
  },
  {
    id: 'plex',
    name: 'Plex Integration',
    description: 'Library sync settings and notification preferences',
    icon: 'tv',
    fields: ['plex'],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Logging, database maintenance, and performance tuning',
    icon: 'cog',
    fields: ['logging', 'database', 'performance'],
  },
];