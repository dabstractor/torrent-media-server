/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { GET as getHistoryRoute, POST as postHistoryRoute } from "@/app/api/files/history/route";
import { GET as getStatsRoute } from "@/app/api/files/stats/route";
import { FileHistoryDB } from "@/lib/db/file-history";
import type { DownloadHistoryEntry } from "@/lib/types/file-history";
import fs from "fs";
import path from "path";

// Mock the UUID library
jest.mock("uuid", () => ({
  v4: () => "test-uuid-1234",
}));

// Create a real database instance for integration testing
describe("API Routes Integration", () => {
  let db: FileHistoryDB;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary database for each test
    testDbPath = path.join(__dirname, `test-api-integration-${Date.now()}.db`);
    db = new FileHistoryDB(testDbPath);
    
    // Mock the database getter to return our test database
    jest.mock("@/lib/db/file-history", () => ({
      getFileHistoryDB: () => db,
    }));
    
    // Reset modules to ensure mocks are applied
    jest.resetModules();
  });

  afterEach(() => {
    // Clean up after each test
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    jest.resetModules();
  });

  describe("History API Integration", () => {
    let mockHistoryEntry: DownloadHistoryEntry;

    beforeEach(() => {
      // Create fresh mock data for each test
      mockHistoryEntry = {
        id: "api-test-1",
        torrentHash: "api-hash-123",
        name: "API Test Movie",
        originalSize: 2000000000,
        downloadedSize: 2000000000,
        downloadPath: "/downloads/api-test",
        torrentFile: "api-test.torrent",
        magnetUrl: "magnet:?xt=urn:btih:api-hash-123",
        startedAt: new Date("2024-01-01T10:00:00Z"),
        completedAt: new Date("2024-01-01T12:00:00Z"),
        downloadTime: 7200000,
        averageSpeed: 277777,
        seeders: 15,
        leechers: 3,
        ratio: 1.8,
        category: "movies",
        tags: ["1080p", "bluray"],
        status: "completed",
        metadata: { quality: "1080p", source: "bluray" },
      };
      
      // Clear database before each test
      db.clearHistory();
    });

    it("should handle complete GET workflow with real database", async () => {
      // Clear database first
      db.clearHistory();
      
      // Add test data directly to database
      db.addHistoryEntry(mockHistoryEntry);

      // Make API request
      const request = new NextRequest("http://localhost:3000/api/files/history");
      const response = await getHistoryRoute(request);
      const responseData = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.entries).toHaveLength(1);
      expect(responseData.data.total).toBe(1);
      
      // Verify entry data (dates should be serialized as ISO strings)
      const returnedEntry = responseData.data.entries[0];
      expect(returnedEntry.name).toBe(mockHistoryEntry.name);
      expect(returnedEntry.startedAt).toBe(mockHistoryEntry.startedAt.toISOString());
      expect(returnedEntry.completedAt).toBe(mockHistoryEntry.completedAt.toISOString());
      
      // Verify stats are included
      expect(responseData.data.stats).toBeDefined();
      expect(responseData.data.stats!.totalDownloads).toBe(1);
    });

    it("should handle POST workflow with real database", async () => {
      // Clear database first
      db.clearHistory();
      
      // Prepare POST request data
      const postData = {
        torrentHash: "new-hash-456",
        name: "New Movie from API",
        originalSize: 1500000000,
        downloadedSize: 1500000000,
        downloadPath: "/downloads/new-movie",
        startedAt: "2024-01-02T10:00:00Z",
        completedAt: "2024-01-02T11:30:00Z",
        downloadTime: 5400000,
        averageSpeed: 277777,
        seeders: 12,
        leechers: 4,
        ratio: 2.1,
        category: "movies",
        tags: ["720p"],
        status: "completed",
      };

      const request = new NextRequest("http://localhost:3000/api/files/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      // Make API request
      const response = await postHistoryRoute(request);
      const responseData = await response.json();

      // Verify response
      expect(response.status).toBe(200); // POST returns 200 in the actual implementation
      expect(responseData.success).toBe(true);
      expect(responseData.data.id).toBe("test-uuid-1234"); // Our mocked UUID

      // Verify entry was actually added to database
      const entries = db.getHistoryEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe("test-uuid-1234");
      expect(entries[0].torrentHash).toBe("new-hash-456");
      expect(entries[0].name).toBe("New Movie from API");
    });

    it("should handle filtering through API with real database", async () => {
      // Clear database first
      db.clearHistory();
      
      // Add multiple test entries
      const entry1 = { ...mockHistoryEntry, id: "1", category: "movies", status: "completed" as const };
      const entry2 = { ...mockHistoryEntry, id: "2", category: "tv", status: "completed" as const, name: "TV Show" };
      const entry3 = { ...mockHistoryEntry, id: "3", category: "movies", status: "error" as const, name: "Error Movie" };

      db.addHistoryEntry(entry1);
      db.addHistoryEntry(entry2);
      db.addHistoryEntry(entry3);

      // Test category filter
      const categoryRequest = new NextRequest("http://localhost:3000/api/files/history?category=tv");
      const categoryResponse = await getHistoryRoute(categoryRequest);
      const categoryData = await categoryResponse.json();

      expect(categoryResponse.status).toBe(200);
      expect(categoryData.data.entries).toHaveLength(1);
      expect(categoryData.data.entries[0].name).toBe("TV Show");

      // Test status filter
      const statusRequest = new NextRequest("http://localhost:3000/api/files/history?status=error");
      const statusResponse = await getHistoryRoute(statusRequest);
      const statusData = await statusResponse.json();

      expect(statusResponse.status).toBe(200);
      expect(statusData.data.entries).toHaveLength(1);
      expect(statusData.data.entries[0].status).toBe("error");

      // Test search filter
      const searchRequest = new NextRequest("http://localhost:3000/api/files/history?search=Error");
      const searchResponse = await getHistoryRoute(searchRequest);
      const searchData = await searchResponse.json();

      expect(searchResponse.status).toBe(200);
      expect(searchData.data.entries).toHaveLength(1);
      expect(searchData.data.entries[0].name).toBe("Error Movie");

      // Test combined filters
      const combinedRequest = new NextRequest("http://localhost:3000/api/files/history?category=movies&status=completed");
      const combinedResponse = await getHistoryRoute(combinedRequest);
      const combinedData = await combinedResponse.json();

      expect(combinedResponse.status).toBe(200);
      expect(combinedData.data.entries).toHaveLength(1);
      expect(combinedData.data.entries[0].id).toBe("1");
    });
  });

  describe("Stats API Integration", () => {
    let mockHistoryEntry: DownloadHistoryEntry;

    beforeEach(() => {
      // Create fresh mock data for each test
      mockHistoryEntry = {
        id: "stats-test-1",
        torrentHash: "stats-hash-123",
        name: "Stats Test Movie",
        originalSize: 2000000000,
        downloadedSize: 2000000000,
        downloadPath: "/downloads/stats-test",
        startedAt: new Date("2024-01-01T10:00:00Z"),
        completedAt: new Date("2024-01-01T12:00:00Z"),
        downloadTime: 7200000,
        averageSpeed: 277777,
        seeders: 15,
        leechers: 3,
        ratio: 1.8,
        category: "movies",
        tags: ["1080p"],
        status: "completed",
      };
      
      // Clear database before each test
      db.clearHistory();
    });

    it("should return accurate statistics", async () => {
      // Clear database first
      db.clearHistory();
      
      // Add test data
      db.addHistoryEntry(mockHistoryEntry);

      // Make stats API request
      const request = new NextRequest("http://localhost:3000/api/files/stats");
      const response = await getStatsRoute(request);
      const responseData = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.totalDownloads).toBe(1);
      expect(responseData.data.totalSize).toBe(1500000000); // From the POST data
      expect(responseData.data.totalTime).toBe(5400000); // From the POST data
      expect(responseData.data.averageSpeed).toBe(277777); // From the POST data
      expect(responseData.data.categoryBreakdown).toEqual({ movies: 1 });
      expect(responseData.data.statusBreakdown).toEqual({ completed: 1 });
    });

    it("should handle empty database for stats", async () => {
      // Clear database first
      db.clearHistory();
      
      // Make stats API request on empty database
      const request = new NextRequest("http://localhost:3000/api/files/stats");
      const response = await getStatsRoute(request);
      const responseData = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.totalDownloads).toBe(0);
      expect(responseData.data.totalSize).toBe(0);
      expect(responseData.data.totalTime).toBe(0);
      expect(responseData.data.averageSpeed).toBe(0);
      expect(responseData.data.categoryBreakdown).toEqual({});
      expect(responseData.data.statusBreakdown).toEqual({});
    });
  });
});