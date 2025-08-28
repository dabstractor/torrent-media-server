import { renderHook, act, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { useSettings } from "@/hooks/use-settings";
import { useQBittorrentSync } from "@/hooks/use-qbittorrent-sync";
import * as settingsApi from "@/lib/api/settings";
import * as qbittorrentApi from "@/lib/api/clients/QBittorrentClient";
import { DEFAULT_SETTINGS } from "@/lib/types/settings";
import type { 
  AppSettings, 
  SettingsUpdateRequest, 
  SettingsUpdateResult, 
  ValidationResult,
  SyncResult,
  SettingsConflict
} from "@/lib/types/settings";

// Mock the API modules
jest.mock("@/lib/api/settings");
jest.mock("@/lib/api/clients/QBittorrentClient");

const mockSettingsApi = settingsApi as jest.Mocked<typeof settingsApi>;
const mockQBittorrentApi = qbittorrentApi as jest.Mocked<typeof qbittorrentApi>;

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

describe("useSettings", () => {
  const mockSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
    theme: "dark",
    maxConcurrentDownloads: 5,
    notifications: {
      ...DEFAULT_SETTINGS.notifications,
      enabled: true,
      downloadComplete: true,
    }
  };

  const mockUpdateResult: SettingsUpdateResult = {
    success: true,
    updatedSettings: mockSettings,
    validation: { isValid: true, errors: [] },
    backupId: "backup-123",
    errors: [],
  };

  const mockValidationResult: ValidationResult = {
    isValid: true,
    errors: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Basic Functionality", () => {
    it("should fetch settings on mount", async () => {
      mockSettingsApi.getSettings.mockResolvedValue({
        success: true,
        data: mockSettings,
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toEqual(mockSettings);
      expect(result.current.error).toBeNull();
    });

    it("should handle API errors when fetching settings", async () => {
      const errorMessage = "Failed to fetch settings";
      mockSettingsApi.getSettings.mockResolvedValue({
        success: false,
        error: errorMessage,
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });

    it("should handle network errors when fetching settings", async () => {
      mockSettingsApi.getSettings.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.settings).toBeNull();
      expect(result.current.error).toBe("Network error");
    });
  });

  describe("Settings Updates", () => {
    it("should update settings successfully", async () => {
      mockSettingsApi.getSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_SETTINGS,
      });
      
      mockSettingsApi.updateSettings.mockResolvedValue({
        success: true,
        data: mockUpdateResult,
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updates = { theme: "light" as const };
      let updateResult: SettingsUpdateResult | undefined;

      await act(async () => {
        updateResult = await result.current.updateSettings(updates);
      });

      expect(updateResult).toEqual(mockUpdateResult);
      expect(mockSettingsApi.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
        settings: updates,
      }));
    });

    it("should handle validation errors during updates", async () => {
      mockSettingsApi.getSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_SETTINGS,
      });
      
      const validationError = "Invalid theme value";
      mockSettingsApi.updateSettings.mockResolvedValue({
        success: false,
        error: validationError,
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updates = { theme: "invalid" as any };
      let updateResult: SettingsUpdateResult | undefined;

      await act(async () => {
        updateResult = await result.current.updateSettings(updates);
      });

      expect(updateResult?.success).toBe(false);
      expect(result.current.error).toBe(validationError);
    });
  });

  describe("Settings Validation", () => {
    it("should validate settings", async () => {
      mockSettingsApi.getSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_SETTINGS,
      });
      
      mockSettingsApi.validateSettings.mockResolvedValue({
        success: true,
        data: mockValidationResult,
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let validationResult: ValidationResult | undefined;

      await act(async () => {
        validationResult = await result.current.validateSettings(mockSettings);
      });

      expect(validationResult).toEqual(mockValidationResult);
      expect(mockSettingsApi.validateSettings).toHaveBeenCalledWith(mockSettings);
    });
  });

  describe("Cache and Mutate", () => {
    it("should mutate settings cache", async () => {
      // DESIGN NOTE: This test verifies that the hook's mutate function works correctly.
      // The mutate function should update the settings state immediately when called with shouldRevalidate=false.
      // 
      // BACKGROUND: There was a design inconsistency in the hook where background revalidation could override
      // mutated state. This was addressed by modifying the initialize function to respect refreshInterval settings.
      // The hook now respects refreshInterval=0 and revalidateOnFocus=false to prevent unwanted revalidation.
      //
      // SWR PATTERN: The hook follows SWR patterns where mutate(data, false) guarantees no revalidation occurs
      // when refreshInterval=0 and revalidateOnFocus=false are set.
      //
      // CURRENT STATUS: This test is currently failing. The mutate function is not preserving the mutated state
      // as expected. This may indicate that there's still some revalidation happening or an issue with how
      // the hook handles state updates. Further investigation is needed to resolve this issue.

      const initialSettings: AppSettings = {
        ...DEFAULT_SETTINGS,
        theme: "dark",
        maxConcurrentDownloads: 5,
      };
      
      const mutatedSettings: AppSettings = {
        ...initialSettings,
        theme: "light",
      };

      // Mock API to return initial settings
      mockSettingsApi.getSettings.mockResolvedValue({
        success: true,
        data: initialSettings,
      });

      const { result } = renderHook(() => useSettings({ 
        refreshInterval: 0, 
        revalidateOnFocus: false 
      }), {
        wrapper: TestWrapper,
      });

      // Wait for initial load to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify initial settings are loaded
      expect(result.current.settings).toEqual(initialSettings);

      // Test mutate function - should update settings immediately without revalidation
      // When refreshInterval=0 and revalidateOnFocus=false, mutate(data, false) should work like SWR
      await act(async () => {
        await result.current.mutate(mutatedSettings, false);
      });

      // The settings should be updated to the mutated value and preserved
      // This demonstrates that the hook respects the refreshInterval=0 setting to prevent background revalidation
      expect(result.current.settings).toEqual(mutatedSettings);
    });

    it("should refresh settings from API", async () => {
      mockSettingsApi.getSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_SETTINGS,
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedSettings = { ...mockSettings, theme: "light" as const };
      mockSettingsApi.getSettings.mockResolvedValue({
        success: true,
        data: updatedSettings,
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.settings).toEqual(updatedSettings);
    });
  });

  describe("Options and Configuration", () => {
    it("should respect refresh interval option", async () => {
      jest.useFakeTimers();
      
      mockSettingsApi.getSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_SETTINGS,
      });

      const refreshInterval = 1000; // 1 second
      const { result, unmount } = renderHook(() => useSettings({ refreshInterval }), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mock calls from initial fetch and background revalidation
      mockSettingsApi.getSettings.mockClear();

      // Advance timers to trigger refresh
      act(() => {
        jest.advanceTimersByTime(refreshInterval);
      });

      // The hook should have made another API call
      expect(mockSettingsApi.getSettings).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
      unmount();
    });

    it("should handle category filtering", async () => {
      mockSettingsApi.getSettings.mockResolvedValue({
        success: true,
        data: DEFAULT_SETTINGS,
      });

      const { result } = renderHook(() => useSettings({ category: "general" }), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have called API with category parameter
      expect(mockSettingsApi.getSettings).toHaveBeenCalledWith({ category: "general" });
    });
  });
});

describe("useQBittorrentSync", () => {
  const mockSyncStatus = {
    enabled: true,
    connected: true,
    authenticated: true,
    lastSync: new Date(),
    autoSyncActive: true,
  };

  const mockSyncHistory = [
    {
      id: 1,
      operation: "sync_to_qb",
      settingsChanged: ["maxDownloadRate"],
      success: true,
      executionTime: 150,
      createdAt: new Date(),
    }
  ];

  const mockConflicts: SettingsConflict[] = [
    {
      field: "maxDownloadRate",
      appValue: 1000,
      qbValue: 2000,
      resolution: "manual",
      timestamp: new Date(),
    }
  ];

  const mockSyncResult: SyncResult = {
    success: true,
    conflicts: [],
    syncedFields: ["maxDownloadRate"],
    errors: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Status and History", () => {
    it("should fetch sync status and history", async () => {
      mockSettingsApi.getSyncStatus.mockResolvedValue({
        success: true,
        data: mockSyncStatus,
      });
      
      mockSettingsApi.getSyncHistory.mockResolvedValue({
        success: true,
        data: mockSyncHistory,
      });

      const { result } = renderHook(() => useQBittorrentSync({ includeHistory: true }), {
        wrapper: TestWrapper,
      });

      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toEqual(mockSyncStatus);
      expect(result.current.history).toEqual(mockSyncHistory);
      expect(result.current.error).toBeNull();
    });

    it("should handle API errors when fetching sync status", async () => {
      const errorMessage = "Failed to fetch sync status";
      mockSettingsApi.getSyncStatus.mockResolvedValue({
        success: false,
        error: errorMessage,
      });

      const { result } = renderHook(() => useQBittorrentSync(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe("Sync Operations", () => {
    it("should sync to qBittorrent", async () => {
      mockSettingsApi.getSyncStatus.mockResolvedValue({
        success: true,
        data: mockSyncStatus,
      });
      
      mockSettingsApi.syncToQBittorrent.mockResolvedValue({
        success: true,
        data: mockSyncResult,
      });

      const { result } = renderHook(() => useQBittorrentSync(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let syncResult: SyncResult | undefined;

      await act(async () => {
        syncResult = await result.current.syncToQBittorrent();
      });

      expect(syncResult).toEqual(mockSyncResult);
      expect(mockSettingsApi.syncToQBittorrent).toHaveBeenCalled();
    });

    it("should sync from qBittorrent", async () => {
      mockSettingsApi.getSyncStatus.mockResolvedValue({
        success: true,
        data: mockSyncStatus,
      });
      
      mockSettingsApi.syncFromQBittorrent.mockResolvedValue({
        success: true,
        data: mockSyncResult,
      });

      const { result } = renderHook(() => useQBittorrentSync(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let syncResult: SyncResult | undefined;

      await act(async () => {
        syncResult = await result.current.syncFromQBittorrent();
      });

      expect(syncResult).toEqual(mockSyncResult);
      expect(mockSettingsApi.syncFromQBittorrent).toHaveBeenCalled();
    });

    it("should perform bidirectional sync", async () => {
      mockSettingsApi.getSyncStatus.mockResolvedValue({
        success: true,
        data: mockSyncStatus,
      });
      
      mockSettingsApi.syncBidirectional.mockResolvedValue({
        success: true,
        data: mockSyncResult,
      });

      const { result } = renderHook(() => useQBittorrentSync(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let syncResult: SyncResult | undefined;

      await act(async () => {
        syncResult = await result.current.syncBidirectional();
      });

      expect(syncResult).toEqual(mockSyncResult);
      expect(mockSettingsApi.syncBidirectional).toHaveBeenCalled();
    });
  });

  describe("Connection Testing", () => {
    it("should test qBittorrent connection", async () => {
      mockSettingsApi.getSyncStatus.mockResolvedValue({
        success: true,
        data: mockSyncStatus,
      });
      
      const connectionResult = { connected: true, version: "4.5.0" };
      mockSettingsApi.testQBittorrentConnection.mockResolvedValue({
        success: true,
        data: connectionResult,
      });

      const { result } = renderHook(() => useQBittorrentSync(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let testResult: { connected: boolean; error?: string; version?: string } | undefined;

      await act(async () => {
        testResult = await result.current.testConnection();
      });

      expect(testResult).toEqual(connectionResult);
      expect(mockSettingsApi.testQBittorrentConnection).toHaveBeenCalled();
    });
  });

  describe("Auto-sync Control", () => {
    it("should start auto-sync", async () => {
      mockSettingsApi.getSyncStatus.mockResolvedValue({
        success: true,
        data: { ...mockSyncStatus, autoSyncActive: false },
      });
      
      mockSettingsApi.startAutoSync.mockResolvedValue({
        success: true,
        data: { success: true },
      });

      const { result } = renderHook(() => useQBittorrentSync(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.startAutoSync();
      });

      expect(mockSettingsApi.startAutoSync).toHaveBeenCalled();
    });

    it("should stop auto-sync", async () => {
      mockSettingsApi.getSyncStatus.mockResolvedValue({
        success: true,
        data: { ...mockSyncStatus, autoSyncActive: true },
      });
      
      mockSettingsApi.stopAutoSync.mockResolvedValue({
        success: true,
        data: { success: true },
      });

      const { result } = renderHook(() => useQBittorrentSync(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.stopAutoSync();
      });

      expect(mockSettingsApi.stopAutoSync).toHaveBeenCalled();
    });
  });

  describe("Options and Configuration", () => {
    it("should respect history limit option", async () => {
      const historyLimit = 5;
      mockSettingsApi.getSyncStatus.mockResolvedValue({
        success: true,
        data: mockSyncStatus,
      });
      
      mockSettingsApi.getSyncHistory.mockResolvedValue({
        success: true,
        data: mockSyncHistory,
      });

      const { result } = renderHook(() => useQBittorrentSync({ historyLimit, includeHistory: true }), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have called API with limit parameter
      expect(mockSettingsApi.getSyncHistory).toHaveBeenCalledWith({ limit: historyLimit });
    });

    it("should respect auto-refresh option", async () => {
      jest.useFakeTimers();
      
      mockSettingsApi.getSyncStatus.mockResolvedValue({
        success: true,
        data: mockSyncStatus,
      });
      
      mockSettingsApi.getSyncHistory.mockResolvedValue({
        success: true,
        data: mockSyncHistory,
      });

      const refreshInterval = 2000; // 2 seconds
      const { result, unmount } = renderHook(() => useQBittorrentSync({ 
        refreshInterval,
        autoRefresh: true 
      }), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Advance timers to trigger refresh
      act(() => {
        jest.advanceTimersByTime(refreshInterval);
      });

      // The hook should have made another API call
      expect(mockSettingsApi.getSyncStatus).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
      unmount();
    });
  });
});