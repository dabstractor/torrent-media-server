import { renderHook, act, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import {
  useFileHistory,
  useFileStats,
  useFilteredFileHistory,
} from "@/hooks/use-file-history";
import * as filesApi from "@/lib/api/files";
import type {
  DownloadHistoryEntry,
  HistoryFilters,
  FileHistoryStats,
} from "@/lib/types/file-history";
import type { FileHistoryResponse } from "@/lib/api/files";

// Mock the API functions
jest.mock("@/lib/api/files");

const mockFilesApi = filesApi as jest.Mocked<typeof filesApi>;

// Test wrapper with SWR config
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SWRConfig
    value={{
      provider: () => new Map(),
      dedupingInterval: 0,
      focusThrottleInterval: 0,
    }}
  >
    {children}
  </SWRConfig>
);

describe("useFileHistory", () => {
  const mockHistoryEntry: DownloadHistoryEntry = {
    id: "1",
    torrentHash: "abc123",
    name: "Test Download",
    originalSize: 1000000,
    downloadedSize: 1000000,
    downloadPath: "/downloads/test",
    torrentFile: "test.torrent",
    magnetUrl: "magnet:?xt=urn:btih:test",
    startedAt: new Date("2024-01-01T10:00:00Z"),
    completedAt: new Date("2024-01-01T10:30:00Z"),
    downloadTime: 1800000,
    averageSpeed: 555555,
    seeders: 10,
    leechers: 2,
    ratio: 1.5,
    category: "movies",
    tags: ["hd", "action"],
    status: "completed",
    metadata: { quality: "1080p" },
  };

  const mockStats: FileHistoryStats = {
    totalDownloads: 5,
    totalSize: 5000000000,
    totalTime: 18000000,
    averageSpeed: 277777,
    categoryBreakdown: { movies: 3, tv: 2 },
    statusBreakdown: { completed: 4, error: 1 },
  };

  const mockResponse: FileHistoryResponse = {
    entries: [mockHistoryEntry],
    total: 1,
    stats: mockStats,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("should fetch file history on mount", async () => {
      mockFilesApi.getFileHistory.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const { result } = renderHook(() => useFileHistory(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.history).toEqual([mockHistoryEntry]);
      expect(result.current.total).toBe(1);
      expect(result.current.stats).toEqual(mockStats);
    });

    it("should handle API errors", async () => {
      const errorMessage = "Failed to fetch file history";
      mockFilesApi.getFileHistory.mockResolvedValue({
        success: false,
        error: errorMessage,
      });

      const { result } = renderHook(() => useFileHistory(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(new Error(errorMessage));
      });
    });

    it("should apply filters to API call", async () => {
      const filters: HistoryFilters = {
        category: "movies",
        status: ["completed"],
        searchTerm: "test",
      };

      mockFilesApi.getFileHistory.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      renderHook(() => useFileHistory({ filters }), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(mockFilesApi.getFileHistory).toHaveBeenCalledWith(filters);
      });
    });
  });

  describe("CRUD Operations", () => {
    it("should add history entry successfully", async () => {
      mockFilesApi.getFileHistory.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      mockFilesApi.addHistoryEntry.mockResolvedValue({
        success: true,
        data: { id: "new-id" },
      });

      const { result } = renderHook(() => useFileHistory(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newEntry = { ...mockHistoryEntry };
      delete (newEntry as any).id;

      let addResult: boolean = false;
      await act(async () => {
        addResult = await result.current.addToHistory(newEntry);
      });

      expect(addResult).toBe(true);
      expect(mockFilesApi.addHistoryEntry).toHaveBeenCalledWith(newEntry);
    });

    it("should handle add entry failure", async () => {
      mockFilesApi.getFileHistory.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      mockFilesApi.addHistoryEntry.mockResolvedValue({
        success: false,
        error: "Add failed",
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const { result } = renderHook(() => useFileHistory(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newEntry = { ...mockHistoryEntry };
      delete (newEntry as any).id;

      let addResult: boolean = true;
      await act(async () => {
        addResult = await result.current.addToHistory(newEntry);
      });

      expect(addResult).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith("Failed to add history entry:", "Add failed");
      
      consoleSpy.mockRestore();
    });

    it("should update history entry successfully", async () => {
      mockFilesApi.getFileHistory.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      mockFilesApi.updateHistoryEntry.mockResolvedValue({
        success: true,
        data: mockHistoryEntry,
      });

      const { result } = renderHook(() => useFileHistory(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updates = { status: "moved" as const };

      let updateResult: boolean = false;
      await act(async () => {
        updateResult = await result.current.updateEntry("1", updates);
      });

      expect(updateResult).toBe(true);
      expect(mockFilesApi.updateHistoryEntry).toHaveBeenCalledWith("1", updates);
    });

    it("should delete history entry successfully", async () => {
      mockFilesApi.getFileHistory.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      mockFilesApi.deleteHistoryEntry.mockResolvedValue({
        success: true,
        data: { success: true },
      });

      const { result } = renderHook(() => useFileHistory(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deleteResult: boolean = false;
      await act(async () => {
        deleteResult = await result.current.deleteEntry("1");
      });

      expect(deleteResult).toBe(true);
      expect(mockFilesApi.deleteHistoryEntry).toHaveBeenCalledWith("1");
    });

    it("should clear history successfully", async () => {
      mockFilesApi.getFileHistory.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      mockFilesApi.clearFileHistory.mockResolvedValue({
        success: true,
        data: { success: true },
      });

      const { result } = renderHook(() => useFileHistory(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let clearResult: boolean = false;
      await act(async () => {
        clearResult = await result.current.clearHistory();
      });

      expect(clearResult).toBe(true);
      expect(mockFilesApi.clearFileHistory).toHaveBeenCalled();
    });
  });

  describe("Custom Options", () => {
    it("should respect custom refresh interval", () => {
      mockFilesApi.getFileHistory.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const customInterval = 60000; // 1 minute
      renderHook(() => useFileHistory({ refreshInterval: customInterval }), {
        wrapper: TestWrapper,
      });

      expect(mockFilesApi.getFileHistory).toHaveBeenCalled();
    });

    it("should respect revalidateOnFocus option", () => {
      mockFilesApi.getFileHistory.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      renderHook(() => useFileHistory({ revalidateOnFocus: false }), {
        wrapper: TestWrapper,
      });

      expect(mockFilesApi.getFileHistory).toHaveBeenCalled();
    });
  });
});

describe("useFileStats", () => {
  const mockStats: FileHistoryStats = {
    totalDownloads: 10,
    totalSize: 10000000000,
    totalTime: 36000000,
    averageSpeed: 277777,
    categoryBreakdown: { movies: 6, tv: 4 },
    statusBreakdown: { completed: 9, error: 1 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch file stats on mount", async () => {
    mockFilesApi.getFileStats.mockResolvedValue({
      success: true,
      data: mockStats,
    });

    const { result } = renderHook(() => useFileStats(), {
      wrapper: TestWrapper,
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStats);
  });

  it("should handle stats API errors", async () => {
    const errorMessage = "Failed to fetch file statistics";
    mockFilesApi.getFileStats.mockResolvedValue({
      success: false,
      error: errorMessage,
    });

    const { result } = renderHook(() => useFileStats(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toEqual(new Error(errorMessage));
    });
  });
});

describe("useFilteredFileHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with empty filters", async () => {
    mockFilesApi.getFileHistory.mockResolvedValue({
      success: true,
      data: {
        entries: [],
        total: 0,
      },
    });

    const { result } = renderHook(() => useFilteredFileHistory(), {
      wrapper: TestWrapper,
    });

    expect(result.current.filters).toEqual({});
  });

  it("should apply filters correctly", async () => {
    mockFilesApi.getFileHistory.mockResolvedValue({
      success: true,
      data: {
        entries: [],
        total: 0,
      },
    });

    const { result } = renderHook(() => useFilteredFileHistory(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setCategory("movies");
    });

    expect(result.current.filters.category).toBe("movies");
  });

  it("should set status filters", async () => {
    mockFilesApi.getFileHistory.mockResolvedValue({
      success: true,
      data: {
        entries: [],
        total: 0,
      },
    });

    const { result } = renderHook(() => useFilteredFileHistory(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setStatus(["completed", "error"]);
    });

    expect(result.current.filters.status).toEqual(["completed", "error"]);
  });

  it("should set date range filters", async () => {
    mockFilesApi.getFileHistory.mockResolvedValue({
      success: true,
      data: {
        entries: [],
        total: 0,
      },
    });

    const { result } = renderHook(() => useFilteredFileHistory(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const dateRange: [Date, Date] = [
      new Date("2024-01-01"),
      new Date("2024-01-31"),
    ];

    act(() => {
      result.current.setDateRange(dateRange);
    });

    expect(result.current.filters.dateRange).toEqual(dateRange);
  });

  it("should set search term", async () => {
    mockFilesApi.getFileHistory.mockResolvedValue({
      success: true,
      data: {
        entries: [],
        total: 0,
      },
    });

    const { result } = renderHook(() => useFilteredFileHistory(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setSearchTerm("test movie");
    });

    expect(result.current.filters.searchTerm).toBe("test movie");
  });

  it("should clear all filters", async () => {
    mockFilesApi.getFileHistory.mockResolvedValue({
      success: true,
      data: {
        entries: [],
        total: 0,
      },
    });

    const { result } = renderHook(() => useFilteredFileHistory(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Set some filters first
    act(() => {
      result.current.applyFilters({
        category: "movies",
        status: ["completed"],
        searchTerm: "test",
      });
    });

    expect(result.current.filters.category).toBe("movies");

    // Clear filters
    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual({});
  });
});