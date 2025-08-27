import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type {
  DownloadHistoryEntry,
  StoredTorrentFile,
  CompletedFile,
  HistoryFilters,
  FileHistoryStats,
} from "@/lib/types/file-history";

export class FileHistoryDB {
  private db: Database.Database;

  // Prepared statements for performance
  private addHistoryStmt!: Database.Statement;
  private getHistoryStmt!: Database.Statement;
  private updateHistoryStmt!: Database.Statement;
  private deleteHistoryStmt!: Database.Statement;
  private addTorrentFileStmt!: Database.Statement;
  private getTorrentFileStmt!: Database.Statement;
  private addCompletedFileStmt!: Database.Statement;
  private getCompletedFilesStmt!: Database.Statement;

  constructor(dbPath?: string) {
    const defaultPath = path.join(
      process.cwd(),
      "../data/file-history/history.db",
    );
    const actualPath = dbPath || defaultPath;

    // Ensure directory exists
    const dir = path.dirname(actualPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(actualPath);
    // Enable foreign key constraints
    this.db.pragma('foreign_keys = ON');
    this.initializeTables();
    this.prepareStatements();
  }

  private initializeTables(): void {
    // Create schema version table for migrations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY
      )
    `);

    // Download history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS download_history (
        id TEXT PRIMARY KEY,
        torrent_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        original_size INTEGER NOT NULL,
        downloaded_size INTEGER NOT NULL,
        download_path TEXT NOT NULL,
        torrent_file TEXT,
        magnet_url TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        download_time INTEGER NOT NULL,
        average_speed INTEGER NOT NULL,
        seeders INTEGER NOT NULL,
        leechers INTEGER NOT NULL,
        ratio REAL NOT NULL,
        category TEXT NOT NULL,
        tags TEXT NOT NULL, -- JSON array
        status TEXT NOT NULL,
        metadata TEXT, -- JSON object
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Stored torrent files table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stored_torrents (
        hash TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        title TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_date TEXT NOT NULL,
        trackers TEXT NOT NULL, -- JSON array
        files TEXT NOT NULL, -- JSON array
        magnet_url TEXT,
        storage_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Completed files table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS completed_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        size INTEGER NOT NULL,
        modified_date TEXT NOT NULL,
        media_type TEXT,
        torrent_hash TEXT,
        plex_compatible INTEGER NOT NULL,
        quality TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_history_torrent_hash ON download_history(torrent_hash);
      CREATE INDEX IF NOT EXISTS idx_history_status ON download_history(status);
      CREATE INDEX IF NOT EXISTS idx_history_category ON download_history(category);
      CREATE INDEX IF NOT EXISTS idx_history_completed_at ON download_history(completed_at);
      CREATE INDEX IF NOT EXISTS idx_files_torrent_hash ON completed_files(torrent_hash);
      CREATE INDEX IF NOT EXISTS idx_files_media_type ON completed_files(media_type);
    `);

    // Set schema version
    const version = this.db
      .prepare("SELECT version FROM schema_version")
      .get() as { version: number } | undefined;
    if (!version) {
      this.db.prepare("INSERT INTO schema_version (version) VALUES (1)").run();
    }
  }

  private prepareStatements(): void {
    this.addHistoryStmt = this.db.prepare(`
      INSERT INTO download_history (
        id, torrent_hash, name, original_size, downloaded_size, download_path,
        torrent_file, magnet_url, started_at, completed_at, download_time,
        average_speed, seeders, leechers, ratio, category, tags, status, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.getHistoryStmt = this.db.prepare(`
      SELECT * FROM download_history ORDER BY completed_at DESC
    `);

    this.updateHistoryStmt = this.db.prepare(`
      UPDATE download_history SET 
        status = ?, download_path = ?, metadata = ?
      WHERE id = ?
    `);

    this.deleteHistoryStmt = this.db.prepare(`
      DELETE FROM download_history WHERE id = ?
    `);

    this.addTorrentFileStmt = this.db.prepare(`
      INSERT INTO stored_torrents (
        hash, filename, title, size, created_date, trackers, files, magnet_url, storage_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.getTorrentFileStmt = this.db.prepare(`
      SELECT * FROM stored_torrents WHERE hash = ?
    `);

    this.addCompletedFileStmt = this.db.prepare(`
      INSERT OR REPLACE INTO completed_files (
        path, name, size, modified_date, media_type, torrent_hash, plex_compatible, quality
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.getCompletedFilesStmt = this.db.prepare(`
      SELECT * FROM completed_files ORDER BY modified_date DESC
    `);
  }

  addHistoryEntry(entry: DownloadHistoryEntry): void {
    this.addHistoryStmt.run(
      entry.id,
      entry.torrentHash,
      entry.name,
      entry.originalSize,
      entry.downloadedSize,
      entry.downloadPath,
      entry.torrentFile || null,
      entry.magnetUrl || null,
      entry.startedAt.toISOString(),
      entry.completedAt.toISOString(),
      entry.downloadTime,
      entry.averageSpeed,
      entry.seeders,
      entry.leechers,
      entry.ratio,
      entry.category,
      JSON.stringify(entry.tags),
      entry.status,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    );
  }

  getHistoryEntries(filters?: HistoryFilters): DownloadHistoryEntry[] {
    let query = "SELECT * FROM download_history WHERE 1=1";
    const params: any[] = [];

    if (filters?.category) {
      query += " AND category = ?";
      params.push(filters.category);
    }

    if (filters?.status && filters.status.length > 0) {
      const placeholders = filters.status.map(() => "?").join(",");
      query += ` AND status IN (${placeholders})`;
      params.push(...filters.status);
    }

    if (filters?.searchTerm) {
      query += " AND (name LIKE ? OR category LIKE ?)";
      const searchPattern = `%${filters.searchTerm}%`;
      params.push(searchPattern, searchPattern);
    }

    if (filters?.dateRange) {
      query += " AND completed_at >= ? AND completed_at <= ?";
      params.push(
        filters.dateRange[0].toISOString(),
        filters.dateRange[1].toISOString(),
      );
    }

    query += " ORDER BY completed_at DESC";

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(this.mapRowToHistoryEntry);
  }

  getHistoryEntry(id: string): DownloadHistoryEntry | null {
    const stmt = this.db.prepare("SELECT * FROM download_history WHERE id = ?");
    const row = stmt.get(id) as any;

    return row ? this.mapRowToHistoryEntry(row) : null;
  }

  updateHistoryEntry(id: string, updates: Partial<DownloadHistoryEntry>): void {
    this.updateHistoryStmt.run(
      updates.status || null,
      updates.downloadPath || null,
      updates.metadata ? JSON.stringify(updates.metadata) : null,
      id,
    );
  }

  deleteHistoryEntry(id: string): void {
    this.deleteHistoryStmt.run(id);
  }

  addStoredTorrentFile(torrent: StoredTorrentFile): void {
    this.addTorrentFileStmt.run(
      torrent.hash,
      torrent.filename,
      torrent.title,
      torrent.size,
      torrent.createdDate.toISOString(),
      JSON.stringify(torrent.trackers),
      JSON.stringify(torrent.files),
      torrent.magnetUrl || null,
      torrent.storagePath,
    );
  }

  getStoredTorrentFile(hash: string): StoredTorrentFile | null {
    const row = this.getTorrentFileStmt.get(hash) as any;

    if (!row) return null;

    return {
      hash: row.hash,
      filename: row.filename,
      title: row.title,
      size: row.size,
      createdDate: new Date(row.created_date),
      trackers: JSON.parse(row.trackers),
      files: JSON.parse(row.files),
      magnetUrl: row.magnet_url,
      storagePath: row.storage_path,
    };
  }

  getStoredTorrentFiles(): StoredTorrentFile[] {
    const stmt = this.db.prepare("SELECT * FROM stored_torrents ORDER BY created_date DESC");
    const rows = stmt.all() as any[];

    return rows.map((row) => ({
      hash: row.hash,
      filename: row.filename,
      title: row.title,
      size: row.size,
      createdDate: new Date(row.created_date),
      trackers: JSON.parse(row.trackers),
      files: JSON.parse(row.files),
      magnetUrl: row.magnet_url,
      storagePath: row.storage_path,
    }));
  }

  addCompletedFile(file: CompletedFile): void {
    this.addCompletedFileStmt.run(
      file.path,
      file.name,
      file.size,
      file.modifiedDate.toISOString(),
      file.mediaType || null,
      file.torrentHash || null,
      file.plexCompatible ? 1 : 0,
      file.quality || null,
    );
  }

  getCompletedFiles(torrentHash?: string): CompletedFile[] {
    let stmt = this.getCompletedFilesStmt;
    let params: any[] = [];

    if (torrentHash) {
      stmt = this.db.prepare(
        "SELECT * FROM completed_files WHERE torrent_hash = ? ORDER BY modified_date DESC",
      );
      params = [torrentHash];
    }

    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      path: row.path,
      name: row.name,
      size: row.size,
      modifiedDate: new Date(row.modified_date),
      mediaType: row.media_type,
      torrentHash: row.torrent_hash,
      plexCompatible: row.plex_compatible === 1,
      quality: row.quality,
    }));
  }

  getStats(): FileHistoryStats {
    const totalStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_downloads,
        SUM(original_size) as total_size,
        SUM(download_time) as total_time,
        AVG(average_speed) as average_speed
      FROM download_history
    `);
    const totals = totalStmt.get() as any;

    const categoryStmt = this.db.prepare(`
      SELECT category, COUNT(*) as count
      FROM download_history
      GROUP BY category
    `);
    const categories = categoryStmt.all() as any[];

    const statusStmt = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM download_history
      GROUP BY status
    `);
    const statuses = statusStmt.all() as any[];

    return {
      totalDownloads: totals.total_downloads || 0,
      totalSize: totals.total_size || 0,
      totalTime: totals.total_time || 0,
      averageSpeed: totals.average_speed || 0,
      categoryBreakdown: categories.reduce((acc, cat) => {
        acc[cat.category] = cat.count;
        return acc;
      }, {}),
      statusBreakdown: statuses.reduce((acc, status) => {
        acc[status.status] = status.count;
        return acc;
      }, {}),
    };
  }

  clearHistory(): void {
    this.db.prepare("DELETE FROM download_history").run();
    this.db.prepare("DELETE FROM completed_files").run();
  }

  close(): void {
    this.db.close();
  }

  private mapRowToHistoryEntry(row: any): DownloadHistoryEntry {
    return {
      id: row.id,
      torrentHash: row.torrent_hash,
      name: row.name,
      originalSize: row.original_size,
      downloadedSize: row.downloaded_size,
      downloadPath: row.download_path,
      torrentFile: row.torrent_file,
      magnetUrl: row.magnet_url,
      startedAt: new Date(row.started_at),
      completedAt: new Date(row.completed_at),
      downloadTime: row.download_time,
      averageSpeed: row.average_speed,
      seeders: row.seeders,
      leechers: row.leechers,
      ratio: row.ratio,
      category: row.category,
      tags: JSON.parse(row.tags || "[]"),
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}

// Singleton instance
let dbInstance: FileHistoryDB | null = null;

export function getFileHistoryDB(): FileHistoryDB {
  if (!dbInstance) {
    dbInstance = new FileHistoryDB();
  }
  return dbInstance;
}
