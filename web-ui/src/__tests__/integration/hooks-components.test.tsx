import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useFileHistory, useFileStats } from "@/hooks/use-file-history";
import * as api from "@/lib/api/files";
import type { DownloadHistoryEntry, FileHistoryStats } from "@/lib/types/file-history";

// Mock the API functions
jest.mock("@/lib/api/files");

const mockApi = api as jest.Mocked<typeof api>;

// Test component that uses the hook
const TestHistoryComponent: React.FC = () => {
  const { history, stats, isLoading, error, refresh } = useFileHistory();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <button onClick={() => refresh()}>Refresh</button>
      <div data-testid="history-count">{history.length}</div>
      <div data-testid="total-size">{stats?.totalSize || 0}</div>
      {history.map(entry => (
        <div key={entry.id} data-testid={`entry-${entry.id}`}>
          {entry.name}
        </div>
      ))}
    </div>
  );
};

const TestStatsComponent: React.FC = () => {
  const { stats, isLoading, error } = useFileStats();
  
  if (isLoading) return <div>Loading stats...</div>;
  if (error) return <div>Stats Error: {error.message}</div>;
  
  return (
    <div>
      <div data-testid="downloads-count">{stats?.totalDownloads || 0}</div>
      <div data-testid="average-speed">{stats?.averageSpeed || 0}</div>
    </div>
  );
};

describe("File History Hook Integration", () => {
  const mockHistoryEntry: DownloadHistoryEntry = {
    id: "hook-test-1",
    torrentHash: "hook-hash-123",
    name: "Hook Test Movie",
    originalSize: 2000000000,
    downloadedSize: 2000000000,
    downloadPath: "/downloads/hook-test",
    torrentFile: "hook-test.torrent",
    magnetUrl: "magnet:?xt=urn:btih:hook-hash-123",
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

  const mockStats: FileHistoryStats = {
    totalDownloads: 1,
    totalSize: 2000000000,
    totalTime: 7200000,
    averageSpeed: 277777,
    categoryBreakdown: { movies: 1 },
    statusBreakdown: { completed: 1 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch and display file history", async () => {
    // Mock API response
    mockApi.getFileHistory.mockResolvedValue({
      success: true,
      data: {
        entries: [mockHistoryEntry],
        total: 1,
        stats: mockStats,
      },
    });

    // Render component with SWR cache disabled for predictable testing
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <TestHistoryComponent />
      </SWRConfig>
    );

    // Should show loading state first
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId("history-count")).toHaveTextContent("1");
    });

    // Verify data is displayed
    expect(screen.getByTestId(`entry-${mockHistoryEntry.id}`)).toHaveTextContent("Hook Test Movie");
    expect(screen.getByTestId("total-size")).toHaveTextContent("2000000000");
  });

  it("should handle API errors gracefully", async () => {
    // Mock API error
    mockApi.getFileHistory.mockResolvedValue({
      success: false,
      data: null,
      error: "Failed to fetch file history",
    });

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <TestHistoryComponent />
      </SWRConfig>
    );

    // Wait for error to be handled
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to fetch file history/)).toBeInTheDocument();
  });

  it("should refresh data when requested", async () => {
    // Mock initial API response
    mockApi.getFileHistory.mockResolvedValueOnce({
      success: true,
      data: {
        entries: [],
        total: 0,
        stats: {
          totalDownloads: 0,
          totalSize: 0,
          totalTime: 0,
          averageSpeed: 0,
          categoryBreakdown: {},
          statusBreakdown: {},
        },
      },
    });

    // Mock refreshed API response
    mockApi.getFileHistory.mockResolvedValueOnce({
      success: true,
      data: {
        entries: [mockHistoryEntry],
        total: 1,
        stats: mockStats,
      },
    });

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <TestHistoryComponent />
      </SWRConfig>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId("history-count")).toHaveTextContent("0");
    });

    // Trigger refresh
    await act(async () => {
      screen.getByText("Refresh").click();
    });

    // Wait for refreshed data
    await waitFor(() => {
      expect(screen.getByTestId("history-count")).toHaveTextContent("1");
    });

    expect(screen.getByTestId(`entry-${mockHistoryEntry.id}`)).toBeInTheDocument();
  });

  it("should fetch and display file statistics", async () => {
    // Mock stats API response
    mockApi.getFileStats.mockResolvedValue({
      success: true,
      data: mockStats,
    });

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <TestStatsComponent />
      </SWRConfig>
    );

    // Should show loading state first
    expect(screen.getByText("Loading stats...")).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId("downloads-count")).toHaveTextContent("1");
    });

    // Verify stats are displayed
    expect(screen.getByTestId("downloads-count")).toHaveTextContent("1");
    expect(screen.getByTestId("average-speed")).toHaveTextContent("277777");
  });

  it("should handle stats API errors", async () => {
    // Mock stats API error
    mockApi.getFileStats.mockResolvedValue({
      success: false,
      data: null,
      error: "Failed to fetch statistics",
    });

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <TestStatsComponent />
      </SWRConfig>
    );

    // Wait for error to be handled
    await waitFor(() => {
      expect(screen.getByText(/Stats Error:/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to fetch statistics/)).toBeInTheDocument();
  });
});

describe("Filtered File History Hook Integration", () => {
  const mockHistoryEntries: DownloadHistoryEntry[] = [
    {
      id: "1",
      torrentHash: "hash-1",
      name: "Movie 1",
      originalSize: 1000000000,
      downloadedSize: 1000000000,
      downloadPath: "/downloads/movie1",
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
    },
    {
      id: "2",
      torrentHash: "hash-2",
      name: "TV Show 1",
      originalSize: 2000000000,
      downloadedSize: 2000000000,
      downloadPath: "/downloads/tv1",
      startedAt: new Date("2024-01-02T10:00:00Z"),
      completedAt: new Date("2024-01-02T12:00:00Z"),
      downloadTime: 7200000,
      averageSpeed: 277777,
      seeders: 15,
      leechers: 3,
      ratio: 1.8,
      category: "tv",
      tags: ["720p"],
      status: "completed",
    },
  ];

  const mockStats: FileHistoryStats = {
    totalDownloads: 2,
    totalSize: 3000000000,
    totalTime: 10800000,
    averageSpeed: 277777,
    categoryBreakdown: { movies: 1, tv: 1 },
    statusBreakdown: { completed: 2 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should apply filters correctly", async () => {
    // Mock API responses for different filter scenarios
    mockApi.getFileHistory.mockImplementation(async (filters) => {
      if (filters?.category === "movies") {
        return {
          success: true,
          data: {
            entries: [mockHistoryEntries[0]],
            total: 1,
            stats: mockStats,
          },
        };
      } else if (filters?.category === "tv") {
        return {
          success: true,
          data: {
            entries: [mockHistoryEntries[1]],
            total: 1,
            stats: mockStats,
          },
        };
      } else {
        return {
          success: true,
          data: {
            entries: mockHistoryEntries,
            total: 2,
            stats: mockStats,
          },
        };
      }
    });

    // Test component with filters
    const TestFilteredComponent: React.FC = () => {
      const [filters, setFilters] = React.useState<any>({});
      const { history, isLoading } = useFileHistory({ filters });
      
      if (isLoading) return <div>Loading...</div>;
      
      return (
        <div>
          <button onClick={() => setFilters({ category: "movies" })}>Filter Movies</button>
          <button onClick={() => setFilters({ category: "tv" })}>Filter TV</button>
          <button onClick={() => setFilters({})}>Clear Filters</button>
          <div data-testid="history-count">{history.length}</div>
          {history.map(entry => (
            <div key={entry.id} data-testid={`entry-${entry.id}`}>
              {entry.name}
            </div>
          ))}
        </div>
      );
    };

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <TestFilteredComponent />
      </SWRConfig>
    );

    // Wait for initial load (no filters)
    await waitFor(() => {
      expect(screen.getByTestId("history-count")).toHaveTextContent("2");
    });

    // Apply movies filter
    await act(async () => {
      screen.getByText("Filter Movies").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("history-count")).toHaveTextContent("1");
      expect(screen.getByTestId("entry-1")).toBeInTheDocument();
      expect(screen.queryByTestId("entry-2")).not.toBeInTheDocument();
    });

    // Apply TV filter
    await act(async () => {
      screen.getByText("Filter TV").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("history-count")).toHaveTextContent("1");
      expect(screen.getByTestId("entry-2")).toBeInTheDocument();
      expect(screen.queryByTestId("entry-1")).not.toBeInTheDocument();
    });

    // Clear filters
    await act(async () => {
      screen.getByText("Clear Filters").click();
    });

    await waitFor(() => {
      expect(screen.getByTestId("history-count")).toHaveTextContent("2");
      expect(screen.getByTestId("entry-1")).toBeInTheDocument();
      expect(screen.getByTestId("entry-2")).toBeInTheDocument();
    });
  });
});