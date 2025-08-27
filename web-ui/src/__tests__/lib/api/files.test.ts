import {
  getFileHistory,
  addHistoryEntry,
  updateHistoryEntry,
  deleteHistoryEntry,
  clearFileHistory,
  getFileStats,
  getCompletedFiles,
  addCompletedFile,
  getStoredTorrents,
  getStoredTorrent,
  addStoredTorrent,
  redownloadFromTorrent,
  browseFiles,
  getFileInfo,
  scanCompletedFiles,
  cleanupOrphanedFiles,
  optimizeDatabase,
  formatFileSize,
  formatSpeed,
  formatDuration,
  formatDate,
  getMediaType,
  extractQuality,
  isPlexCompatible,
} from "@/lib/api/files";
import { apiClient } from "@/lib/api/client";
import type {
  DownloadHistoryEntry,
  HistoryFilters,
  CompletedFile,
  StoredTorrentFile,
} from "@/lib/types/file-history";

// Mock the API client
jest.mock("@/lib/api/client");

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("Files API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("File History API", () => {
    const mockHistoryEntry: DownloadHistoryEntry = {
      id: "test-id",
      torrentHash: "abc123",
      name: "Test Download",
      originalSize: 1000000,
      downloadedSize: 1000000,
      downloadPath: "/downloads/test",
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T11:00:00Z"),
      downloadTime: 3600000,
      averageSpeed: 277777,
      seeders: 5,
      leechers: 1,
      ratio: 1.5,
      category: "movies",
      tags: ["1080p"],
      status: "completed",
    };

    describe("getFileHistory", () => {
      it("should call API with no filters", async () => {
        const mockResponse = {
          entries: [mockHistoryEntry],
          total: 1,
        };

        mockApiClient.get.mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const result = await getFileHistory();

        expect(mockApiClient.get).toHaveBeenCalledWith("/files/history");
        expect(result).toEqual({
          success: true,
          data: mockResponse,
        });
      });

      it("should build query parameters from filters", async () => {
        const filters: HistoryFilters = {
          category: "movies",
          status: ["completed", "error"],
          searchTerm: "test",
          dateRange: [
            new Date("2024-01-01T00:00:00Z"),
            new Date("2024-01-31T23:59:59Z"),
          ],
          sizeRange: [1000000, 5000000000],
        };

        mockApiClient.get.mockResolvedValue({
          success: true,
          data: { entries: [], total: 0 },
        });

        await getFileHistory(filters);

        const expectedUrl = "/files/history?category=movies&status=completed%2Cerror&search=test&startDate=2024-01-01T00%3A00%3A00.000Z&endDate=2024-01-31T23%3A59%3A59.000Z&minSize=1000000&maxSize=5000000000";
        expect(mockApiClient.get).toHaveBeenCalledWith(expectedUrl);
      });

      it("should handle partial filters", async () => {
        const filters: HistoryFilters = {
          category: "tv",
          searchTerm: "show",
        };

        mockApiClient.get.mockResolvedValue({
          success: true,
          data: { entries: [], total: 0 },
        });

        await getFileHistory(filters);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          "/files/history?category=tv&search=show",
        );
      });

      it("should handle empty status array", async () => {
        const filters: HistoryFilters = {
          status: [],
        };

        mockApiClient.get.mockResolvedValue({
          success: true,
          data: { entries: [], total: 0 },
        });

        await getFileHistory(filters);

        expect(mockApiClient.get).toHaveBeenCalledWith("/files/history");
      });
    });

    describe("addHistoryEntry", () => {
      it("should add history entry", async () => {
        const entryWithoutId = { ...mockHistoryEntry };
        delete (entryWithoutId as any).id;

        mockApiClient.post.mockResolvedValue({
          success: true,
          data: { id: "new-id" },
        });

        const result = await addHistoryEntry(entryWithoutId);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          "/files/history",
          entryWithoutId,
        );
        expect(result.data.id).toBe("new-id");
      });
    });

    describe("updateHistoryEntry", () => {
      it("should update history entry", async () => {
        const updates = { status: "moved" as const };

        mockApiClient.put.mockResolvedValue({
          success: true,
          data: { ...mockHistoryEntry, ...updates },
        });

        const result = await updateHistoryEntry("test-id", updates);

        expect(mockApiClient.put).toHaveBeenCalledWith(
          "/files/history/test-id",
          updates,
        );
        expect(result.data.status).toBe("moved");
      });
    });

    describe("deleteHistoryEntry", () => {
      it("should delete history entry", async () => {
        mockApiClient.delete.mockResolvedValue({
          success: true,
          data: { success: true },
        });

        const result = await deleteHistoryEntry("test-id");

        expect(mockApiClient.delete).toHaveBeenCalledWith("/files/history/test-id");
        expect(result.data.success).toBe(true);
      });
    });

    describe("clearFileHistory", () => {
      it("should clear file history", async () => {
        mockApiClient.delete.mockResolvedValue({
          success: true,
          data: { success: true },
        });

        const result = await clearFileHistory();

        expect(mockApiClient.delete).toHaveBeenCalledWith("/files/history");
        expect(result.data.success).toBe(true);
      });
    });
  });

  describe("File Statistics API", () => {
    describe("getFileStats", () => {
      it("should get file statistics", async () => {
        const mockStats = {
          totalDownloads: 10,
          totalSize: 1000000000,
          totalTime: 36000000,
          averageSpeed: 277777,
          categoryBreakdown: { movies: 6, tv: 4 },
          statusBreakdown: { completed: 9, error: 1 },
        };

        mockApiClient.get.mockResolvedValue({
          success: true,
          data: mockStats,
        });

        const result = await getFileStats();

        expect(mockApiClient.get).toHaveBeenCalledWith("/files/stats");
        expect(result.data).toEqual(mockStats);
      });
    });
  });

  describe("Completed Files API", () => {
    const mockCompletedFile: CompletedFile = {
      path: "/downloads/movie.mp4",
      name: "movie.mp4",
      size: 1000000000,
      modifiedDate: new Date("2024-01-01T10:00:00Z"),
      mediaType: "video",
      torrentHash: "abc123",
      plexCompatible: true,
      quality: "1080p",
    };

    describe("getCompletedFiles", () => {
      it("should get all completed files", async () => {
        const mockResponse = {
          files: [mockCompletedFile],
          total: 1,
        };

        mockApiClient.get.mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const result = await getCompletedFiles();

        expect(mockApiClient.get).toHaveBeenCalledWith("/files/completed");
        expect(result.data).toEqual(mockResponse);
      });

      it("should get completed files by torrent hash", async () => {
        const mockResponse = {
          files: [mockCompletedFile],
          total: 1,
        };

        mockApiClient.get.mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const result = await getCompletedFiles("abc123");

        expect(mockApiClient.get).toHaveBeenCalledWith(
          "/files/completed?torrentHash=abc123",
        );
        expect(result.data).toEqual(mockResponse);
      });
    });

    describe("addCompletedFile", () => {
      it("should add completed file", async () => {
        mockApiClient.post.mockResolvedValue({
          success: true,
          data: { success: true },
        });

        const result = await addCompletedFile(mockCompletedFile);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          "/files/completed",
          mockCompletedFile,
        );
        expect(result.data.success).toBe(true);
      });
    });
  });

  describe("Torrent Files API", () => {
    const mockTorrentFile: StoredTorrentFile = {
      hash: "abc123",
      filename: "movie.torrent",
      title: "Great Movie",
      size: 2000000000,
      createdDate: new Date("2024-01-01T10:00:00Z"),
      trackers: ["tracker1.com", "tracker2.com"],
      files: [{ path: "movie.mp4", size: 1900000000 }],
      magnetUrl: "magnet:?xt=urn:btih:abc123",
      storagePath: "/torrents/movie.torrent",
    };

    describe("getStoredTorrents", () => {
      it("should get all stored torrents", async () => {
        const mockResponse = {
          torrents: [mockTorrentFile],
          total: 1,
        };

        mockApiClient.get.mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const result = await getStoredTorrents();

        expect(mockApiClient.get).toHaveBeenCalledWith("/files/torrents");
        expect(result.data).toEqual(mockResponse);
      });
    });

    describe("getStoredTorrent", () => {
      it("should get specific stored torrent", async () => {
        mockApiClient.get.mockResolvedValue({
          success: true,
          data: mockTorrentFile,
        });

        const result = await getStoredTorrent("abc123");

        expect(mockApiClient.get).toHaveBeenCalledWith("/files/torrents/abc123");
        expect(result.data).toEqual(mockTorrentFile);
      });
    });

    describe("addStoredTorrent", () => {
      it("should add stored torrent", async () => {
        mockApiClient.post.mockResolvedValue({
          success: true,
          data: { success: true },
        });

        const result = await addStoredTorrent(mockTorrentFile);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          "/files/torrents",
          mockTorrentFile,
        );
        expect(result.data.success).toBe(true);
      });
    });

    describe("redownloadFromTorrent", () => {
      it("should trigger redownload", async () => {
        mockApiClient.post.mockResolvedValue({
          success: true,
          data: { success: true },
        });

        const result = await redownloadFromTorrent("abc123");

        expect(mockApiClient.post).toHaveBeenCalledWith(
          "/files/torrents/abc123/redownload",
        );
        expect(result.data.success).toBe(true);
      });
    });
  });

  describe("File Browser API", () => {
    describe("browseFiles", () => {
      it("should browse files with default path", async () => {
        const mockResponse = {
          nodes: [],
          path: "/",
        };

        mockApiClient.get.mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const result = await browseFiles();

        expect(mockApiClient.get).toHaveBeenCalledWith("/files/browser?path=%2F");
        expect(result.data).toEqual(mockResponse);
      });

      it("should browse files with custom path", async () => {
        const mockResponse = {
          nodes: [],
          path: "/downloads",
        };

        mockApiClient.get.mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const result = await browseFiles("/downloads");

        expect(mockApiClient.get).toHaveBeenCalledWith(
          "/files/browser?path=%2Fdownloads",
        );
        expect(result.data).toEqual(mockResponse);
      });
    });

    describe("getFileInfo", () => {
      it("should get file information", async () => {
        const mockFile: CompletedFile = {
          path: "/downloads/movie.mp4",
          name: "movie.mp4",
          size: 1000000000,
          modifiedDate: new Date("2024-01-01T10:00:00Z"),
          plexCompatible: true,
        };

        mockApiClient.get.mockResolvedValue({
          success: true,
          data: mockFile,
        });

        const result = await getFileInfo("/downloads/movie.mp4");

        expect(mockApiClient.get).toHaveBeenCalledWith(
          "/files/info?path=%2Fdownloads%2Fmovie.mp4",
        );
        expect(result.data).toEqual(mockFile);
      });
    });
  });

  describe("File Maintenance API", () => {
    describe("scanCompletedFiles", () => {
      it("should scan completed files", async () => {
        const mockResponse = { scanned: 100, added: 5 };

        mockApiClient.post.mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const result = await scanCompletedFiles();

        expect(mockApiClient.post).toHaveBeenCalledWith("/files/maintenance/scan");
        expect(result.data).toEqual(mockResponse);
      });
    });

    describe("cleanupOrphanedFiles", () => {
      it("should cleanup orphaned files", async () => {
        const mockResponse = { removed: 3 };

        mockApiClient.post.mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const result = await cleanupOrphanedFiles();

        expect(mockApiClient.post).toHaveBeenCalledWith("/files/maintenance/cleanup");
        expect(result.data).toEqual(mockResponse);
      });
    });

    describe("optimizeDatabase", () => {
      it("should optimize database", async () => {
        mockApiClient.post.mockResolvedValue({
          success: true,
          data: { success: true },
        });

        const result = await optimizeDatabase();

        expect(mockApiClient.post).toHaveBeenCalledWith("/files/maintenance/optimize");
        expect(result.data.success).toBe(true);
      });
    });
  });

  describe("Utility Functions", () => {
    describe("formatFileSize", () => {
      it("should format bytes correctly", () => {
        expect(formatFileSize(0)).toBe("0.0 B");
        expect(formatFileSize(512)).toBe("512.0 B");
        expect(formatFileSize(1024)).toBe("1.0 KB");
        expect(formatFileSize(1536)).toBe("1.5 KB");
        expect(formatFileSize(1048576)).toBe("1.0 MB");
        expect(formatFileSize(1073741824)).toBe("1.0 GB");
        expect(formatFileSize(1099511627776)).toBe("1.0 TB");
      });

      it("should handle large numbers", () => {
        expect(formatFileSize(5497558138880)).toBe("5.0 TB");
      });
    });

    describe("formatSpeed", () => {
      it("should format speed correctly", () => {
        expect(formatSpeed(1024)).toBe("1.0 KB/s");
        expect(formatSpeed(1048576)).toBe("1.0 MB/s");
        expect(formatSpeed(277777)).toBe("271.3 KB/s");
      });
    });

    describe("formatDuration", () => {
      it("should format durations correctly", () => {
        expect(formatDuration(1000)).toBe("1s");
        expect(formatDuration(60000)).toBe("1m 0s");
        expect(formatDuration(3661000)).toBe("1h 1m");
        expect(formatDuration(90061000)).toBe("1d 1h 1m");
        expect(formatDuration(7200000)).toBe("2h 0m");
      });
    });

    describe("formatDate", () => {
      it("should format dates correctly", () => {
        const testDate = new Date("2024-01-15T14:30:00Z");
        const formatted = formatDate(testDate);
        
        // Check that it contains expected parts
        expect(formatted).toMatch(/Jan/);
        expect(formatted).toMatch(/15/);
        expect(formatted).toMatch(/2024/);
        expect(formatted).toMatch(/\d{1,2}:\d{2}/);
      });
    });

    describe("getMediaType", () => {
      it("should detect video files", () => {
        expect(getMediaType("movie.mp4")).toBe("video");
        expect(getMediaType("show.mkv")).toBe("video");
        expect(getMediaType("video.AVI")).toBe("video");
        expect(getMediaType("clip.webm")).toBe("video");
      });

      it("should detect audio files", () => {
        expect(getMediaType("song.mp3")).toBe("audio");
        expect(getMediaType("album.flac")).toBe("audio");
        expect(getMediaType("track.WAV")).toBe("audio");
        expect(getMediaType("audio.m4a")).toBe("audio");
      });

      it("should detect image files", () => {
        expect(getMediaType("photo.jpg")).toBe("image");
        expect(getMediaType("picture.PNG")).toBe("image");
        expect(getMediaType("image.webp")).toBe("image");
      });

      it("should detect archive files", () => {
        expect(getMediaType("archive.zip")).toBe("archive");
        expect(getMediaType("backup.RAR")).toBe("archive");
        expect(getMediaType("compressed.7z")).toBe("archive");
      });

      it("should detect document files", () => {
        expect(getMediaType("document.pdf")).toBe("document");
        expect(getMediaType("text.TXT")).toBe("document");
        expect(getMediaType("report.docx")).toBe("document");
      });

      it("should return undefined for unknown types", () => {
        expect(getMediaType("unknown.xyz")).toBeUndefined();
        expect(getMediaType("noextension")).toBeUndefined();
        expect(getMediaType("")).toBeUndefined();
      });
    });

    describe("extractQuality", () => {
      it("should extract quality from filename", () => {
        expect(extractQuality("Movie 2024 1080p BluRay x264")).toBe("1080P");
        expect(extractQuality("Show S01E01 720p HDTV")).toBe("720P");
        expect(extractQuality("Film 4K HDR")).toBe("4K");
        expect(extractQuality("Video 2160p UHD")).toBe("2160P");
        expect(extractQuality("Old Movie 480p DVD")).toBe("480P");
      });

      it("should return undefined for no quality", () => {
        expect(extractQuality("Movie Title")).toBeUndefined();
        expect(extractQuality("")).toBeUndefined();
      });

      it("should handle case insensitive matching", () => {
        expect(extractQuality("movie.1080P.x264")).toBe("1080P");
        expect(extractQuality("MOVIE.720p.HDTV")).toBe("720P");
      });
    });

    describe("isPlexCompatible", () => {
      it("should identify Plex-compatible video files", () => {
        expect(isPlexCompatible("movie.mp4")).toBe(true);
        expect(isPlexCompatible("show.mkv")).toBe(true);
        expect(isPlexCompatible("video.avi")).toBe(true);
        expect(isPlexCompatible("clip.mov")).toBe(true);
      });

      it("should identify Plex-compatible audio files", () => {
        expect(isPlexCompatible("song.mp3")).toBe(true);
        expect(isPlexCompatible("album.flac")).toBe(true);
        expect(isPlexCompatible("track.m4a")).toBe(true);
      });

      it("should identify Plex-compatible image files", () => {
        expect(isPlexCompatible("photo.jpg")).toBe(true);
        expect(isPlexCompatible("image.png")).toBe(true);
        expect(isPlexCompatible("picture.webp")).toBe(true);
      });

      it("should reject non-Plex formats", () => {
        expect(isPlexCompatible("archive.zip")).toBe(false);
        expect(isPlexCompatible("document.pdf")).toBe(false);
        expect(isPlexCompatible("unknown.xyz")).toBe(false);
        expect(isPlexCompatible("noextension")).toBe(false);
      });

      it("should handle case insensitive extensions", () => {
        expect(isPlexCompatible("MOVIE.MP4")).toBe(true);
        expect(isPlexCompatible("Song.MP3")).toBe(true);
      });
    });
  });
});