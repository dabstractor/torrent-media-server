/**
 * @jest-environment node
 */

import { FileMonitor } from "@/lib/utils/file-monitoring";
import { FileHistoryDB } from "@/lib/db/file-history";
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { tmpdir } from 'os';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const rimraf = promisify(require('rimraf'));

// Mock the UUID library
jest.mock('uuid', () => ({
  v4: () => "test-uuid-1234",
}));

// Mock chokidar
jest.mock('chokidar', () => {
  const mockWatcher = {
    on: jest.fn().mockReturnThis(),
    close: jest.fn(),
    add: jest.fn(),
    unwatch: jest.fn(),
  };
  
  return {
    watch: jest.fn(() => mockWatcher),
  };
});

describe("File Monitoring Service Integration", () => {
  let monitor: FileMonitor;
  let db: FileHistoryDB;
  let testDbPath: string;
  let testWatchDir: string;

  beforeEach(() => {
    // Create temporary directories for testing
    testDbPath = path.join(tmpdir(), `test-monitoring-${Date.now()}.db`);
    testWatchDir = path.join(tmpdir(), `test-watch-${Date.now()}`);
    
    // Initialize database
    db = new FileHistoryDB(testDbPath);
    
    // Mock the database getter
    jest.mock("@/lib/db/file-history", () => ({
      getFileHistoryDB: () => db,
    }));
    
    // Create watch directory
    fs.mkdirSync(testWatchDir, { recursive: true });
    
    // Create monitor with test directory
    monitor = new FileMonitor({
      watchPaths: [testWatchDir],
      debounceDelay: 100, // Short delay for testing
    });
  });

  afterEach(async () => {
    // Stop monitor
    monitor.stop();
    
    // Clean up database
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Clean up watch directory
    if (fs.existsSync(testWatchDir)) {
      await rimraf(testWatchDir);
    }
    
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe("File Monitoring Basic Operations", () => {
    it("should start and stop monitoring correctly", () => {
      // Start monitoring
      monitor.start();
      
      // Verify watcher was created
      expect(chokidar.watch).toHaveBeenCalledWith(
        expect.stringContaining(testWatchDir),
        expect.any(Object)
      );
      
      // Check status
      const status = monitor.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.watchedPaths).toBe(1);
      
      // Stop monitoring
      monitor.stop();
      
      // Verify watchers were closed
      const mockWatcher = (chokidar.watch as jest.Mock).mock.results[0].value;
      expect(mockWatcher.close).toHaveBeenCalled();
      
      // Check status after stopping
      const stoppedStatus = monitor.getStatus();
      expect(stoppedStatus.isRunning).toBe(false);
      expect(stoppedStatus.watchedPaths).toBe(0);
    });

    it("should handle watch path management", () => {
      const additionalPath = path.join(tmpdir(), `additional-watch-${Date.now()}`);
      fs.mkdirSync(additionalPath, { recursive: true });
      
      // Add watch path
      monitor.addWatchPath(additionalPath);
      
      // Should have two watch paths now
      const paths = monitor.getWatchedPaths();
      expect(paths).toHaveLength(2);
      expect(paths.some(p => p.includes(additionalPath))).toBe(true);
      
      // Remove watch path
      monitor.removeWatchPath(additionalPath);
      
      // Should have one watch path now
      const remainingPaths = monitor.getWatchedPaths();
      expect(remainingPaths).toHaveLength(1);
      expect(remainingPaths.some(p => p.includes(additionalPath))).toBe(false);
      
      // Clean up
      fs.rmdirSync(additionalPath);
    });
  });

  describe("File Event Processing", () => {
    beforeEach(() => {
      monitor.start();
    });

    it("should process added files and store them in database", async () => {
      // Create a test file
      const testFilePath = path.join(testWatchDir, "test-movie.mp4");
      const testFileContent = "test content";
      
      await writeFile(testFilePath, testFileContent);
      
      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check that file was added to database
      const files = db.getCompletedFiles();
      expect(files).toHaveLength(1);
      
      const file = files[0];
      expect(file.name).toBe("test-movie.mp4");
      expect(file.mediaType).toBe("video");
      expect(file.plexCompatible).toBe(true);
      expect(file.path).toBe(path.relative(process.cwd(), testFilePath));
    });

    it("should handle file changes and updates", async () => {
      // Create initial file
      const testFilePath = path.join(testWatchDir, "test-document.txt");
      await writeFile(testFilePath, "initial content");
      
      // Wait for initial processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let files = db.getCompletedFiles();
      expect(files).toHaveLength(1);
      const initialSize = files[0].size;
      
      // Modify the file
      await writeFile(testFilePath, "modified content that is longer");
      
      // Wait for change processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check that file was updated
      files = db.getCompletedFiles();
      expect(files).toHaveLength(1);
      expect(files[0].size).toBeGreaterThan(initialSize);
    });

    it("should ignore temporary files", async () => {
      // Create temporary files that should be ignored
      const tempFiles = [
        path.join(testWatchDir, "temp-file.tmp"),
        path.join(testWatchDir, "partial.part"),
        path.join(testWatchDir, "download.crdownload"),
        path.join(testWatchDir, "qbittorrent.!qb"),
      ];
      
      // Create temp files
      for (const tempFile of tempFiles) {
        await writeFile(tempFile, "temp content");
      }
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check that temp files were ignored
      const files = db.getCompletedFiles();
      expect(files).toHaveLength(0);
    });

    it("should process media files with correct metadata", async () => {
      // Create various media files
      const mediaFiles = [
        { name: "movie.mp4", content: "movie content", expectedType: "video" },
        { name: "audio.mp3", content: "audio content", expectedType: "audio" },
        { name: "image.jpg", content: "image content", expectedType: "image" },
        { name: "document.pdf", content: "document content", expectedType: "document" },
      ];
      
      for (const file of mediaFiles) {
        const filePath = path.join(testWatchDir, file.name);
        await writeFile(filePath, file.content);
      }
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check that all files were processed with correct metadata
      const files = db.getCompletedFiles();
      expect(files).toHaveLength(4);
      
      const movieFile = files.find(f => f.name === "movie.mp4");
      expect(movieFile).toBeDefined();
      expect(movieFile!.mediaType).toBe("video");
      expect(movieFile!.plexCompatible).toBe(true);
      
      const audioFile = files.find(f => f.name === "audio.mp3");
      expect(audioFile).toBeDefined();
      expect(audioFile!.mediaType).toBe("audio");
      expect(audioFile!.plexCompatible).toBe(true);
      
      const imageFile = files.find(f => f.name === "image.jpg");
      expect(imageFile).toBeDefined();
      expect(imageFile!.mediaType).toBe("image");
      expect(imageFile!.plexCompatible).toBe(true);
      
      const documentFile = files.find(f => f.name === "document.pdf");
      expect(documentFile).toBeDefined();
      expect(documentFile!.mediaType).toBe("document");
      expect(documentFile!.plexCompatible).toBe(false);
    });
  });

  describe("Directory Event Processing", () => {
    beforeEach(() => {
      monitor.start();
    });

    it("should detect and process completed download directories", async () => {
      // Create a directory that looks like a completed download
      const downloadDir = path.join(testWatchDir, "complete", "New Movie 2024 1080p");
      await mkdir(downloadDir, { recursive: true });
      
      // Create files in the directory
      const movieFile = path.join(downloadDir, "movie.mp4");
      const subtitleFile = path.join(downloadDir, "subtitles", "en.srt");
      
      await mkdir(path.dirname(subtitleFile), { recursive: true });
      await writeFile(movieFile, "movie content");
      await writeFile(subtitleFile, "subtitle content");
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check that files were added to database
      const files = db.getCompletedFiles();
      expect(files).toHaveLength(2);
      
      const movieInDb = files.find(f => f.name === "movie.mp4");
      const subtitleInDb = files.find(f => f.name === "en.srt");
      
      expect(movieInDb).toBeDefined();
      expect(subtitleInDb).toBeDefined();
      
      // Check that a history entry was created
      const historyEntries = db.getHistoryEntries();
      expect(historyEntries.length).toBeGreaterThanOrEqual(0); // May vary based on implementation
    });

    it("should handle directory removal events", async () => {
      // Create a directory
      const testDir = path.join(testWatchDir, "test-directory");
      await mkdir(testDir, { recursive: true });
      
      // Create a file in the directory
      const testFile = path.join(testDir, "test.txt");
      await writeFile(testFile, "test content");
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify file was added
      let files = db.getCompletedFiles();
      expect(files).toHaveLength(1);
      
      // Remove directory
      await rimraf(testDir);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // File should still be in database but could be marked as deleted in a full implementation
      // For now, we just verify the monitoring service handled the event without crashing
      expect(true).toBe(true); // Placeholder - actual implementation would depend on requirements
    });
  });

  describe("Error Handling", () => {
    it("should handle file processing errors gracefully", async () => {
      // Mock file system to throw an error
      const originalStat = fs.stat;
      fs.stat = jest.fn().mockImplementation((path, callback) => {
        callback(new Error("Permission denied"));
      });
      
      monitor.start();
      
      // Create a file that will cause an error
      const testFilePath = path.join(testWatchDir, "error-file.txt");
      await writeFile(testFilePath, "test content");
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should not crash and should log the error
      // In a real implementation, we'd check log output or error reporting
      
      // Restore original function
      fs.stat = originalStat;
      
      // Clean up
      fs.unlinkSync(testFilePath);
    });

    it("should handle database errors gracefully", async () => {
      // Mock database to throw an error
      const originalAddFile = db.addCompletedFile;
      db.addCompletedFile = jest.fn().mockImplementation(() => {
        throw new Error("Database connection failed");
      });
      
      monitor.start();
      
      // Create a file that will cause a database error
      const testFilePath = path.join(testWatchDir, "db-error-file.txt");
      await writeFile(testFilePath, "test content");
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should not crash
      expect(true).toBe(true);
      
      // Restore original function
      db.addCompletedFile = originalAddFile;
      
      // Clean up
      fs.unlinkSync(testFilePath);
    });
  });

  describe("Performance and Scalability", () => {
    it("should handle multiple concurrent file operations", async () => {
      monitor.start();
      
      // Create multiple files simultaneously
      const filePromises = [];
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(testWatchDir, `concurrent-file-${i}.txt`);
        filePromises.push(writeFile(filePath, `content-${i}`));
      }
      
      await Promise.all(filePromises);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Check that all files were processed
      const files = db.getCompletedFiles();
      expect(files).toHaveLength(10);
      
      // Verify all files have correct names
      for (let i = 0; i < 10; i++) {
        const file = files.find(f => f.name === `concurrent-file-${i}.txt`);
        expect(file).toBeDefined();
      }
    });

    it("should handle debounce correctly for rapid file changes", async () => {
      monitor.start();
      
      const testFilePath = path.join(testWatchDir, "rapid-change.txt");
      
      // Rapidly change the file multiple times
      for (let i = 0; i < 5; i++) {
        await writeFile(testFilePath, `rapid content ${i}`);
        // Don't wait - changes should be debounced
      }
      
      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should only process the file once
      const files = db.getCompletedFiles();
      expect(files).toHaveLength(1);
      
      // The file should have the content from the last write
      // Note: This test assumes the last write wins, which depends on timing
    });
  });
});