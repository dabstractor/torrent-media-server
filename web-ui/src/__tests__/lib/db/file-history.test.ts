import { FileHistoryDB } from "@/lib/db/file-history";
import type {
  DownloadHistoryEntry,
  StoredTorrentFile,
  CompletedFile,
} from "@/lib/types/file-history";
import fs from "fs";
import path from "path";

describe("FileHistoryDB", () => {
  let db: FileHistoryDB;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary database for each test
    testDbPath = path.join(__dirname, `test-${Date.now()}.db`);
    db = new FileHistoryDB(testDbPath);
  });

  afterEach(() => {
    // Clean up after each test
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe("Database Initialization", () => {
    it("should create database file and tables", () => {
      expect(fs.existsSync(testDbPath)).toBe(true);
    });

    it("should set schema version", () => {
      const stmt = (db as any).db.prepare(
        "SELECT version FROM schema_version",
      );
      const result = stmt.get();
      expect(result.version).toBe(1);
    });
  });

  describe("History Entry Operations", () => {
    const mockHistoryEntry: DownloadHistoryEntry = {
      id: "test-id-1",
      torrentHash: "abc123",
      name: "Test Download",
      originalSize: 1000000,
      downloadedSize: 1000000,
      downloadPath: "/downloads/test",
      torrentFile: "test.torrent",
      magnetUrl: "magnet:?xt=urn:btih:test",
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T10:30:00Z"),
      downloadTime: 1800000, // 30 minutes
      averageSpeed: 555555, // bytes per second
      seeders: 10,
      leechers: 2,
      ratio: 1.5,
      category: "movies",
      tags: ["hd", "action"],
      status: "completed",
      metadata: { quality: "1080p", source: "web" },
    };

    it("should add a history entry", () => {
      expect(() => db.addHistoryEntry(mockHistoryEntry)).not.toThrow();
    });

    it("should retrieve all history entries", () => {
      db.addHistoryEntry(mockHistoryEntry);
      const entries = db.getHistoryEntries();

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(mockHistoryEntry.id);
      expect(entries[0].name).toBe(mockHistoryEntry.name);
      expect(entries[0].tags).toEqual(mockHistoryEntry.tags);
      expect(entries[0].metadata).toEqual(mockHistoryEntry.metadata);
    });

    it("should retrieve a specific history entry", () => {
      db.addHistoryEntry(mockHistoryEntry);
      const entry = db.getHistoryEntry(mockHistoryEntry.id);

      expect(entry).not.toBeNull();
      expect(entry!.id).toBe(mockHistoryEntry.id);
      expect(entry!.torrentHash).toBe(mockHistoryEntry.torrentHash);
    });

    it("should return null for non-existent entry", () => {
      const entry = db.getHistoryEntry("non-existent");
      expect(entry).toBeNull();
    });

    it("should update a history entry", () => {
      db.addHistoryEntry(mockHistoryEntry);
      
      const updates = {
        status: "moved" as const,
        downloadPath: "/new/path",
        metadata: { moved: true },
      };
      
      expect(() => db.updateHistoryEntry(mockHistoryEntry.id, updates)).not.toThrow();
      
      const updated = db.getHistoryEntry(mockHistoryEntry.id);
      expect(updated!.status).toBe("moved");
      expect(updated!.downloadPath).toBe("/new/path");
    });

    it("should delete a history entry", () => {
      db.addHistoryEntry(mockHistoryEntry);
      db.deleteHistoryEntry(mockHistoryEntry.id);
      
      const entry = db.getHistoryEntry(mockHistoryEntry.id);
      expect(entry).toBeNull();
    });

    it("should filter entries by category", () => {
      const entry1 = { ...mockHistoryEntry, id: "1", category: "movies" };
      const entry2 = { ...mockHistoryEntry, id: "2", category: "tv" };
      
      db.addHistoryEntry(entry1);
      db.addHistoryEntry(entry2);
      
      const movieEntries = db.getHistoryEntries({ category: "movies" });
      expect(movieEntries).toHaveLength(1);
      expect(movieEntries[0].category).toBe("movies");
    });

    it("should filter entries by status", () => {
      const entry1 = { ...mockHistoryEntry, id: "1", status: "completed" as const };
      const entry2 = { ...mockHistoryEntry, id: "2", status: "error" as const };
      
      db.addHistoryEntry(entry1);
      db.addHistoryEntry(entry2);
      
      const completedEntries = db.getHistoryEntries({ status: ["completed"] });
      expect(completedEntries).toHaveLength(1);
      expect(completedEntries[0].status).toBe("completed");
    });

    it("should filter entries by search term", () => {
      const entry1 = { ...mockHistoryEntry, id: "1", name: "Action Movie" };
      const entry2 = { ...mockHistoryEntry, id: "2", name: "Comedy Show" };
      
      db.addHistoryEntry(entry1);
      db.addHistoryEntry(entry2);
      
      const actionEntries = db.getHistoryEntries({ searchTerm: "Action" });
      expect(actionEntries).toHaveLength(1);
      expect(actionEntries[0].name).toBe("Action Movie");
    });

    it("should filter entries by date range", () => {
      const entry1 = {
        ...mockHistoryEntry,
        id: "1",
        completedAt: new Date("2024-01-01T10:00:00Z"),
      };
      const entry2 = {
        ...mockHistoryEntry,
        id: "2",
        completedAt: new Date("2024-02-01T10:00:00Z"),
      };
      
      db.addHistoryEntry(entry1);
      db.addHistoryEntry(entry2);
      
      const januaryEntries = db.getHistoryEntries({
        dateRange: [
          new Date("2024-01-01T00:00:00Z"),
          new Date("2024-01-31T23:59:59Z"),
        ],
      });
      
      expect(januaryEntries).toHaveLength(1);
      expect(januaryEntries[0].id).toBe("1");
    });
  });

  describe("Torrent File Operations", () => {
    const mockTorrentFile: StoredTorrentFile = {
      hash: "abc123",
      filename: "movie.torrent",
      title: "Great Movie",
      size: 2000000000,
      createdDate: new Date("2024-01-01T10:00:00Z"),
      trackers: ["tracker1.com", "tracker2.com"],
      files: [
        { path: "movie.mp4", size: 1900000000 },
        { path: "subtitle.srt", size: 50000 },
      ],
      magnetUrl: "magnet:?xt=urn:btih:abc123",
      storagePath: "/torrents/movie.torrent",
    };

    it("should add a torrent file", () => {
      expect(() => db.addStoredTorrentFile(mockTorrentFile)).not.toThrow();
    });

    it("should retrieve a torrent file", () => {
      db.addStoredTorrentFile(mockTorrentFile);
      const torrent = db.getStoredTorrentFile(mockTorrentFile.hash);

      expect(torrent).not.toBeNull();
      expect(torrent!.hash).toBe(mockTorrentFile.hash);
      expect(torrent!.filename).toBe(mockTorrentFile.filename);
      expect(torrent!.trackers).toEqual(mockTorrentFile.trackers);
      expect(torrent!.files).toEqual(mockTorrentFile.files);
    });

    it("should return null for non-existent torrent", () => {
      const torrent = db.getStoredTorrentFile("non-existent");
      expect(torrent).toBeNull();
    });
  });

  describe("Completed File Operations", () => {
    const mockCompletedFile: CompletedFile = {
      path: "/downloads/movie.mp4",
      name: "movie.mp4",
      size: 1900000000,
      modifiedDate: new Date("2024-01-01T10:30:00Z"),
      mediaType: "video",
      torrentHash: "abc123",
      plexCompatible: true,
      quality: "1080p",
    };

    it("should add a completed file", () => {
      expect(() => db.addCompletedFile(mockCompletedFile)).not.toThrow();
    });

    it("should retrieve all completed files", () => {
      db.addCompletedFile(mockCompletedFile);
      const files = db.getCompletedFiles();

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe(mockCompletedFile.path);
      expect(files[0].mediaType).toBe(mockCompletedFile.mediaType);
      expect(files[0].plexCompatible).toBe(true);
    });

    it("should retrieve completed files by torrent hash", () => {
      const file1 = { ...mockCompletedFile, path: "/downloads/file1.mp4" };
      const file2 = {
        ...mockCompletedFile,
        path: "/downloads/file2.mp4",
        torrentHash: "xyz789",
      };
      
      db.addCompletedFile(file1);
      db.addCompletedFile(file2);
      
      const files = db.getCompletedFiles("abc123");
      expect(files).toHaveLength(1);
      expect(files[0].path).toBe("/downloads/file1.mp4");
    });

    it("should handle file replacement with same path", () => {
      db.addCompletedFile(mockCompletedFile);
      
      const updatedFile = {
        ...mockCompletedFile,
        size: 2000000000,
        quality: "4K",
      };
      
      db.addCompletedFile(updatedFile);
      const files = db.getCompletedFiles();
      
      expect(files).toHaveLength(1);
      expect(files[0].size).toBe(2000000000);
      expect(files[0].quality).toBe("4K");
    });
  });

  describe("Statistics Operations", () => {
    beforeEach(() => {
      // Add test data
      const entries = [
        {
          id: "1",
          torrentHash: "hash1",
          name: "Movie 1",
          originalSize: 1000000,
          downloadedSize: 1000000,
          downloadPath: "/downloads/movie1",
          startedAt: new Date("2024-01-01T10:00:00Z"),
          completedAt: new Date("2024-01-01T11:00:00Z"),
          downloadTime: 3600000,
          averageSpeed: 277777,
          seeders: 5,
          leechers: 1,
          ratio: 1.2,
          category: "movies",
          tags: [],
          status: "completed" as const,
        },
        {
          id: "2",
          torrentHash: "hash2",
          name: "TV Show 1",
          originalSize: 2000000,
          downloadedSize: 2000000,
          downloadPath: "/downloads/tv1",
          startedAt: new Date("2024-01-01T12:00:00Z"),
          completedAt: new Date("2024-01-01T13:00:00Z"),
          downloadTime: 3600000,
          averageSpeed: 555555,
          seeders: 10,
          leechers: 2,
          ratio: 2.0,
          category: "tv",
          tags: [],
          status: "completed" as const,
        },
      ];

      entries.forEach(entry => db.addHistoryEntry(entry));
    });

    it("should calculate statistics correctly", () => {
      const stats = db.getStats();

      expect(stats.totalDownloads).toBe(2);
      expect(stats.totalSize).toBe(3000000);
      expect(stats.totalTime).toBe(7200000);
      expect(stats.averageSpeed).toBe(416666);
      expect(stats.categoryBreakdown).toEqual({
        movies: 1,
        tv: 1,
      });
      expect(stats.statusBreakdown).toEqual({
        completed: 2,
      });
    });

    it("should handle empty database", () => {
      db.clearHistory();
      const stats = db.getStats();

      expect(stats.totalDownloads).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.totalTime).toBe(0);
      expect(stats.averageSpeed).toBe(0);
    });
  });

  describe("Database Maintenance", () => {
    it("should clear all history", () => {
      const mockEntry: DownloadHistoryEntry = {
        id: "test",
        torrentHash: "hash",
        name: "Test",
        originalSize: 1000,
        downloadedSize: 1000,
        downloadPath: "/test",
        startedAt: new Date(),
        completedAt: new Date(),
        downloadTime: 1000,
        averageSpeed: 1000,
        seeders: 1,
        leechers: 1,
        ratio: 1.0,
        category: "test",
        tags: [],
        status: "completed",
      };

      const mockFile: CompletedFile = {
        path: "/test.mp4",
        name: "test.mp4",
        size: 1000,
        modifiedDate: new Date(),
        plexCompatible: false,
      };

      db.addHistoryEntry(mockEntry);
      db.addCompletedFile(mockFile);

      expect(db.getHistoryEntries()).toHaveLength(1);
      expect(db.getCompletedFiles()).toHaveLength(1);

      db.clearHistory();

      expect(db.getHistoryEntries()).toHaveLength(0);
      expect(db.getCompletedFiles()).toHaveLength(0);
    });
  });

  describe("Date Handling", () => {
    it("should correctly serialize and deserialize dates", () => {
      const testDate = new Date("2024-01-01T10:30:00Z");
      const entry: DownloadHistoryEntry = {
        id: "date-test",
        torrentHash: "hash",
        name: "Date Test",
        originalSize: 1000,
        downloadedSize: 1000,
        downloadPath: "/test",
        startedAt: testDate,
        completedAt: testDate,
        downloadTime: 1000,
        averageSpeed: 1000,
        seeders: 1,
        leechers: 1,
        ratio: 1.0,
        category: "test",
        tags: [],
        status: "completed",
      };

      db.addHistoryEntry(entry);
      const retrieved = db.getHistoryEntry("date-test");

      expect(retrieved!.startedAt).toEqual(testDate);
      expect(retrieved!.completedAt).toEqual(testDate);
    });
  });
});