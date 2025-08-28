import { SettingsDatabase } from "@/lib/db/settings";
import { DEFAULT_SETTINGS } from "@/lib/types/settings";
import fs from "fs";
import path from "path";
import crypto from "crypto";

describe("SettingsDatabase", () => {
  let db: SettingsDatabase;
  let testDbPath: string;

  beforeEach(() => {
    // Create a temporary database for each test
    testDbPath = path.join(__dirname, `test-settings-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`);
    db = new SettingsDatabase(testDbPath);
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

  describe("Database Initialization", () => {
    it("should create database file and tables", () => {
      expect(fs.existsSync(testDbPath)).toBe(true);
      
      // Check that all required tables exist
      const tables = db['db'].prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name IN (
          'schema_version', 'settings', 'settings_backups', 'settings_sync_log', 'settings_conflicts'
        )
      `).all();
      
      expect(tables).toHaveLength(5);
    });

    it("should set schema version", () => {
      const stmt = db['db'].prepare("SELECT version FROM schema_version");
      const result = stmt.get() as { version: number };
      expect(result.version).toBe(1);
    });

    it("should initialize with default settings", () => {
      const settings = db.getAllSettings();
      expect(Object.keys(settings)).toHaveLength(Object.keys(DEFAULT_SETTINGS).length);
      
      // Check a few key settings
      expect(settings.theme).toBe(DEFAULT_SETTINGS.theme);
      expect(settings.notifications.enabled).toBe(DEFAULT_SETTINGS.notifications.enabled);
    });
  });

  describe("Settings CRUD Operations", () => {
    it("should save and retrieve individual settings", () => {
      // Save a setting
      db.setSetting("testKey", "testValue");
      
      // Retrieve the setting
      const value = db.getSetting<string>("testKey");
      expect(value).toBe("testValue");
    });

    it("should handle different data types", () => {
      // Test string
      db.setSetting("stringKey", "hello");
      expect(db.getSetting<string>("stringKey")).toBe("hello");
      
      // Test number
      db.setSetting("numberKey", 42);
      expect(db.getSetting<number>("numberKey")).toBe(42);
      
      // Test boolean
      db.setSetting("boolKey", true);
      expect(db.getSetting<boolean>("boolKey")).toBe(true);
      
      // Test object
      const testObj = { name: "test", value: 123 };
      db.setSetting("objKey", testObj);
      expect(db.getSetting<object>("objKey")).toEqual(testObj);
    });

    it("should save and retrieve all settings", () => {
      const testSettings = {
        theme: "dark",
        maxConcurrentDownloads: 10,
        autoStartTorrents: true,
        notifications: {
          enabled: false,
          downloadComplete: true,
          errorAlerts: false,
          soundEnabled: true,
        }
      };
      
      db.saveSettings(testSettings);
      const retrievedSettings = db.getAllSettings();
      
      expect(retrievedSettings.theme).toBe("dark");
      expect(retrievedSettings.maxConcurrentDownloads).toBe(10);
      expect(retrievedSettings.autoStartTorrents).toBe(true);
      expect(retrievedSettings.notifications).toEqual({
        enabled: false,
        downloadComplete: true,
        errorAlerts: false,
        soundEnabled: true,
      });
    });

    it("should update existing settings", () => {
      // Initial save
      db.saveSettings({ theme: "light" });
      expect(db.getSetting<string>("theme")).toBe("light");
      
      // Update
      db.saveSettings({ theme: "dark" });
      expect(db.getSetting<string>("theme")).toBe("dark");
    });
  });

  describe("Backup Operations", () => {
    it("should create and retrieve backups", () => {
      // Create a backup
      const backupName = "Test Backup";
      const backupDescription = "A test backup";
      const backupId = db.createBackup(backupName, backupDescription);
      
      expect(backupId).toBeDefined();
      expect(typeof backupId).toBe("string");
      
      // Retrieve the backup
      const backup = db.getBackup(backupId);
      expect(backup).not.toBeNull();
      expect(backup!.id).toBe(backupId);
      expect(backup!.name).toBe(backupName);
      expect(backup!.description).toBe(backupDescription);
      expect(backup!.settings).toEqual(db.getAllSettings());
      expect(backup!.version).toBe("1");
      expect(backup!.createdAt).toBeInstanceOf(Date);
    });

    it("should list backups", () => {
      // Create multiple backups
      db.createBackup("Backup 1", "First backup");
      db.createBackup("Backup 2", "Second backup");
      
      const backups = db.listBackups();
      expect(backups).toHaveLength(2);
      
      // Check that backups are ordered by creation time (descending)
      expect(backups[0].name).toBe("Backup 2");
      expect(backups[1].name).toBe("Backup 1");
      
      // Check backup metadata
      backups.forEach(backup => {
        expect(backup.id).toBeDefined();
        expect(backup.name).toBeDefined();
        expect(backup.createdAt).toBeInstanceOf(Date);
        expect(backup.version).toBe("1");
        expect(backup.size).toBeGreaterThan(0);
      });
    });

    it("should delete backups", () => {
      const backupId = db.createBackup("Test Backup");
      expect(db.getBackup(backupId)).not.toBeNull();
      
      const result = db.deleteBackup(backupId);
      expect(result).toBe(true);
      expect(db.getBackup(backupId)).toBeNull();
      
      // Trying to delete non-existent backup should return false
      const result2 = db.deleteBackup("non-existent-id");
      expect(result2).toBe(false);
    });

    it("should restore backups with integrity checking", () => {
      // Modify settings
      db.saveSettings({ theme: "dark", maxConcurrentDownloads: 5 });
      const originalSettings = db.getAllSettings();
      
      // Create backup
      const backupId = db.createBackup("Restore Test");
      
      // Modify settings again
      db.saveSettings({ theme: "light", maxConcurrentDownloads: 10 });
      
      // Restore from backup
      const restoreResult = db.restoreBackup(backupId);
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.errors).toHaveLength(0);
      
      // Check that settings were restored
      const restoredSettings = db.getAllSettings();
      expect(restoredSettings.theme).toBe(originalSettings.theme);
      expect(restoredSettings.maxConcurrentDownloads).toBe(originalSettings.maxConcurrentDownloads);
    });

    it("should detect backup integrity failures", () => {
      const backupId = db.createBackup("Integrity Test");
      
      // Manually corrupt the backup in the database
      const stmt = db['db'].prepare(`
        UPDATE settings_backups 
        SET settings_json = ?, checksum = ?
        WHERE id = ?
      `);
      stmt.run('{"corrupted": true}', 'invalid-checksum', backupId);
      
      const restoreResult = db.restoreBackup(backupId);
      expect(restoreResult.success).toBe(false);
      expect(restoreResult.errors).toContain("Backup integrity check failed");
    });
  });

  describe("Sync Operations", () => {
    it("should log sync operations", () => {
      const operation = "sync_to_qb";
      const settingsChanged = ["maxDownloadRate", "maxUploadRate"];
      const success = true;
      const executionTime = 150;
      
      db.logSync(operation, settingsChanged, success, undefined, executionTime);
      
      const history = db.getSyncHistory();
      expect(history).toHaveLength(1);
      expect(history[0].operation).toBe(operation);
      expect(history[0].settingsChanged).toEqual(settingsChanged);
      expect(history[0].success).toBe(success);
      expect(history[0].executionTime).toBe(executionTime);
      expect(history[0].createdAt).toBeInstanceOf(Date);
    });

    it("should retrieve sync history", () => {
      // Log multiple operations
      db.logSync("sync_to_qb", ["setting1"], true);
      db.logSync("sync_from_qb", ["setting2"], false, "Connection failed");
      db.logSync("conflict_resolved", ["setting3"], true);
      
      const history = db.getSyncHistory();
      expect(history).toHaveLength(3);
      
      // Check default limit
      const limitedHistory = db.getSyncHistory(2);
      expect(limitedHistory).toHaveLength(2);
      
      // Check ordering (newest first)
      expect(history[0].operation).toBe("conflict_resolved");
      expect(history[1].operation).toBe("sync_from_qb");
      expect(history[2].operation).toBe("sync_to_qb");
    });
  });

  describe("Conflict Management", () => {
    it("should add and retrieve conflicts", () => {
      const field = "maxDownloadRate";
      const appValue = 1000;
      const qbValue = 2000;
      const resolution = "manual";
      
      db.addConflict(field, appValue, qbValue, resolution);
      
      const conflicts = db.getUnresolvedConflicts();
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].field).toBe(field);
      expect(conflicts[0].appValue).toBe(appValue);
      expect(conflicts[0].qbValue).toBe(qbValue);
      expect(conflicts[0].resolution).toBe(resolution);
      expect(conflicts[0].timestamp).toBeInstanceOf(Date);
    });

    it("should only return unresolved conflicts", () => {
      // Add conflicts
      db.addConflict("field1", "app1", "qb1");
      db.addConflict("field2", "app2", "qb2");
      
      // Resolve one conflict
      const stmt = db['db'].prepare(`
        UPDATE settings_conflicts 
        SET resolved_at = CURRENT_TIMESTAMP 
        WHERE field = 'field1'
      `);
      stmt.run();
      
      const conflicts = db.getUnresolvedConflicts();
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].field).toBe("field2");
    });
  });

  describe("Maintenance Operations", () => {
    it("should get database statistics", () => {
      // Create some test data
      db.saveSettings({ theme: "dark" });
      db.createBackup("Stats Test");
      db.logSync("test_operation", ["setting1"], true);
      db.addConflict("test_field", "app", "qb");
      
      const stats = db.getStats();
      
      expect(stats.totalSettings).toBeGreaterThanOrEqual(1);
      expect(stats.totalBackups).toBe(1);
      expect(stats.totalSyncOperations).toBe(1);
      expect(stats.unresolvedConflicts).toBe(1);
      expect(stats.lastBackup).toBeInstanceOf(Date);
      expect(stats.lastSync).toBeInstanceOf(Date);
    });

    it("should perform vacuum and analyze operations", () => {
      // These operations should not throw errors
      expect(() => {
        db.vacuum();
        db.analyze();
      }).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid JSON gracefully", () => {
      // Manually insert invalid JSON
      const stmt = db['db'].prepare(`
        INSERT INTO settings (key, value, type, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run("invalidJson", "{ invalid json }", "object");
      
      const settings = db.getAllSettings();
      // Invalid JSON should be handled gracefully (field might be missing)
      expect(settings).toBeDefined();
    });

    it("should throw errors for database failures", () => {
      // Close database to simulate failure
      db.close();
      
      expect(() => {
        db.getSetting("test");
      }).toThrow();
    });
  });
});