import { apiClient } from "./client";
import type { ApiResponse } from "@/lib/types";
import type {
  DownloadHistoryEntry,
  StoredTorrentFile,
  CompletedFile,
  HistoryFilters,
  FileHistoryStats,
} from "@/lib/types/file-history";

export interface FileHistoryResponse {
  entries: DownloadHistoryEntry[];
  total: number;
  stats?: FileHistoryStats;
}

export interface CompletedFilesResponse {
  files: CompletedFile[];
  total: number;
}

export interface TorrentFilesResponse {
  torrents: StoredTorrentFile[];
  total: number;
}

export interface FileBrowserNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified: Date;
  children?: FileBrowserNode[];
}

export interface FileBrowserResponse {
  nodes: FileBrowserNode[];
  path: string;
  parent?: string;
}

// File History API functions
export async function getFileHistory(
  filters?: HistoryFilters,
): Promise<ApiResponse<FileHistoryResponse>> {
  const params = new URLSearchParams();

  if (filters?.category) {
    params.set("category", filters.category);
  }

  if (filters?.status && filters.status.length > 0) {
    params.set("status", filters.status.join(","));
  }

  if (filters?.searchTerm) {
    params.set("search", filters.searchTerm);
  }

  if (filters?.dateRange) {
    params.set("startDate", filters.dateRange[0].toISOString());
    params.set("endDate", filters.dateRange[1].toISOString());
  }

  if (filters?.sizeRange) {
    params.set("minSize", filters.sizeRange[0].toString());
    params.set("maxSize", filters.sizeRange[1].toString());
  }

  const endpoint = `/files/history${params.toString() ? `?${params.toString()}` : ""}`;
  return apiClient.get<FileHistoryResponse>(endpoint);
}

export async function addHistoryEntry(
  entry: Omit<DownloadHistoryEntry, "id">,
): Promise<ApiResponse<{ id: string }>> {
  return apiClient.post<{ id: string }>("/files/history", entry);
}

export async function getHistoryEntry(
  id: string,
): Promise<ApiResponse<DownloadHistoryEntry>> {
  return apiClient.get<DownloadHistoryEntry>(`/files/history/${id}`);
}

export async function updateHistoryEntry(
  id: string,
  updates: Partial<DownloadHistoryEntry>,
): Promise<ApiResponse<DownloadHistoryEntry>> {
  return apiClient.put<DownloadHistoryEntry>(`/files/history/${id}`, updates);
}

export async function deleteHistoryEntry(
  id: string,
): Promise<ApiResponse<{ success: boolean }>> {
  return apiClient.delete<{ success: boolean }>(`/files/history/${id}`);
}

export async function clearFileHistory(): Promise<
  ApiResponse<{ success: boolean }>
> {
  return apiClient.delete<{ success: boolean }>("/files/history");
}

// File Statistics API functions
export async function getFileStats(): Promise<ApiResponse<FileHistoryStats>> {
  return apiClient.get<FileHistoryStats>("/files/stats");
}

// Completed Files API functions
export async function getCompletedFiles(
  torrentHash?: string,
): Promise<ApiResponse<CompletedFilesResponse>> {
  const params = torrentHash ? `?torrentHash=${torrentHash}` : "";
  return apiClient.get<CompletedFilesResponse>(`/files/completed${params}`);
}

export async function addCompletedFile(
  file: CompletedFile,
): Promise<ApiResponse<{ success: boolean }>> {
  return apiClient.post<{ success: boolean }>("/files/completed", file);
}

// Torrent Files API functions
export async function getStoredTorrents(): Promise<
  ApiResponse<TorrentFilesResponse>
> {
  return apiClient.get<TorrentFilesResponse>("/files/torrents");
}

export async function getStoredTorrent(
  hash: string,
): Promise<ApiResponse<StoredTorrentFile>> {
  return apiClient.get<StoredTorrentFile>(`/files/torrents/${hash}`);
}

export async function addStoredTorrent(
  torrent: StoredTorrentFile,
): Promise<ApiResponse<{ success: boolean }>> {
  return apiClient.post<{ success: boolean }>("/files/torrents", torrent);
}

export async function redownloadFromTorrent(
  hash: string,
): Promise<ApiResponse<{ success: boolean }>> {
  return apiClient.post<{ success: boolean }>(
    `/files/torrents/${hash}/redownload`,
  );
}

// File Browser API functions
export async function browseFiles(
  path: string = "/",
): Promise<ApiResponse<FileBrowserResponse>> {
  const params = new URLSearchParams({ path });
  return apiClient.get<FileBrowserResponse>(
    `/files/browser?${params.toString()}`,
  );
}

export async function getFileInfo(
  filePath: string,
): Promise<ApiResponse<CompletedFile>> {
  const params = new URLSearchParams({ path: filePath });
  return apiClient.get<CompletedFile>(`/files/info?${params.toString()}`);
}

// File Maintenance API functions
export async function scanCompletedFiles(): Promise<
  ApiResponse<{ scanned: number; added: number }>
> {
  return apiClient.post<{ scanned: number; added: number }>(
    "/files/maintenance/scan",
  );
}

export async function cleanupOrphanedFiles(): Promise<
  ApiResponse<{ removed: number }>
> {
  return apiClient.post<{ removed: number }>("/files/maintenance/cleanup");
}

export async function optimizeDatabase(): Promise<
  ApiResponse<{ success: boolean }>
> {
  return apiClient.post<{ success: boolean }>("/files/maintenance/optimize");
}

// Utility functions for formatting and validation
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`;
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getMediaType(
  filename: string,
): CompletedFile["mediaType"] | undefined {
  const ext = filename.toLowerCase().split(".").pop();

  if (!ext) return undefined;

  const videoExts = ["mp4", "mkv", "avi", "mov", "wmv", "flv", "m4v", "webm"];
  const audioExts = ["mp3", "flac", "wav", "aac", "m4a", "ogg", "wma"];
  const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
  const archiveExts = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"];
  const documentExts = ["pdf", "doc", "docx", "txt", "rtf", "odt"];

  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  if (imageExts.includes(ext)) return "image";
  if (archiveExts.includes(ext)) return "archive";
  if (documentExts.includes(ext)) return "document";

  return undefined;
}

export function extractQuality(filename: string): string | undefined {
  const qualityPatterns = [
    /\b(4k|2160p)\b/i,
    /\b(1080p|1080i)\b/i,
    /\b(720p|720i)\b/i,
    /\b(480p|480i)\b/i,
    /\b(360p)\b/i,
    /\b(240p)\b/i,
  ];

  for (const pattern of qualityPatterns) {
    const match = filename.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return undefined;
}

export function isPlexCompatible(filename: string): boolean {
  const ext = filename.toLowerCase().split(".").pop();
  if (!ext) return false;

  const plexVideoExts = [
    "mp4",
    "mkv",
    "avi",
    "mov",
    "m4v",
    "wmv",
    "asf",
    "flv",
    "f4v",
    "webm",
  ];
  const plexAudioExts = [
    "mp3",
    "flac",
    "mp4",
    "m4a",
    "aac",
    "ogg",
    "wma",
    "wav",
  ];
  const plexImageExts = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"];

  return (
    plexVideoExts.includes(ext) ||
    plexAudioExts.includes(ext) ||
    plexImageExts.includes(ext)
  );
}
