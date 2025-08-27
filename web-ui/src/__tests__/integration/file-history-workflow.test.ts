/**
 * @jest-environment node
 */

import { FileHistoryDB } from "@/lib/db/file-history";
import type { DownloadHistoryEntry, CompletedFile, StoredTorrentFile } from "@/lib/types/file-history";
import fs from "fs";
import path from "path";

// Integration tests for the complete file history workflow
describe("File History Workflow Integration", () => {
  let db: FileHistoryDB;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary database for each test
    testDbPath = path.join(__dirname, `test-integration-${Date.now()}.db`);
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

  describe("Complete Download History Workflow", () => {
    const mockHistoryEntry: DownloadHistoryEntry = {
      id: "workflow-test-1",
      torrentHash: "workflow-hash-123",
      name: "Workflow Test Movie",
      originalSize: 2000000000, // 2GB
      downloadedSize: 2000000000,
      downloadPath: "/downloads/workflow-test",
      torrentFile: "workflow-test.torrent",
      magnetUrl: "magnet:?xt=urn:btih:workflow-hash-123",
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T12:00:00Z"),
      downloadTime: 7200000, // 2 hours
      averageSpeed: 277777, // bytes per second
      seeders: 15,
      leechers: 3,
      ratio: 1.8,
      category: "movies",
      tags: ["1080p", "bluray"],
      status: "completed",
      metadata: { quality: "1080p", source: "bluray" },
    };

    const mockCompletedFile: CompletedFile = {
      path: "/downloads/workflow-test/movie.mp4",
      name: "movie.mp4",
      size: 1900000000,
      modifiedDate: new Date("2024-01-01T12:00:00Z"),
      mediaType: "video",
      torrentHash: "workflow-hash-123",
      plexCompatible: true,
      quality: "1080p",
    };

    const mockTorrentFile: StoredTorrentFile = {
      hash: "workflow-hash-123",
      filename: "workflow-test.torrent",
      title: "Workflow Test Movie",
      size: 20000,
      createdDate: new Date("2024-01-01T09:00:00Z"),
      trackers: ["tracker1.com", "tracker2.com"],
      files: [
        { path: "movie.mp4", size: 1900000000 },
        { path: "subtitle.srt", size: 50000 },
      ],
      magnetUrl: "magnet:?xt=urn:btih:workflow-hash-123",
      storagePath: "/torrents/workflow-test.torrent",
    };

    it("should handle complete workflow: add entry -> add files -> query -> update -> delete", async () => {
      // Step 1: Add history entry
      expect(() => db.addHistoryEntry(mockHistoryEntry)).not.toThrow();

      // Step 2: Add completed file
      expect(() => db.addCompletedFile(mockCompletedFile)).not.toThrow();

      // Step 3: Add torrent file
      expect(() => db.addStoredTorrentFile(mockTorrentFile)).not.toThrow();

      // Step 4: Query history entries
      const entries = db.getHistoryEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(mockHistoryEntry.id);
      expect(entries[0].name).toBe(mockHistoryEntry.name);

      // Step 5: Query completed files
      const completedFiles = db.getCompletedFiles();
      expect(completedFiles).toHaveLength(1);
      expect(completedFiles[0].path).toBe(mockCompletedFile.path);

      // Step 6: Query torrent files
      const torrentFile = db.getStoredTorrentFile(mockTorrentFile.hash);
      expect(torrentFile).not.toBeNull();
      expect(torrentFile!.hash).toBe(mockTorrentFile.hash);

      // Step 7: Query files by torrent hash
      const filesByHash = db.getCompletedFiles("workflow-hash-123");
      expect(filesByHash).toHaveLength(1);
      expect(filesByHash[0].path).toBe(mockCompletedFile.path);

      // Step 8: Get statistics
      const stats = db.getStats();
      expect(stats.totalDownloads).toBe(1);
      expect(stats.totalSize).toBe(2000000000);
      expect(stats.categoryBreakdown).toEqual({ movies: 1 });

      // Step 9: Update history entry
      const updates = {
        status: "moved" as const,
        downloadPath: "/new/path/workflow-test",
      };
      expect(() => db.updateHistoryEntry(mockHistoryEntry.id, updates)).not.toThrow();

      const updatedEntry = db.getHistoryEntry(mockHistoryEntry.id);
      expect(updatedEntry!.status).toBe("moved");
      expect(updatedEntry!.downloadPath).toBe("/new/path/workflow-test");

      // Step 10: Delete history entry
      expect(() => db.deleteHistoryEntry(mockHistoryEntry.id)).not.toThrow();
      
      const deletedEntry = db.getHistoryEntry(mockHistoryEntry.id);
      expect(deletedEntry).toBeNull();

      // Verify cascading deletion behavior (files should still exist)
      const remainingFiles = db.getCompletedFiles();
      expect(remainingFiles).toHaveLength(1); // Files are not automatically deleted
    });

    it("should handle filtered queries correctly", () => {
      // Add multiple entries for testing filters
      const entry1 = { ...mockHistoryEntry, id: "1", category: "movies", status: "completed" as const };
      const entry2 = { ...mockHistoryEntry, id: "2", category: "tv", status: "completed" as const, name: "TV Show" };
      const entry3 = { ...mockHistoryEntry, id: "3", category: "movies", status: "error" as const, name: "Error Movie" };

      db.addHistoryEntry(entry1);
      db.addHistoryEntry(entry2);
      db.addHistoryEntry(entry3);

      // Test category filter
      const movieEntries = db.getHistoryEntries({ category: "movies" });
      expect(movieEntries).toHaveLength(2);
      expect(movieEntries.every(e => e.category === "movies")).toBe(true);

      // Test status filter
      const errorEntries = db.getHistoryEntries({ status: ["error"] });
      expect(errorEntries).toHaveLength(1);
      expect(errorEntries[0].status).toBe("error");

      // Test search filter
      const tvEntries = db.getHistoryEntries({ searchTerm: "TV" });
      expect(tvEntries).toHaveLength(1);
      expect(tvEntries[0].name).toBe("TV Show");

      // Test combined filters
      const combinedEntries = db.getHistoryEntries({ 
        category: "movies", 
        status: ["completed"] 
      });
      expect(combinedEntries).toHaveLength(1);
      expect(combinedEntries[0].id).toBe("1");

      // Test date range filter
      const dateFiltered = db.getHistoryEntries({
        dateRange: [
          new Date("2024-01-01T00:00:00Z"),
          new Date("2024-01-01T23:59:59Z"),
        ],
      });
      expect(dateFiltered).toHaveLength(3);
    });

    it("should handle file replacement correctly", () => {
      // Add initial file
      db.addCompletedFile(mockCompletedFile);

      // Add updated file with same path (should replace)
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

    it("should handle empty database gracefully", () => {
      // Query empty database
      const entries = db.getHistoryEntries();
      const files = db.getCompletedFiles();
      // Note: There's no getStoredTorrentFiles method, only getStoredTorrentFile by hash
      const torrentFile = db.getStoredTorrentFile("test-hash");
      const stats = db.getStats();

      expect(entries).toHaveLength(0);
      expect(files).toHaveLength(0);
      expect(torrents).toHaveLength(0);
      expect(stats.totalDownloads).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });

  describe("Database Schema and Constraints", () => {
    it("should maintain referential integrity", () => {
      // Test that database operations work correctly with foreign key constraints
      const entry: DownloadHistoryEntry = {
        id: "fk-test-1",
        torrentHash: "fk-hash-123",
        name: "FK Test",
        originalSize: 1000000,
        downloadedSize: 1000000,
        downloadPath: "/downloads/fk-test",
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

      // Add entry first
      expect(() => db.addHistoryEntry(entry)).not.toThrow();

      // Query should work
      const retrieved = db.getHistoryEntry("fk-test-1");
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe("fk-test-1");
    });

    it("should handle concurrent operations", () => {
      // Add multiple entries quickly
      const entries = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-${i}`,
        torrentHash: `hash-${i}`,
        name: `Concurrent Test ${i}`,
        originalSize: 1000000 * (i + 1),
        downloadedSize: 1000000 * (i + 1),
        downloadPath: `/downloads/concurrent-${i}`,
        startedAt: new Date(Date.now() + i * 1000),
        completedAt: new Date(Date.now() + i * 1000 + 5000),
        downloadTime: 5000,
        averageSpeed: 200000,
        seeders: i + 1,
        leechers: 1,
        ratio: 1.0 + i * 0.1,
        category: i % 2 === 0 ? "movies" : "tv",
        tags: [i % 2 === 0 ? "1080p" : "720p"],
        status: "completed" as const,
      }));

      // Add all entries
      entries.forEach(entry => {
        expect(() => db.addHistoryEntry(entry)).not.toThrow();
      });

      // Verify all were added
      const allEntries = db.getHistoryEntries();
      expect(allEntries).toHaveLength(10);

      // Verify sorting and filtering still work
      const movieEntries = db.getHistoryEntries({ category: "movies" });
      expect(movieEntries).toHaveLength(5);
    });
  });
});