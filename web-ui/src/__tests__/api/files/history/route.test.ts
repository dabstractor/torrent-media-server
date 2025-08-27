/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/files/history/route";
import { getFileHistoryDB } from "@/lib/db/file-history";
import type { DownloadHistoryEntry } from "@/lib/types/file-history";

// Mock the UUID library
jest.mock("uuid", () => ({
  v4: () => "test-uuid-1234",
}));

// Mock the database
jest.mock("@/lib/db/file-history");

const mockDB = {
  getHistoryEntries: jest.fn(),
  addHistoryEntry: jest.fn(),
  getStats: jest.fn(),
};

const mockGetFileHistoryDB = getFileHistoryDB as jest.MockedFunction<
  typeof getFileHistoryDB
>;

describe("/api/files/history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFileHistoryDB.mockReturnValue(mockDB as any);
  });

  describe("GET /api/files/history", () => {
    const mockHistoryEntry: DownloadHistoryEntry = {
      id: "1",
      torrentHash: "abc123",
      name: "Test Movie",
      originalSize: 1000000000,
      downloadedSize: 1000000000,
      downloadPath: "/downloads/movies",
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T11:00:00Z"),
      downloadTime: 3600000,
      averageSpeed: 277777,
      seeders: 10,
      leechers: 2,
      ratio: 1.5,
      category: "movies",
      tags: ["1080p"],
      status: "completed",
    };

    it("should return all history entries with stats", async () => {
      const mockEntries = [mockHistoryEntry];
      const mockStats = {
        totalDownloads: 1,
        totalSize: 1000000000,
        totalTime: 3600000,
        averageSpeed: 277777,
        categoryBreakdown: { movies: 1 },
        statusBreakdown: { completed: 1 },
      };

      mockDB.getHistoryEntries.mockReturnValue(mockEntries);
      mockDB.getStats.mockReturnValue(mockStats);

      const request = new NextRequest("http://localhost:3000/api/files/history");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      // Dates are serialized as ISO strings in JSON response
      const expectedEntries = mockEntries.map(entry => ({
        ...entry,
        startedAt: entry.startedAt.toISOString(),
        completedAt: entry.completedAt.toISOString(),
      }));
      expect(responseData.data.entries).toEqual(expectedEntries);
      expect(responseData.data.total).toBe(1);
      expect(responseData.data.stats).toEqual(mockStats);
      expect(mockDB.getHistoryEntries).toHaveBeenCalledWith({});
    });

    it("should apply category filter", async () => {
      mockDB.getHistoryEntries.mockReturnValue([]);
      mockDB.getStats.mockReturnValue({
        totalDownloads: 0,
        totalSize: 0,
        totalTime: 0,
        averageSpeed: 0,
        categoryBreakdown: {},
        statusBreakdown: {},
      });

      const request = new NextRequest(
        "http://localhost:3000/api/files/history?category=movies",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockDB.getHistoryEntries).toHaveBeenCalledWith({
        category: "movies",
      });
    });

    it("should apply status filter", async () => {
      mockDB.getHistoryEntries.mockReturnValue([]);
      mockDB.getStats.mockReturnValue({
        totalDownloads: 0,
        totalSize: 0,
        totalTime: 0,
        averageSpeed: 0,
        categoryBreakdown: {},
        statusBreakdown: {},
      });

      const request = new NextRequest(
        "http://localhost:3000/api/files/history?status=completed,error",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockDB.getHistoryEntries).toHaveBeenCalledWith({
        status: ["completed", "error"],
      });
    });

    it("should apply search filter", async () => {
      mockDB.getHistoryEntries.mockReturnValue([]);
      mockDB.getStats.mockReturnValue({
        totalDownloads: 0,
        totalSize: 0,
        totalTime: 0,
        averageSpeed: 0,
        categoryBreakdown: {},
        statusBreakdown: {},
      });

      const request = new NextRequest(
        "http://localhost:3000/api/files/history?search=movie",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockDB.getHistoryEntries).toHaveBeenCalledWith({
        searchTerm: "movie",
      });
    });

    it("should apply date range filter", async () => {
      mockDB.getHistoryEntries.mockReturnValue([]);
      mockDB.getStats.mockReturnValue({
        totalDownloads: 0,
        totalSize: 0,
        totalTime: 0,
        averageSpeed: 0,
        categoryBreakdown: {},
        statusBreakdown: {},
      });

      const startDate = "2024-01-01T00:00:00.000Z";
      const endDate = "2024-01-31T23:59:59.000Z";
      
      const request = new NextRequest(
        `http://localhost:3000/api/files/history?startDate=${startDate}&endDate=${endDate}`,
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockDB.getHistoryEntries).toHaveBeenCalledWith({
        dateRange: [new Date(startDate), new Date(endDate)],
      });
    });

    it("should apply size range filter", async () => {
      mockDB.getHistoryEntries.mockReturnValue([]);
      mockDB.getStats.mockReturnValue({
        totalDownloads: 0,
        totalSize: 0,
        totalTime: 0,
        averageSpeed: 0,
        categoryBreakdown: {},
        statusBreakdown: {},
      });

      const request = new NextRequest(
        "http://localhost:3000/api/files/history?minSize=1000000&maxSize=5000000000",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockDB.getHistoryEntries).toHaveBeenCalledWith({
        sizeRange: [1000000, 5000000000],
      });
    });

    it("should apply multiple filters", async () => {
      mockDB.getHistoryEntries.mockReturnValue([]);
      mockDB.getStats.mockReturnValue({
        totalDownloads: 0,
        totalSize: 0,
        totalTime: 0,
        averageSpeed: 0,
        categoryBreakdown: {},
        statusBreakdown: {},
      });

      const request = new NextRequest(
        "http://localhost:3000/api/files/history?category=movies&status=completed&search=action&minSize=1000000&maxSize=5000000000",
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockDB.getHistoryEntries).toHaveBeenCalledWith({
        category: "movies",
        status: ["completed"],
        searchTerm: "action",
        sizeRange: [1000000, 5000000000],
      });
    });

    it("should handle database errors", async () => {
      mockDB.getHistoryEntries.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const request = new NextRequest("http://localhost:3000/api/files/history");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Failed to fetch file history");
    });

    it("should handle invalid date formats", async () => {
      mockDB.getHistoryEntries.mockReturnValue([]);
      mockDB.getStats.mockReturnValue({
        totalDownloads: 0,
        totalSize: 0,
        totalTime: 0,
        averageSpeed: 0,
        categoryBreakdown: {},
        statusBreakdown: {},
      });

      const request = new NextRequest(
        "http://localhost:3000/api/files/history?startDate=invalid-date",
      );
      const response = await GET(request);

      // Should still work but ignore invalid dates
      expect(response.status).toBe(200);
      expect(mockDB.getHistoryEntries).toHaveBeenCalledWith({});
    });

    it("should handle invalid size values", async () => {
      mockDB.getHistoryEntries.mockReturnValue([]);
      mockDB.getStats.mockReturnValue({
        totalDownloads: 0,
        totalSize: 0,
        totalTime: 0,
        averageSpeed: 0,
        categoryBreakdown: {},
        statusBreakdown: {},
      });

      const request = new NextRequest(
        "http://localhost:3000/api/files/history?minSize=not-a-number",
      );
      const response = await GET(request);

      // Should still work but ignore invalid sizes
      expect(response.status).toBe(200);
      expect(mockDB.getHistoryEntries).toHaveBeenCalledWith({});
    });
  });

  describe("POST /api/files/history", () => {
    const mockNewEntry = {
      torrentHash: "xyz789",
      name: "New Movie",
      originalSize: 2000000000,
      downloadedSize: 2000000000,
      downloadPath: "/downloads/new-movie",
      startedAt: "2024-01-02T10:00:00Z",
      completedAt: "2024-01-02T12:00:00Z",
      downloadTime: 7200000,
      averageSpeed: 277777,
      seeders: 15,
      leechers: 3,
      ratio: 1.8,
      category: "movies",
      tags: ["1080p", "bluray"],
      status: "completed" as const,
    };

    it("should add new history entry", async () => {
      mockDB.addHistoryEntry.mockImplementation(() => {});

      const request = new NextRequest("http://localhost:3000/api/files/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockNewEntry),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.id).toBe("test-uuid-1234"); // Our mocked UUID

      // Verify the entry was added to database
      expect(mockDB.addHistoryEntry).toHaveBeenCalledWith({
        ...mockNewEntry,
        id: expect.any(String),
        startedAt: new Date(mockNewEntry.startedAt),
        completedAt: new Date(mockNewEntry.completedAt),
      });
    });

    it("should handle missing required fields", async () => {
      const incompleteEntry = {
        torrentHash: "xyz789",
        name: "Incomplete Entry",
        // Missing required fields
      };

      const request = new NextRequest("http://localhost:3000/api/files/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(incompleteEntry),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Missing required fields: torrentHash, name, downloadPath");
    });

    it("should handle invalid JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/files/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "invalid json{",
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Failed to add history entry");
    });

    it("should handle database errors during insert", async () => {
      mockDB.addHistoryEntry.mockImplementation(() => {
        throw new Error("Database constraint violation");
      });

      const request = new NextRequest("http://localhost:3000/api/files/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mockNewEntry),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe("Failed to add history entry");
    });

    it("should handle invalid date formats in POST", async () => {
      const entryWithInvalidDates = {
        ...mockNewEntry,
        startedAt: "invalid-date",
        completedAt: "also-invalid",
      };

      mockDB.addHistoryEntry.mockImplementation(() => {});

      const request = new NextRequest("http://localhost:3000/api/files/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entryWithInvalidDates),
      });

      const response = await POST(request);
      const responseData = await response.json();

      // API doesn't validate dates, it just creates Date objects which may be Invalid Date
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it("should allow optional fields to be missing", async () => {
      const minimalEntry = {
        torrentHash: "xyz789",
        name: "Minimal Entry",
        downloadPath: "/downloads/minimal",
        // Most fields are optional in the API
      };

      mockDB.addHistoryEntry.mockImplementation(() => {});

      const request = new NextRequest("http://localhost:3000/api/files/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(minimalEntry),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockDB.addHistoryEntry).toHaveBeenCalled();
    });
  });
});