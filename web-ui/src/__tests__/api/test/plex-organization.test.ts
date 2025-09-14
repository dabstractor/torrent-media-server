import { GET, POST } from '@/app/api/test/plex-organization/route';
import { promises as fs } from 'fs';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/managers/PlexIntegrationManager', () => ({
  plexIntegrationManager: {
    initialize: jest.fn(),
    onDownloadComplete: jest.fn(),
  },
}));

jest.mock('@/lib/services/SettingsService', () => ({
  settingsService: {
    getSettings: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

// Import the mocked services after mocking
const { plexIntegrationManager } = require('@/lib/managers/PlexIntegrationManager');
const { settingsService } = require('@/lib/services/SettingsService');

describe('/api/test/plex-organization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock environment variable for production mode
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  describe('GET endpoint', () => {
    test('should list available media files successfully', async () => {
      mockFs.readdir.mockResolvedValue([
        'video1.mkv',
        'video2.mp4',
        'video3.avi',
        'document.txt', // Should be filtered out
        'image.jpg',    // Should be filtered out
      ] as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.availableFiles).toEqual(['video1.mkv', 'video2.mp4', 'video3.avi']);
      expect(data.data.usage).toBe('POST /api/test/plex-organization?file=filename.mkv');
    });

    test('should use production path in production environment', async () => {
      process.env.NODE_ENV = 'production';
      mockFs.readdir.mockResolvedValue(['test.mkv'] as any);

      await GET();

      expect(mockFs.readdir).toHaveBeenCalledWith('/downloads');
    });

    test('should use development path in development environment', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DOWNLOADS_ROOT = '/custom/downloads';
      mockFs.readdir.mockResolvedValue(['test.mkv'] as any);

      await GET();

      expect(mockFs.readdir).toHaveBeenCalledWith('/custom/downloads');
    });

    test('should handle directory read errors', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to list files');
    });
  });

  describe('POST endpoint', () => {
    const mockRequest = (filename: string) => {
      return {
        url: `http://localhost:3000/api/test/plex-organization?file=${encodeURIComponent(filename)}`,
      } as NextRequest;
    };

    const mockStats = {
      size: 1000000,
      mtime: new Date(),
    };

    test('should process existing file successfully', async () => {
      const filename = 'test.s01e01.mkv';
      mockFs.stat.mockResolvedValue(mockStats as any);
      settingsService.getSettings.mockResolvedValue({
        plex: {
          enabled: true,
          organizationEnabled: true,
          mediaPath: '/media',
          movieLibrary: 'Movies',
          tvLibrary: 'tv',
        },
      } as any);
      plexIntegrationManager.initialize.mockResolvedValue();
      plexIntegrationManager.onDownloadComplete.mockResolvedValue(true);

      const response = await POST(mockRequest(filename));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.organizationSuccess).toBe(true);
      expect(data.data.file).toBe(filename);
      expect(data.data.fileInfo).toMatchObject({
        size: '1MB',
        mediaType: 'video',
        plexCompatible: true,
      });
    });

    test('should handle missing file parameter', async () => {
      const request = {
        url: 'http://localhost:3000/api/test/plex-organization',
      } as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('File parameter required');
    });

    test('should handle file not found', async () => {
      const filename = 'nonexistent.mkv';
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });

      const response = await POST(mockRequest(filename));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('File not found');
    });

    test('should use production path in production environment', async () => {
      process.env.NODE_ENV = 'production';
      const filename = 'test.mkv';
      mockFs.stat.mockResolvedValue(mockStats as any);
      settingsService.getSettings.mockResolvedValue({
        plex: { enabled: true, organizationEnabled: true, mediaPath: '/media' },
      } as any);
      plexIntegrationManager.initialize.mockResolvedValue();
      plexIntegrationManager.onDownloadComplete.mockResolvedValue(true);

      await POST(mockRequest(filename));

      expect(mockFs.stat).toHaveBeenCalledWith('/downloads/test.mkv');
    });

    test('should use development path in development environment', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DOWNLOADS_ROOT = './data/downloads';
      const filename = 'test.mkv';
      mockFs.stat.mockResolvedValue(mockStats as any);
      settingsService.getSettings.mockResolvedValue({
        plex: { enabled: true, organizationEnabled: true, mediaPath: '/media' },
      } as any);
      plexIntegrationManager.initialize.mockResolvedValue();
      plexIntegrationManager.onDownloadComplete.mockResolvedValue(true);

      await POST(mockRequest(filename));

      expect(mockFs.stat).toHaveBeenCalledWith('./data/downloads/test.mkv');
    });

    test('should handle plex integration manager errors', async () => {
      const filename = 'test.mkv';
      mockFs.stat.mockResolvedValue(mockStats as any);
      settingsService.getSettings.mockResolvedValue({
        plex: { enabled: true, organizationEnabled: true, mediaPath: '/media' },
      } as any);
      plexIntegrationManager.initialize.mockResolvedValue();
      plexIntegrationManager.onDownloadComplete.mockRejectedValue(new Error('Plex error'));

      const response = await POST(mockRequest(filename));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Test failed');
    });

    test('should handle settings service errors', async () => {
      const filename = 'test.mkv';
      mockFs.stat.mockResolvedValue(mockStats as any);
      settingsService.getSettings.mockRejectedValue(new Error('Settings error'));

      const response = await POST(mockRequest(filename));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Test failed');
    });

    test('should create correct CompletedFile object', async () => {
      const filename = 'breaking.bad.s01e05.1080p.mkv';
      mockFs.stat.mockResolvedValue(mockStats as any);
      settingsService.getSettings.mockResolvedValue({
        plex: { enabled: true, organizationEnabled: true, mediaPath: '/media' },
      } as any);
      plexIntegrationManager.initialize.mockResolvedValue();
      plexIntegrationManager.onDownloadComplete.mockImplementation(async (download, files) => {
        // Verify the CompletedFile structure
        expect(files).toHaveLength(1);
        expect(files[0]).toMatchObject({
          name: filename,
          size: mockStats.size,
          modifiedDate: mockStats.mtime,
          mediaType: 'video',
          plexCompatible: true,
          quality: '1080p',
        });
        return true;
      });

      await POST(mockRequest(filename));

      expect(plexIntegrationManager.onDownloadComplete).toHaveBeenCalled();
    });

    test('should create correct Download object', async () => {
      const filename = 'test.mkv';
      mockFs.stat.mockResolvedValue(mockStats as any);
      settingsService.getSettings.mockResolvedValue({
        plex: { enabled: true, organizationEnabled: true, mediaPath: '/media' },
      } as any);
      plexIntegrationManager.initialize.mockResolvedValue();
      plexIntegrationManager.onDownloadComplete.mockImplementation(async (download, files) => {
        // Verify the Download structure
        expect(download).toMatchObject({
          name: 'test', // Extension removed
          state: 'completed',
          progress: 1.0,
          size: mockStats.size,
          downloadSpeed: 0,
          uploadSpeed: 0,
          eta: 0,
          priority: 1,
          category: 'test',
        });
        expect(download.hash).toMatch(/^test-\d+$/);
        expect(download.addedTime).toBeLessThanOrEqual(Date.now());
        expect(download.completedTime).toBeLessThanOrEqual(Date.now());
        return true;
      });

      await POST(mockRequest(filename));

      expect(plexIntegrationManager.onDownloadComplete).toHaveBeenCalled();
    });
  });
});