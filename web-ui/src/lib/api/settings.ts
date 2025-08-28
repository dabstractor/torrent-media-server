import apiClient from './client';
import type { 
  AppSettings, 
  SettingsUpdateRequest, 
  SettingsUpdateResult, 
  ValidationResult,
  SyncResult,
  SettingsSyncStatus,
  SyncHistoryEntry,
  SettingsConflict
} from '@/lib/types/settings';

// Settings API functions

export async function getSettings(params?: { category?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.category) {
    searchParams.append('category', params.category);
  }
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/settings?${queryString}` : '/settings';
  
  return apiClient.get<AppSettings>(endpoint);
}

export async function updateSettings(request: SettingsUpdateRequest) {
  return apiClient.post<SettingsUpdateResult>('/settings', request);
}

export async function validateSettings(settings: AppSettings) {
  return apiClient.post<ValidationResult>('/settings', {
    settings,
    options: { validateOnly: true }
  });
}

export async function resetSettings(params?: { category?: string; createBackup?: boolean }) {
  const searchParams = new URLSearchParams();
  if (params?.category) {
    searchParams.append('category', params.category);
  }
  if (params?.createBackup !== undefined) {
    searchParams.append('createBackup', params.createBackup.toString());
  }
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/settings?${queryString}` : '/settings';
  
  return apiClient.delete<{ success: boolean }>(endpoint);
}

// Sync API functions

export async function getSyncStatus() {
  return apiClient.get<SettingsSyncStatus>('/sync/qbittorrent/status');
}

export async function getSyncHistory(params?: { limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.limit) {
    searchParams.append('limit', params.limit.toString());
  }
  
  const queryString = searchParams.toString();
  const endpoint = queryString ? `/sync/qbittorrent/history?${queryString}` : '/sync/qbittorrent/history';
  
  return apiClient.get<SyncHistoryEntry[]>(endpoint);
}

export async function syncToQBittorrent() {
  return apiClient.post<SyncResult>('/sync/qbittorrent/to-qb', {});
}

export async function syncFromQBittorrent() {
  return apiClient.post<SyncResult>('/sync/qbittorrent/from-qb', {});
}

export async function syncBidirectional() {
  return apiClient.post<SyncResult>('/sync/qbittorrent/bidirectional', {});
}

export async function testQBittorrentConnection() {
  return apiClient.post<{ connected: boolean; version?: string; error?: string }>('/sync/qbittorrent/test', {});
}

export async function startAutoSync() {
  return apiClient.post<{ success: boolean }>('/sync/qbittorrent/auto-start', {});
}

export async function stopAutoSync() {
  return apiClient.post<{ success: boolean }>('/sync/qbittorrent/auto-stop', {});
}

// Backup API functions

export async function getBackups() {
  return apiClient.get<any[]>('/backup/list');
}

export async function createBackup(name: string, description?: string) {
  return apiClient.post<{ backupId: string }>('/backup/create', { name, description });
}

export async function restoreBackup(backupId: string) {
  return apiClient.post<{ success: boolean }>('/backup/restore', { backupId });
}

export async function deleteBackup(backupId: string) {
  return apiClient.delete<{ success: boolean }>(`/backup/${backupId}`);
}