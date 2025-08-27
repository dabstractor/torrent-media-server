/**
 * @jest-environment node
 */

import { FileHistoryDB } from "@/lib/db/file-history";
import type { DownloadHistoryEntry, CompletedFile, StoredTorrentFile } from "@/lib/types/file-history";
import fs from "fs";
import path from "path";

// End-to-end workflow tests that simulate real user scenarios
describe("File History End-to-End Workflows", () => {
  let db: FileHistoryDB;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary database for each test
    testDbPath = path.join(__dirname, `test-e2e-${Date.now()}.db`);
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

  describe("User Download History Management Workflow", () => {
    it("should handle complete user workflow: download -> view history -> filter -> re-download -> delete", async () => {
      // Step 1: User completes a download
      const movieDownload: DownloadHistoryEntry = {
        id: "user-movie-1",
        torrentHash: "movie-hash-abc123",
        name: "Action Movie 2024 1080p BluRay x264",
        originalSize: 2500000000, // 2.5GB
        downloadedSize: 2500000000,
        downloadPath: "/downloads/movies/Action Movie 2024",
        torrentFile: "action-movie-2024.torrent",
        magnetUrl: "magnet:?xt=urn:btih:movie-hash-abc123",
        startedAt: new Date("2024-01-15T14:30:00Z"),
        completedAt: new Date("2024-01-15T16:45:00Z"),
        downloadTime: 8100000, // 2.25 hours
        averageSpeed: 308641, // bytes per second
        seeders: 25,
        leechers: 8,
        ratio: 2.3,
        category: "movies",
        tags: ["1080p", "bluray", "action"],
        status: "completed",
        metadata: { quality: "1080p", source: "bluray", genre: "action" },
      };

      const tvShowDownload: DownloadHistoryEntry = {
        id: "user-tv-1",
        torrentHash: "tv-hash-def456",
        name: "Popular TV Show S01E01 720p WEB-DL x264",
        originalSize: 800000000, // 800MB
        downloadedSize: 800000000,
        downloadPath: "/downloads/tv/Popular TV Show/Season 1",
        torrentFile: "popular-tv-s01e01.torrent",
        magnetUrl: "magnet:?xt=urn:btih:tv-hash-def456",
        startedAt: new Date("2024-01-16T20:00:00Z"),
        completedAt: new Date("2024-01-16T20:15:00Z"),
        downloadTime: 900000, // 15 minutes
        averageSpeed: 888888,
        seeders: 45,
        leechers: 12,
        ratio: 3.1,
        category: "tv",
        tags: ["720p", "webdl"],
        status: "completed",
        metadata: { quality: "720p", source: "webdl", season: "1", episode: "1" },
      };

      // Add downloads to history
      db.addHistoryEntry(movieDownload);
      db.addHistoryEntry(tvShowDownload);

      // Step 2: User views their download history
      let historyEntries = db.getHistoryEntries();
      expect(historyEntries).toHaveLength(2);
      expect(historyEntries.some(e => e.name.includes("Action Movie"))).toBe(true);
      expect(historyEntries.some(e => e.name.includes("Popular TV Show"))).toBe(true);

      // Step 3: User filters history by category
      const movieEntries = db.getHistoryEntries({ category: "movies" });
      expect(movieEntries).toHaveLength(1);
      expect(movieEntries[0].name).toBe("Action Movie 2024 1080p BluRay x264");

      const tvEntries = db.getHistoryEntries({ category: "tv" });
      expect(tvEntries).toHaveLength(1);
      expect(tvEntries[0].name).toBe("Popular TV Show S01E01 720p WEB-DL x264");

      // Step 4: User searches for specific content
      const searchResults = db.getHistoryEntries({ searchTerm: "Action" });
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe("Action Movie 2024 1080p BluRay x264");

      // Step 5: User checks statistics
      const stats = db.getStats();
      expect(stats.totalDownloads).toBe(2);
      expect(stats.totalSize).toBe(3300000000); // 2.5GB + 800MB
      expect(stats.categoryBreakdown).toEqual({ movies: 1, tv: 1 });
      expect(Math.round(stats.averageSpeed)).toBe(598765); // Average of both downloads (308641 + 888888) / 2 = 598764.5

      // Step 6: User wants to re-download the movie
      const movieToRedownload = db.getHistoryEntry("user-movie-1");
      expect(movieToRedownload).not.toBeNull();
      expect(movieToRedownload!.torrentFile).toBe("action-movie-2024.torrent");

      // Step 7: User deletes a download entry from history
      db.deleteHistoryEntry("user-tv-1");
      
      historyEntries = db.getHistoryEntries();
      expect(historyEntries).toHaveLength(1);
      expect(historyEntries[0].name).toBe("Action Movie 2024 1080p BluRay x264");

      // Step 8: User clears entire history
      db.clearHistory();
      
      historyEntries = db.getHistoryEntries();
      expect(historyEntries).toHaveLength(0);
      
      const completedFiles = db.getCompletedFiles();
      expect(completedFiles).toHaveLength(0);
    });
  });

  describe("File Organization and Maintenance Workflow", () => {
    it("should handle file organization: scan -> view -> cleanup -> optimize", async () => {
      // Step 1: System scans completed files
      const completedFiles: CompletedFile[] = [
        {
          path: "/downloads/movies/Action Movie 2024/movie.mp4",
          name: "movie.mp4",
          size: 2400000000,
          modifiedDate: new Date("2024-01-15T16:45:00Z"),
          mediaType: "video",
          torrentHash: "movie-hash-abc123",
          plexCompatible: true,
          quality: "1080p",
        },
        {
          path: "/downloads/tv/Popular TV Show/Season 1/episode1.mp4",
          name: "episode1.mp4",
          size: 750000000,
          modifiedDate: new Date("2024-01-16T20:15:00Z"),
          mediaType: "video",
          torrentHash: "tv-hash-def456",
          plexCompatible: true,
          quality: "720p",
        },
        {
          path: "/downloads/temp/old-file.txt",
          name: "old-file.txt",
          size: 1000,
          modifiedDate: new Date("2023-01-01T10:00:00Z"),
          mediaType: "document",
          plexCompatible: false,
        },
      ];

      completedFiles.forEach(file => db.addCompletedFile(file));

      // Step 2: User views completed files
      let allFiles = db.getCompletedFiles();
      expect(allFiles).toHaveLength(3);
      
      const movieFiles = db.getCompletedFiles("movie-hash-abc123");
      expect(movieFiles).toHaveLength(1);
      expect(movieFiles[0].name).toBe("movie.mp4");

      // Step 3: System stores torrent information
      const torrentFiles: StoredTorrentFile[] = [
        {
          hash: "movie-hash-abc123",
          filename: "action-movie-2024.torrent",
          title: "Action Movie 2024",
          size: 35000,
          createdDate: new Date("2024-01-15T14:00:00Z"),
          trackers: ["tracker1.com", "tracker2.com"],
          files: [
            { path: "movie.mp4", size: 2400000000 },
            { path: "subtitles/en.srt", size: 45000 },
          ],
          magnetUrl: "magnet:?xt=urn:btih:movie-hash-abc123",
          storagePath: "/torrents/action-movie-2024.torrent",
        },
        {
          hash: "tv-hash-def456",
          filename: "popular-tv-s01e01.torrent",
          title: "Popular TV Show S01E01",
          size: 28000,
          createdDate: new Date("2024-01-16T19:30:00Z"),
          trackers: ["tracker1.com", "tracker3.com"],
          files: [
            { path: "episode1.mp4", size: 750000000 },
            { path: "subtitles/en.srt", size: 32000 },
          ],
          magnetUrl: "magnet:?xt=urn:btih:tv-hash-def456",
          storagePath: "/torrents/popular-tv-s01e01.torrent",
        },
      ];

      torrentFiles.forEach(torrent => db.addStoredTorrentFile(torrent));

      // Step 4: User browses stored torrents (query each by hash)
      const movieTorrent = db.getStoredTorrentFile("movie-hash-abc123");
      const tvTorrent = db.getStoredTorrentFile("tv-hash-def456");
      expect(movieTorrent).not.toBeNull();
      expect(tvTorrent).not.toBeNull();
      
      expect(movieTorrent!.title).toBe("Action Movie 2024");

      // Step 5: User identifies and removes orphaned files
      // In a real scenario, the system would detect that old-file.txt is orphaned
      // For this test, we'll simulate the cleanup process
      const orphanedFiles = allFiles.filter(file => !file.torrentHash);
      expect(orphanedFiles).toHaveLength(1);
      expect(orphanedFiles[0].name).toBe("old-file.txt");

      // Step 6: System optimizes database
      // This would typically involve VACUUM operations or index rebuilding
      // For testing, we just verify the database is still functional
      const finalStats = db.getStats();
      expect(finalStats.totalDownloads).toBe(0); // History entries were not added in this test
      
      // Add history entries to verify stats
      const historyEntry: DownloadHistoryEntry = {
        id: "cleanup-test-1",
        torrentHash: "movie-hash-abc123",
        name: "Cleanup Test Movie",
        originalSize: 2400000000,
        downloadedSize: 2400000000,
        downloadPath: "/downloads/movies/Cleanup Test",
        startedAt: new Date("2024-01-17T10:00:00Z"),
        completedAt: new Date("2024-01-17T12:00:00Z"),
        downloadTime: 7200000,
        averageSpeed: 333333,
        seeders: 20,
        leechers: 5,
        ratio: 2.0,
        category: "movies",
        tags: ["1080p"],
        status: "completed",
      };
      
      db.addHistoryEntry(historyEntry);
      
      const updatedStats = db.getStats();
      expect(updatedStats.totalDownloads).toBe(1);
      expect(updatedStats.totalSize).toBe(2400000000);
    });
  });

  describe("Advanced Search and Filter Workflow", () => {
    it("should handle complex search and filtering scenarios", async () => {
      // Create a large dataset for testing
      const baseDate = new Date("2024-01-01T00:00:00Z");
      
      const entries: DownloadHistoryEntry[] = Array.from({ length: 50 }, (_, i) => ({
        id: `search-${i}`,
        torrentHash: `hash-${i}`,
        name: `Content ${i} ${i % 3 === 0 ? 'Movie' : 'TV Show'} ${i % 2 === 0 ? 'HD' : 'SD'}`,
        originalSize: 1000000000 + (i * 100000000), // 1GB + increments
        downloadedSize: 1000000000 + (i * 100000000),
        downloadPath: `/downloads/${i % 3 === 0 ? 'movies' : 'tv'}/content-${i}`,
        startedAt: new Date(baseDate.getTime() + (i * 86400000)), // One day apart
        completedAt: new Date(baseDate.getTime() + (i * 86400000) + 3600000), // 1 hour later
        downloadTime: 3600000,
        averageSpeed: 1000000 + (i * 10000), // Varying speeds
        seeders: 5 + (i % 20),
        leechers: 1 + (i % 5),
        ratio: 1.0 + (i * 0.1),
        category: i % 3 === 0 ? "movies" : (i % 3 === 1 ? "tv" : "other"),
        tags: [
          i % 2 === 0 ? "1080p" : "720p",
          i % 4 === 0 ? "bluray" : "webdl",
          ...(i % 5 === 0 ? ["action"] : []),
          ...(i % 7 === 0 ? ["comedy"] : [])
        ],
        status: i % 4 === 0 ? "completed" : (i % 4 === 1 ? "error" : (i % 4 === 2 ? "moved" : "deleted")),
        metadata: {
          quality: i % 2 === 0 ? "1080p" : "720p",
          source: i % 4 === 0 ? "bluray" : "webdl",
          year: (2020 + (i % 5)).toString()
        },
      }));

      // Add all entries to database
      entries.forEach(entry => db.addHistoryEntry(entry));

      // Step 1: Basic search
      let results = db.getHistoryEntries({ searchTerm: "Movie" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(e => e.name.includes("Movie"))).toBe(true);

      // Step 2: Category filter
      results = db.getHistoryEntries({ category: "movies" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(e => e.category === "movies")).toBe(true);

      // Step 3: Status filter
      results = db.getHistoryEntries({ status: ["completed", "moved"] });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(e => e.status === "completed" || e.status === "moved")).toBe(true);

      // Step 4: Tag filter - search for entries that might have 1080p in their name
      results = db.getHistoryEntries({ searchTerm: "HD" });
      expect(results.length).toBeGreaterThan(0);
      // Note: searchTerm searches entry names, not tags. For tag filtering, we'd need a different approach.

      // Step 5: Date range filter
      const startDate = new Date("2024-01-10T00:00:00Z");
      const endDate = new Date("2024-01-20T23:59:59Z");
      
      results = db.getHistoryEntries({
        dateRange: [startDate, endDate]
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(e => 
        e.completedAt >= startDate && e.completedAt <= endDate
      )).toBe(true);

      // Step 6: Size range filter
      results = db.getHistoryEntries({
        sizeRange: [1500000000, 3000000000] // 1.5GB to 3GB
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(e => 
        e.originalSize >= 1500000000 && e.originalSize <= 3000000000
      )).toBe(true);

      // Step 7: Combined filters
      results = db.getHistoryEntries({
        category: "movies",
        status: ["completed"],
        dateRange: [startDate, endDate],
        sizeRange: [1000000000, 4000000000]
      });
      
      expect(results.length).toBeGreaterThanOrEqual(0);
      if (results.length > 0) {
        expect(results.every(e => 
          e.category === "movies" &&
          e.status === "completed" &&
          e.completedAt >= startDate &&
          e.completedAt <= endDate &&
          e.originalSize >= 1000000000 &&
          e.originalSize <= 4000000000
        )).toBe(true);
      }

      // Step 8: Verify statistics are accurate
      const stats = db.getStats();
      expect(stats.totalDownloads).toBe(50);
      expect(stats.categoryBreakdown.movies).toBeGreaterThanOrEqual(16); // Approximately 1/3
      expect(stats.categoryBreakdown.tv).toBeGreaterThanOrEqual(16); // Approximately 1/3
      expect(stats.statusBreakdown.completed).toBeGreaterThanOrEqual(12); // Approximately 1/4
    });
  });
});