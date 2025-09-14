import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type {
  AppSettings,
  SettingsBackup,
  BackupMetadata,
  SyncResult,
  SettingsConflict,
} from "@/lib/types/settings";
import { DEFAULT_SETTINGS } from "@/lib/types/settings";
import crypto from "crypto";

const CURRENT_VERSION = 1;

export class SettingsDatabase {
  private db: Database.Database;

  // Prepared statements for performance
  private getSettingStmt!: Database.Statement;
  private setSettingStmt!: Database.Statement;
  private getAllSettingsStmt!: Database.Statement;
  private updateSettingsStmt!: Database.Statement;
  private createBackupStmt!: Database.Statement;
  private getBackupStmt!: Database.Statement;
  private listBackupsStmt!: Database.Statement;
  private deleteBackupStmt!: Database.Statement;
  private logSyncStmt!: Database.Statement;
  private getSyncHistoryStmt!: Database.Statement;
  private addConflictStmt!: Database.Statement;
  private getConflictsStmt!: Database.Statement;

  constructor(dbPath?: string) {
    // Use a writable location that works in both dev and production
    let defaultPath: string;

    if (dbPath) {
      defaultPath = dbPath;
    } else if (process.env.NODE_ENV === 'production') {
      // Try multiple writable locations in order of preference
      const candidates = [
        '/tmp/web-ui/settings.db',      // Temporary but always writable
        path.join(process.cwd(), '.next/cache/settings.db'), // Next.js cache dir
        '/app/data/settings.db',        // App directory
      ];

      defaultPath = candidates[0]; // Default to tmp for guaranteed write access

      // Try to use a more persistent location if possible
      for (const candidate of candidates.slice(1)) {
        try {
          const dir = path.dirname(candidate);
          fs.mkdirSync(dir, { recursive: true });
          // Test write access
          fs.writeFileSync(path.join(dir, '.write-test'), 'test');
          fs.unlinkSync(path.join(dir, '.write-test'));
          defaultPath = candidate;
          break;
        } catch (error) {
          console.warn(`Cannot write to ${candidate}, trying next option:`, error);
        }
      }
    } else {
      // Development mode
      defaultPath = path.join(process.cwd(), "data/settings.db");
    }

    console.log(`Settings database path: ${defaultPath}`);

    // Ensure directory exists
    const dir = path.dirname(defaultPath);
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      console.error(`Failed to create database directory ${dir}:`, error);
      throw new Error(`Cannot create database directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    try {
      this.db = new Database(defaultPath);
      // Enable foreign key constraints
      this.db.pragma('foreign_keys = ON');
      this.initializeTables();
      this.prepareStatements();
      this.ensureDefaultSettings();
      console.log('Settings database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize settings database:', error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private initializeTables(): void {
    // Create schema version table for migrations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      )
    `);

    // Main settings table - stores JSON blobs for nested objects
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings backups table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings_backups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        settings_json TEXT NOT NULL,
        checksum TEXT NOT NULL,
        version TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sync history table for qBittorrent synchronization
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings_sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL, -- 'sync_to_qb', 'sync_from_qb', 'conflict_resolved'
        settings_changed TEXT, -- JSON array of field names
        success INTEGER NOT NULL,
        error_message TEXT,
        execution_time INTEGER NOT NULL, -- milliseconds
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings conflicts table for conflict resolution
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings_conflicts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field TEXT NOT NULL,
        app_value TEXT NOT NULL,
        qb_value TEXT NOT NULL,
        resolution TEXT NOT NULL, -- 'app_wins', 'qb_wins', 'manual'
        resolved_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
      CREATE INDEX IF NOT EXISTS idx_backup_created ON settings_backups(created_at);
      CREATE INDEX IF NOT EXISTS idx_sync_log_created ON settings_sync_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_conflicts_field ON settings_conflicts(field);
      CREATE INDEX IF NOT EXISTS idx_conflicts_resolved ON settings_conflicts(resolved_at);
    `);

    // Handle schema migrations
    this.migrateSchema();
  }

  private migrateSchema(): void {
    const version = this.db
      .prepare("SELECT version FROM schema_version")
      .get() as { version: number } | undefined;

    if (!version) {
      // Initial version
      this.db.prepare("INSERT INTO schema_version (version) VALUES (?)").run(CURRENT_VERSION);
      return;
    }

    if (version.version < CURRENT_VERSION) {
      // Future migrations would go here
      // Example migration pattern:
      // if (version.version < 2) {
      //   this.db.exec(`ALTER TABLE settings ADD COLUMN new_field TEXT`);
      // }
      
      this.db.prepare("UPDATE schema_version SET version = ?").run(CURRENT_VERSION);
    }
  }

  private prepareStatements(): void {
    this.getSettingStmt = this.db.prepare(`
      SELECT value, type FROM settings WHERE key = ?
    `);

    this.setSettingStmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, type, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);

    this.getAllSettingsStmt = this.db.prepare(`
      SELECT key, value, type FROM settings
    `);

    this.updateSettingsStmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, type, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);

    this.createBackupStmt = this.db.prepare(`
      INSERT INTO settings_backups (id, name, description, settings_json, checksum, version)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    this.getBackupStmt = this.db.prepare(`
      SELECT * FROM settings_backups WHERE id = ?
    `);

    this.listBackupsStmt = this.db.prepare(`
      SELECT id, name, description, version, created_at,
             LENGTH(settings_json) as size
      FROM settings_backups 
      ORDER BY created_at DESC
    `);

    this.deleteBackupStmt = this.db.prepare(`
      DELETE FROM settings_backups WHERE id = ?
    `);

    this.logSyncStmt = this.db.prepare(`
      INSERT INTO settings_sync_log (operation, settings_changed, success, error_message, execution_time)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.getSyncHistoryStmt = this.db.prepare(`
      SELECT * FROM settings_sync_log 
      ORDER BY created_at DESC 
      LIMIT ?
    `);

    this.addConflictStmt = this.db.prepare(`
      INSERT INTO settings_conflicts (field, app_value, qb_value, resolution)
      VALUES (?, ?, ?, ?)
    `);

    this.getConflictsStmt = this.db.prepare(`
      SELECT * FROM settings_conflicts 
      WHERE resolved_at IS NULL 
      ORDER BY created_at DESC
    `);
  }

  private ensureDefaultSettings(): void {
    // Ensure all default settings exist
    const existingSettings = this.getAllSettings();
    
    // If no settings exist, initialize with defaults
    if (Object.keys(existingSettings).length === 0) {
      this.saveSettings(DEFAULT_SETTINGS);
    }
  }

  // CRUD Operations for Settings
  getSetting<T>(key: string): T | null {
    const result = this.getSettingStmt.get(key) as { value: string; type: string } | undefined;
    
    if (!result) return null;

    try {
      switch (result.type) {
        case 'string':
          return result.value as T;
        case 'number':
          return parseFloat(result.value) as T;
        case 'boolean':
          return (result.value === 'true') as T;
        case 'object':
          return JSON.parse(result.value) as T;
        default:
          return result.value as T;
      }
    } catch (error) {
      console.error(`Failed to parse setting ${key}:`, error);
      return null;
    }
  }

  setSetting(key: string, value: any): void {
    const type = typeof value;
    let serializedValue: string;

    try {
      switch (type) {
        case 'object':
          serializedValue = JSON.stringify(value);
          break;
        case 'boolean':
          serializedValue = value.toString();
          break;
        case 'number':
          serializedValue = value.toString();
          break;
        default:
          serializedValue = String(value);
      }

      this.setSettingStmt.run(key, serializedValue, type);
    } catch (error) {
      throw new Error(`Failed to save setting ${key}: ${error}`);
    }
  }

  getAllSettings(): Partial<AppSettings> {
    const rows = this.getAllSettingsStmt.all() as Array<{
      key: string;
      value: string;
      type: string;
    }>;

    const settings: any = {};

    for (const row of rows) {
      try {
        switch (row.type) {
          case 'string':
            settings[row.key] = row.value;
            break;
          case 'number':
            settings[row.key] = parseFloat(row.value);
            break;
          case 'boolean':
            settings[row.key] = row.value === 'true';
            break;
          case 'object':
            settings[row.key] = JSON.parse(row.value);
            break;
          default:
            settings[row.key] = row.value;
        }
      } catch (error) {
        console.error(`Failed to parse setting ${row.key}:`, error);
      }
    }

    return settings;
  }

  saveSettings(settings: Partial<AppSettings>): void {
    const transaction = this.db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined) {
          this.setSetting(key, value);
        }
      }
    });

    try {
      transaction();
    } catch (error) {
      throw new Error(`Failed to save settings: ${error}`);
    }
  }

  // Backup Operations
  createBackup(name: string, description?: string): string {
    const id = crypto.randomUUID();
    const settings = this.getAllSettings();
    const settingsJson = JSON.stringify(settings, null, 2);
    const checksum = crypto.createHash('sha256')
      .update(settingsJson)
      .digest('hex');

    try {
      this.createBackupStmt.run(
        id,
        name,
        description || null,
        settingsJson,
        checksum,
        CURRENT_VERSION.toString()
      );
      return id;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  getBackup(id: string): SettingsBackup | null {
    const row = this.getBackupStmt.get(id) as any;
    
    if (!row) return null;

    try {
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        settings: JSON.parse(row.settings_json),
        createdAt: new Date(row.created_at),
        version: row.version,
        checksum: row.checksum,
      };
    } catch (error) {
      throw new Error(`Failed to parse backup ${id}: ${error}`);
    }
  }

  listBackups(): BackupMetadata[] {
    const rows = this.listBackupsStmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: new Date(row.created_at),
      version: row.version,
      size: row.size,
    }));
  }

  deleteBackup(id: string): boolean {
    const result = this.deleteBackupStmt.run(id);
    return result.changes > 0;
  }

  restoreBackup(id: string): { success: boolean; errors: string[] } {
    const backup = this.getBackup(id);
    
    if (!backup) {
      return { success: false, errors: ['Backup not found'] };
    }

    // Verify backup integrity
    const settingsJson = JSON.stringify(backup.settings, null, 2);
    const checksum = crypto.createHash('sha256')
      .update(settingsJson)
      .digest('hex');

    if (checksum !== backup.checksum) {
      return { success: false, errors: ['Backup integrity check failed'] };
    }

    try {
      this.saveSettings(backup.settings);
      return { success: true, errors: [] };
    } catch (error) {
      return { success: false, errors: [`Failed to restore settings: ${error}`] };
    }
  }

  // Sync Logging Operations
  logSync(operation: string, settingsChanged: string[], success: boolean, error?: string, executionTime?: number): void {
    try {
      this.logSyncStmt.run(
        operation,
        JSON.stringify(settingsChanged),
        success ? 1 : 0,
        error || null,
        executionTime || 0
      );
    } catch (err) {
      console.error('Failed to log sync operation:', err);
    }
  }

  getSyncHistory(limit: number = 50): Array<{
    id: number;
    operation: string;
    settingsChanged: string[];
    success: boolean;
    errorMessage?: string;
    executionTime: number;
    createdAt: Date;
  }> {
    const rows = this.getSyncHistoryStmt.all(limit) as any[];
    
    return rows.map(row => ({
      id: row.id,
      operation: row.operation,
      settingsChanged: JSON.parse(row.settings_changed || '[]'),
      success: row.success === 1,
      errorMessage: row.error_message,
      executionTime: row.execution_time,
      createdAt: new Date(row.created_at),
    }));
  }

  // Conflict Management
  addConflict(field: string, appValue: any, qbValue: any, resolution: string = 'manual'): void {
    try {
      this.addConflictStmt.run(
        field,
        JSON.stringify(appValue),
        JSON.stringify(qbValue),
        resolution
      );
    } catch (error) {
      console.error('Failed to add conflict:', error);
    }
  }

  getUnresolvedConflicts(): SettingsConflict[] {
    const rows = this.getConflictsStmt.all() as any[];
    
    return rows.map(row => ({
      field: row.field,
      appValue: JSON.parse(row.app_value),
      qbValue: JSON.parse(row.qb_value),
      resolution: row.resolution as 'app_wins' | 'qb_wins' | 'manual',
      timestamp: new Date(row.created_at),
    }));
  }

  resolveConflict(id: number): void {
    const stmt = this.db.prepare(`
      UPDATE settings_conflicts 
      SET resolved_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(id);
  }

  // Maintenance Operations
  vacuum(): void {
    this.db.exec('VACUUM');
  }

  analyze(): void {
    this.db.exec('ANALYZE');
  }

  getStats(): {
    totalSettings: number;
    totalBackups: number;
    totalSyncOperations: number;
    unresolvedConflicts: number;
    lastBackup?: Date;
    lastSync?: Date;
  } {
    const settingsCount = this.db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
    const backupsCount = this.db.prepare('SELECT COUNT(*) as count FROM settings_backups').get() as { count: number };
    const syncCount = this.db.prepare('SELECT COUNT(*) as count FROM settings_sync_log').get() as { count: number };
    const conflictsCount = this.db.prepare('SELECT COUNT(*) as count FROM settings_conflicts WHERE resolved_at IS NULL').get() as { count: number };
    
    const lastBackup = this.db.prepare('SELECT MAX(created_at) as date FROM settings_backups').get() as { date: string | null };
    const lastSync = this.db.prepare('SELECT MAX(created_at) as date FROM settings_sync_log').get() as { date: string | null };

    return {
      totalSettings: settingsCount.count,
      totalBackups: backupsCount.count,
      totalSyncOperations: syncCount.count,
      unresolvedConflicts: conflictsCount.count,
      lastBackup: lastBackup.date ? new Date(lastBackup.date) : undefined,
      lastSync: lastSync.date ? new Date(lastSync.date) : undefined,
    };
  }

  close(): void {
    this.db.close();
  }
}

// Singleton instance
let dbInstance: SettingsDatabase | null = null;
let dbInstanceError: Error | null = null;

export function getSettingsDB(): SettingsDatabase {
  if (!dbInstance && !dbInstanceError) {
    try {
      dbInstance = new SettingsDatabase();
    } catch (error) {
      dbInstanceError = error instanceof Error ? error : new Error('Database initialization failed');
      console.error('Failed to create settings database instance:', dbInstanceError);
      throw dbInstanceError;
    }
  }

  if (dbInstanceError) {
    throw dbInstanceError;
  }

  return dbInstance!;
}