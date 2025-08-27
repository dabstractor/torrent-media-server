import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FileHistoryCard from "@/components/files/FileHistoryCard";
import type { DownloadHistoryEntry } from "@/lib/types/file-history";

// Mock the API functions
jest.mock("@/lib/api/files", () => ({
  formatFileSize: (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`,
  formatDate: (date: Date) => date.toLocaleDateString(),
  formatDuration: (ms: number) => `${Math.floor(ms / 60000)}m`,
  formatSpeed: (bps: number) => `${(bps / 1024 / 1024).toFixed(1)} MB/s`,
}));

describe("FileHistoryCard", () => {
  const mockEntry: DownloadHistoryEntry = {
    id: "test-id-1",
    torrentHash: "abc123",
    name: "Test Movie 2024 1080p BluRay x264",
    originalSize: 2000000000, // 2GB
    downloadedSize: 2000000000,
    downloadPath: "/downloads/movies/Test Movie 2024",
    torrentFile: "test-movie.torrent",
    magnetUrl: "magnet:?xt=urn:btih:abc123",
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

  const mockHandlers = {
    onRedownload: jest.fn(),
    onDelete: jest.fn(),
    onViewFiles: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window.confirm
    global.confirm = jest.fn();
    global.alert = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Basic Rendering", () => {
    it("should render entry name and basic information", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      expect(screen.getByText(mockEntry.name)).toBeInTheDocument();
      expect(screen.getByText("COMPLETED")).toBeInTheDocument();
      expect(screen.getByText("movies")).toBeInTheDocument();
    });

    it("should render status badge with correct styling", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const statusBadge = screen.getByText("COMPLETED").closest("span");
      expect(statusBadge).toHaveClass("text-green-600", "bg-green-100");
    });

    it("should render category and tags", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      expect(screen.getByText("movies")).toBeInTheDocument();
      expect(screen.getByText("1080p")).toBeInTheDocument();
      expect(screen.getByText("bluray")).toBeInTheDocument();
    });

    it("should display formatted file size and speed", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      // The mock returns "1907.3 MB" for 2GB
      expect(screen.getByText("1907.3 MB")).toBeInTheDocument();
      // The mock returns "0.3 MB/s" for 277777 bytes/sec
      expect(screen.getByText("0.3 MB/s")).toBeInTheDocument();
    });

    it("should display download duration and ratio", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      expect(screen.getByText("120m")).toBeInTheDocument(); // 7200000ms = 120 minutes
      expect(screen.getByText("1.80")).toBeInTheDocument();
    });
  });

  describe("Status Variants", () => {
    it("should render error status correctly", () => {
      const errorEntry = { ...mockEntry, status: "error" as const };
      render(<FileHistoryCard entry={errorEntry} {...mockHandlers} />);

      const statusBadge = screen.getByText("ERROR").closest("span");
      expect(statusBadge).toHaveClass("text-red-600", "bg-red-100");
      expect(screen.getByText("❌")).toBeInTheDocument();
    });

    it("should render deleted status correctly", () => {
      const deletedEntry = { ...mockEntry, status: "deleted" as const };
      render(<FileHistoryCard entry={deletedEntry} {...mockHandlers} />);

      const statusBadge = screen.getByText("DELETED").closest("span");
      expect(statusBadge).toHaveClass("text-orange-600", "bg-orange-100");
      expect(screen.getByText("🗑️")).toBeInTheDocument();
    });

    it("should render moved status correctly", () => {
      const movedEntry = { ...mockEntry, status: "moved" as const };
      render(<FileHistoryCard entry={movedEntry} {...mockHandlers} />);

      const statusBadge = screen.getByText("MOVED").closest("span");
      expect(statusBadge).toHaveClass("text-blue-600", "bg-blue-100");
      expect(screen.getByText("📁")).toBeInTheDocument();
    });
  });

  describe("Progress Bar", () => {
    it("should show progress bar for incomplete downloads", () => {
      const incompleteEntry = {
        ...mockEntry,
        downloadedSize: 1000000000, // 1GB of 2GB
      };
      render(<FileHistoryCard entry={incompleteEntry} {...mockHandlers} />);

      const progressBar = document.querySelector(".bg-blue-600");
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveStyle("width: 50%");
    });

    it("should not show progress bar for complete downloads", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const progressBar = document.querySelector(".bg-blue-600");
      expect(progressBar).toBeNull();
    });

    it("should handle zero size gracefully", () => {
      const zeroSizeEntry = {
        ...mockEntry,
        originalSize: 0,
        downloadedSize: 0,
      };
      render(<FileHistoryCard entry={zeroSizeEntry} {...mockHandlers} />);

      // Should not crash or show progress bar
      const progressBar = document.querySelector(".bg-blue-600");
      expect(progressBar).toBeNull();
    });
  });

  describe("Expandable Details", () => {
    it("should be collapsed by default", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      expect(screen.queryByText("Started:")).not.toBeInTheDocument();
      expect(screen.queryByText("Seeders:")).not.toBeInTheDocument();
    });

    it("should expand when clicked", async () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const expandButton = screen.getByText("▶️");
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("Started:")).toBeInTheDocument();
        expect(screen.getByText("Completed:")).toBeInTheDocument();
        expect(screen.getByText("Seeders:")).toBeInTheDocument();
        expect(screen.getByText("Leechers:")).toBeInTheDocument();
      });
    });

    it("should show path in expanded view", async () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const expandButton = screen.getByText("▶️");
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("Path:")).toBeInTheDocument();
        expect(screen.getByText(mockEntry.downloadPath)).toBeInTheDocument();
      });
    });

    it("should show metadata in expanded view", async () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const expandButton = screen.getByText("▶️");
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("Additional Info:")).toBeInTheDocument();
        expect(screen.getByText(/quality/)).toBeInTheDocument();
        expect(screen.getByText(/bluray/)).toBeInTheDocument();
      });
    });

    it("should toggle between expanded and collapsed", async () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const expandButton = screen.getByText("▶️");
      fireEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText("🔽")).toBeInTheDocument();
        expect(screen.getByText("Seeders:")).toBeInTheDocument();
      });

      const collapseButton = screen.getByText("🔽");
      fireEvent.click(collapseButton);

      await waitFor(() => {
        expect(screen.getByText("▶️")).toBeInTheDocument();
        expect(screen.queryByText("Seeders:")).not.toBeInTheDocument();
      });
    });
  });

  describe("Action Buttons", () => {
    it("should show re-download button when torrent file is available", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const redownloadButton = screen.getByText("📥 Re-download");
      expect(redownloadButton).toBeInTheDocument();
      expect(redownloadButton).not.toBeDisabled();
    });

    it("should show re-download button when magnet URL is available", () => {
      const entryWithMagnet = {
        ...mockEntry,
        torrentFile: null,
        magnetUrl: "magnet:?xt=urn:btih:abc123",
      };
      render(<FileHistoryCard entry={entryWithMagnet} {...mockHandlers} />);

      const redownloadButton = screen.getByText("📥 Re-download");
      expect(redownloadButton).toBeInTheDocument();
      expect(redownloadButton).not.toBeDisabled();
    });

    it("should not show re-download button when no torrent or magnet", () => {
      const entryWithoutSource = {
        ...mockEntry,
        torrentFile: null,
        magnetUrl: null,
      };
      render(<FileHistoryCard entry={entryWithoutSource} {...mockHandlers} />);

      expect(screen.queryByText("📥 Re-download")).not.toBeInTheDocument();
    });

    it("should show view files button for completed downloads", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const viewFilesButton = screen.getByText("📁 View Files");
      expect(viewFilesButton).toBeInTheDocument();
      expect(viewFilesButton).not.toBeDisabled();
    });

    it("should not show view files button for deleted/error status", () => {
      const deletedEntry = { ...mockEntry, status: "deleted" as const };
      render(<FileHistoryCard entry={deletedEntry} {...mockHandlers} />);

      expect(screen.queryByText("📁 View Files")).not.toBeInTheDocument();
      expect(screen.getByText("📁 Files N/A")).toBeDisabled();
    });

    it("should show delete button", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const deleteButton = screen.getByText("🗑️");
      expect(deleteButton).toBeInTheDocument();
    });
  });

  describe("Action Handlers", () => {
    it("should call onRedownload when re-download button is clicked", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const redownloadButton = screen.getByText("📥 Re-download");
      fireEvent.click(redownloadButton);

      expect(mockHandlers.onRedownload).toHaveBeenCalledWith(mockEntry);
    });

    it("should call onViewFiles when view files button is clicked", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const viewFilesButton = screen.getByText("📁 View Files");
      fireEvent.click(viewFilesButton);

      expect(mockHandlers.onViewFiles).toHaveBeenCalledWith(mockEntry);
    });

    it("should call onDelete when delete button is clicked and confirmed", () => {
      (global.confirm as jest.Mock).mockReturnValue(true);

      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const deleteButton = screen.getByText("🗑️");
      fireEvent.click(deleteButton);

      expect(global.confirm).toHaveBeenCalledWith(
        "Are you sure you want to remove this entry from history? This cannot be undone.",
      );
      expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockEntry.id);
    });

    it("should not call onDelete when delete is cancelled", () => {
      (global.confirm as jest.Mock).mockReturnValue(false);

      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const deleteButton = screen.getByText("🗑️");
      fireEvent.click(deleteButton);

      expect(global.confirm).toHaveBeenCalled();
      expect(mockHandlers.onDelete).not.toHaveBeenCalled();
    });

    it("should not call onViewFiles when handler is not provided", () => {
      render(
        <FileHistoryCard
          entry={mockEntry}
          onRedownload={mockHandlers.onRedownload}
          onDelete={mockHandlers.onDelete}
        />,
      );

      // Button should not be rendered when handler is not provided
      expect(screen.queryByText("📁 View Files")).not.toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("should have mobile-friendly button heights", () => {
      render(<FileHistoryCard entry={mockEntry} {...mockHandlers} />);

      const redownloadButton = screen.getByText("📥 Re-download");
      expect(redownloadButton).toHaveClass("min-h-[44px]");

      const deleteButton = screen.getByText("🗑️");
      expect(deleteButton).toHaveClass("min-h-[44px]");
    });

    it("should truncate long file names", () => {
      const longNameEntry = {
        ...mockEntry,
        name: "Very Long Movie Name That Should Be Truncated 2024 1080p BluRay x264-GROUP Extended Directors Cut Ultimate Edition",
      };

      render(<FileHistoryCard entry={longNameEntry} {...mockHandlers} />);

      const nameElement = screen.getByText(longNameEntry.name);
      expect(nameElement).toHaveClass("line-clamp-2");
    });
  });

  describe("Edge Cases", () => {
    it("should handle entry without metadata", () => {
      const entryWithoutMetadata = {
        ...mockEntry,
        metadata: undefined,
      };

      render(<FileHistoryCard entry={entryWithoutMetadata} {...mockHandlers} />);

      const expandButton = screen.getByText("▶️");
      fireEvent.click(expandButton);

      // Should not crash and should not show metadata section
      expect(screen.queryByText("Additional Info:")).not.toBeInTheDocument();
    });

    it("should handle empty metadata", () => {
      const entryWithEmptyMetadata = {
        ...mockEntry,
        metadata: {},
      };

      render(<FileHistoryCard entry={entryWithEmptyMetadata} {...mockHandlers} />);

      const expandButton = screen.getByText("▶️");
      fireEvent.click(expandButton);

      // Should not show metadata section for empty metadata
      expect(screen.queryByText("Additional Info:")).not.toBeInTheDocument();
    });

    it("should handle entry without tags", () => {
      const entryWithoutTags = {
        ...mockEntry,
        tags: [],
      };

      render(<FileHistoryCard entry={entryWithoutTags} {...mockHandlers} />);

      // Should only show category, no tag badges
      expect(screen.getByText("movies")).toBeInTheDocument();
      expect(screen.queryByText("1080p")).not.toBeInTheDocument();
    });

    it("should handle missing download path", () => {
      const entryWithoutPath = {
        ...mockEntry,
        downloadPath: "",
      };

      render(<FileHistoryCard entry={entryWithoutPath} {...mockHandlers} />);

      const expandButton = screen.getByText("▶️");
      fireEvent.click(expandButton);

      // Should not crash and path section should not appear
      expect(screen.queryByText("Path:")).not.toBeInTheDocument();
    });
  });
});