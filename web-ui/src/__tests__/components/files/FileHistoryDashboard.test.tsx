import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import FileHistoryDashboard from "@/components/files/FileHistoryDashboard";
import * as useFileHistoryHook from "@/hooks/use-file-history";
import type {
  DownloadHistoryEntry,
  FileHistoryStats,
} from "@/lib/types/file-history";

// Mock the hooks
jest.mock("@/hooks/use-file-history");

// Mock the utility functions
jest.mock("@/lib/api/files", () => ({
  formatFileSize: (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`,
  formatSpeed: (bps: number) => `${(bps / 1024 / 1024).toFixed(1)} MB/s`,
}));

// Mock child components
jest.mock("@/components/files/FileHistoryCard", () => {
  return function MockFileHistoryCard({
    entry,
    onRedownload,
    onDelete,
    onViewFiles,
  }: any) {
    return (
      <div data-testid={`file-history-card-${entry.id}`}>
        <span>{entry.name}</span>
        <button onClick={() => onRedownload(entry)}>Redownload</button>
        <button onClick={() => onDelete(entry.id)}>Delete</button>
        {onViewFiles && (
          <button onClick={() => onViewFiles(entry)}>View Files</button>
        )}
      </div>
    );
  };
});

jest.mock("@/components/common/LoadingSpinner", () => {
  return function MockLoadingSpinner() {
    return <div data-testid="loading-spinner">Loading...</div>;
  };
});

jest.mock("@/components/common/ErrorMessage", () => {
  return function MockErrorMessage({ message }: { message: string }) {
    return <div data-testid="error-message">{message}</div>;
  };
});

const mockUseFileHistory = useFileHistoryHook as jest.Mocked<
  typeof useFileHistoryHook
>;

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

describe("FileHistoryDashboard", () => {
  const mockHistoryEntries: DownloadHistoryEntry[] = [
    {
      id: "1",
      torrentHash: "hash1",
      name: "Action Movie 2024",
      originalSize: 2000000000,
      downloadedSize: 2000000000,
      downloadPath: "/downloads/movies/action",
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T12:00:00Z"),
      downloadTime: 7200000,
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
      torrentHash: "hash2",
      name: "Comedy Show S01E01",
      originalSize: 1000000000,
      downloadedSize: 1000000000,
      downloadPath: "/downloads/tv/comedy",
      startedAt: new Date("2024-01-02T14:00:00Z"),
      completedAt: new Date("2024-01-02T15:00:00Z"),
      downloadTime: 3600000,
      averageSpeed: 277777,
      seeders: 5,
      leechers: 1,
      ratio: 2.0,
      category: "tv",
      tags: ["720p"],
      status: "completed",
    },
    {
      id: "3",
      torrentHash: "hash3",
      name: "Documentary 2024",
      originalSize: 1500000000,
      downloadedSize: 1500000000,
      downloadPath: "/downloads/docs",
      startedAt: new Date("2024-01-03T16:00:00Z"),
      completedAt: new Date("2024-01-03T17:30:00Z"),
      downloadTime: 5400000,
      averageSpeed: 277777,
      seeders: 8,
      leechers: 0,
      ratio: 3.0,
      category: "documentaries",
      tags: ["4k"],
      status: "error",
    },
  ];

  const mockStats: FileHistoryStats = {
    totalDownloads: 10,
    totalSize: 20000000000,
    totalTime: 72000000,
    averageSpeed: 277777,
    categoryBreakdown: {
      movies: 5,
      tv: 3,
      documentaries: 2,
    },
    statusBreakdown: {
      completed: 8,
      error: 2,
    },
  };

  const defaultMockHookReturn = {
    history: mockHistoryEntries,
    total: mockHistoryEntries.length,
    isLoading: false,
    error: undefined,
    refresh: jest.fn(),
    deleteEntry: jest.fn(),
    addToHistory: jest.fn(),
    updateEntry: jest.fn(),
    clearHistory: jest.fn(),
    stats: undefined,
  };

  const defaultMockStatsReturn = {
    stats: mockStats,
    isLoading: false,
    error: undefined,
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseFileHistory.useFileHistory.mockReturnValue(defaultMockHookReturn);
    mockUseFileHistory.useFileStats.mockReturnValue(defaultMockStatsReturn);

    // Mock window functions
    global.alert = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render statistics when available", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("10")).toBeInTheDocument(); // Total downloads
      expect(screen.getByText("Total Downloads")).toBeInTheDocument();
      expect(screen.getByText("19073.5 MB")).toBeInTheDocument(); // Total size formatted
      expect(screen.getByText("Total Size")).toBeInTheDocument();
    });

    it("should render search and filter controls", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      expect(screen.getByPlaceholderText("Search downloads...")).toBeInTheDocument();
      expect(screen.getByDisplayValue("All Categories")).toBeInTheDocument();
      expect(screen.getByText("completed")).toBeInTheDocument();
      expect(screen.getByText("error")).toBeInTheDocument();
      expect(screen.getByText("deleted")).toBeInTheDocument();
      expect(screen.getByText("moved")).toBeInTheDocument();
    });

    it("should render history entries", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      expect(screen.getByTestId("file-history-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("file-history-card-2")).toBeInTheDocument();
      expect(screen.getByTestId("file-history-card-3")).toBeInTheDocument();
      expect(screen.getByText("Action Movie 2024")).toBeInTheDocument();
      expect(screen.getByText("Comedy Show S01E01")).toBeInTheDocument();
    });

    it("should show results summary", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Showing 3 of 3 downloads")).toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    it("should show loading spinner when initially loading", () => {
      mockUseFileHistory.useFileHistory.mockReturnValue({
        ...defaultMockHookReturn,
        isLoading: true,
        history: [],
      });

      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("should show refresh button as disabled when loading", () => {
      mockUseFileHistory.useFileHistory.mockReturnValue({
        ...defaultMockHookReturn,
        isLoading: true,
      });

      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const refreshButton = screen.getByText("Refreshing...");
      expect(refreshButton).toBeDisabled();
    });
  });

  describe("Error States", () => {
    it("should show error message when hook returns error", () => {
      const error = new Error("Failed to load data");
      mockUseFileHistory.useFileHistory.mockReturnValue({
        ...defaultMockHookReturn,
        error,
      });

      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      expect(screen.getByTestId("error-message")).toBeInTheDocument();
      expect(screen.getByText("Failed to load file history")).toBeInTheDocument();
    });
  });

  describe("Empty States", () => {
    it("should show no data message when history is empty", () => {
      mockUseFileHistory.useFileHistory.mockReturnValue({
        ...defaultMockHookReturn,
        history: [],
        total: 0,
      });

      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("No download history found")).toBeInTheDocument();
    });

    it("should show filtered empty message when filters are applied", () => {
      mockUseFileHistory.useFileHistory.mockReturnValue({
        ...defaultMockHookReturn,
        history: [],
        total: 0,
      });

      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      // Apply a filter
      const categorySelect = screen.getByDisplayValue("All Categories");
      fireEvent.change(categorySelect, { target: { value: "movies" } });

      expect(screen.getByText("No downloads found matching your filters")).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("should update search term on input change", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText("Search downloads...");
      fireEvent.change(searchInput, { target: { value: "Action" } });

      expect(searchInput).toHaveValue("Action");
    });

    it("should trigger search on Enter key", () => {
      const mockRefresh = jest.fn();
      mockUseFileHistory.useFileHistory.mockReturnValue({
        ...defaultMockHookReturn,
        refresh: mockRefresh,
      });

      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText("Search downloads...");
      fireEvent.change(searchInput, { target: { value: "Action" } });
      fireEvent.keyPress(searchInput, { key: "Enter", code: "Enter" });

      // The component should call useFileHistory with new filters
      expect(mockUseFileHistory.useFileHistory).toHaveBeenCalledWith({
        filters: { searchTerm: "Action" },
      });
    });

    it("should trigger search on button click", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const searchInput = screen.getByPlaceholderText("Search downloads...");
      const searchButton = screen.getByText("Search");

      fireEvent.change(searchInput, { target: { value: "Comedy" } });
      fireEvent.click(searchButton);

      expect(mockUseFileHistory.useFileHistory).toHaveBeenCalledWith({
        filters: { searchTerm: "Comedy" },
      });
    });
  });

  describe("Category Filtering", () => {
    it("should populate category dropdown with available categories", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const categorySelect = screen.getByDisplayValue("All Categories");
      
      // Check if the categories from the mock data are available
      expect(screen.getByText("documentaries")).toBeInTheDocument();
      expect(screen.getByText("movies")).toBeInTheDocument();
      expect(screen.getByText("tv")).toBeInTheDocument();
    });

    it("should apply category filter when selection changes", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const categorySelect = screen.getByDisplayValue("All Categories");
      fireEvent.change(categorySelect, { target: { value: "movies" } });

      expect(mockUseFileHistory.useFileHistory).toHaveBeenCalledWith({
        filters: { category: "movies" },
      });
    });
  });

  describe("Status Filtering", () => {
    it("should toggle status filters when clicked", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const completedButton = screen.getByText("completed");
      fireEvent.click(completedButton);

      expect(mockUseFileHistory.useFileHistory).toHaveBeenCalledWith({
        filters: { status: ["completed"] },
      });

      // Click again to remove
      fireEvent.click(completedButton);

      expect(mockUseFileHistory.useFileHistory).toHaveBeenCalledWith({
        filters: { status: [] },
      });
    });

    it("should allow multiple status selections", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const completedButton = screen.getByText("completed");
      const errorButton = screen.getByText("error");

      fireEvent.click(completedButton);
      fireEvent.click(errorButton);

      expect(mockUseFileHistory.useFileHistory).toHaveBeenCalledWith({
        filters: { status: ["completed", "error"] },
      });
    });

    it("should show active state for selected statuses", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const completedButton = screen.getByText("completed");
      fireEvent.click(completedButton);

      expect(completedButton).toHaveClass("bg-blue-100", "border-blue-500", "text-blue-700");
    });
  });

  describe("Combined Filtering", () => {
    it("should combine search, category, and status filters", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      // Apply search
      const searchInput = screen.getByPlaceholderText("Search downloads...");
      fireEvent.change(searchInput, { target: { value: "Action" } });

      // Apply category filter
      const categorySelect = screen.getByDisplayValue("All Categories");
      fireEvent.change(categorySelect, { target: { value: "movies" } });

      // Apply status filter
      const completedButton = screen.getByText("completed");
      fireEvent.click(completedButton);

      // Click search to apply all filters
      const searchButton = screen.getByText("Search");
      fireEvent.click(searchButton);

      expect(mockUseFileHistory.useFileHistory).toHaveBeenCalledWith({
        filters: {
          searchTerm: "Action",
          category: "movies",
          status: ["completed"],
        },
      });
    });
  });

  describe("Clear Filters", () => {
    it("should show clear filters button when filters are applied", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      // Apply a filter
      const categorySelect = screen.getByDisplayValue("All Categories");
      fireEvent.change(categorySelect, { target: { value: "movies" } });

      expect(screen.getByText("Clear Filters")).toBeInTheDocument();
    });

    it("should clear all filters when clear button is clicked", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      // Apply multiple filters
      const searchInput = screen.getByPlaceholderText("Search downloads...");
      fireEvent.change(searchInput, { target: { value: "Action" } });

      const categorySelect = screen.getByDisplayValue("All Categories");
      fireEvent.change(categorySelect, { target: { value: "movies" } });

      const completedButton = screen.getByText("completed");
      fireEvent.click(completedButton);

      // Clear filters
      const clearButton = screen.getByText("Clear Filters");
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue("");
      expect(categorySelect).toHaveValue("");
      expect(mockUseFileHistory.useFileHistory).toHaveBeenCalledWith({
        filters: {},
      });
    });
  });

  describe("Action Handlers", () => {
    it("should handle redownload action", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const redownloadButton = screen.getAllByText("Redownload")[0];
      fireEvent.click(redownloadButton);

      expect(global.alert).toHaveBeenCalledWith(
        "Redownload functionality will be implemented in a future update",
      );
    });

    it("should handle view files action", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const viewFilesButton = screen.getAllByText("View Files")[0];
      fireEvent.click(viewFilesButton);

      expect(global.alert).toHaveBeenCalledWith(
        "File browsing will be implemented in a future update",
      );
    });

    it("should handle delete action successfully", async () => {
      const mockDeleteEntry = jest.fn().mockResolvedValue(true);
      mockUseFileHistory.useFileHistory.mockReturnValue({
        ...defaultMockHookReturn,
        deleteEntry: mockDeleteEntry,
      });

      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const deleteButton = screen.getAllByText("Delete")[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockDeleteEntry).toHaveBeenCalledWith("1");
      });
    });

    it("should show alert when delete fails", async () => {
      const mockDeleteEntry = jest.fn().mockResolvedValue(false);
      mockUseFileHistory.useFileHistory.mockReturnValue({
        ...defaultMockHookReturn,
        deleteEntry: mockDeleteEntry,
      });

      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const deleteButton = screen.getAllByText("Delete")[0];
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          "Failed to remove entry from history",
        );
      });
    });
  });

  describe("Refresh Functionality", () => {
    it("should call refresh when refresh button is clicked", () => {
      const mockRefresh = jest.fn();
      mockUseFileHistory.useFileHistory.mockReturnValue({
        ...defaultMockHookReturn,
        refresh: mockRefresh,
      });

      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      const refreshButton = screen.getByText("Refresh");
      fireEvent.click(refreshButton);

      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe("Load More", () => {
    it("should show load more button when there are more items", () => {
      mockUseFileHistory.useFileHistory.mockReturnValue({
        ...defaultMockHookReturn,
        history: mockHistoryEntries.slice(0, 2), // Show only 2 of 3
        total: 3,
      });

      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      expect(screen.getByText("Load More Downloads")).toBeInTheDocument();
    });

    it("should not show load more button when all items are loaded", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      expect(screen.queryByText("Load More Downloads")).not.toBeInTheDocument();
    });
  });

  describe("Statistics Display", () => {
    it("should not render statistics section when stats are unavailable", () => {
      mockUseFileHistory.useFileStats.mockReturnValue({
        ...defaultMockStatsReturn,
        stats: undefined,
      });

      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      expect(screen.queryByText("Total Downloads")).not.toBeInTheDocument();
    });

    it("should format time correctly in statistics", () => {
      render(
        <TestWrapper>
          <FileHistoryDashboard />
        </TestWrapper>,
      );

      // 72000000ms = 20 hours
      expect(screen.getByText("20h")).toBeInTheDocument();
    });
  });
});