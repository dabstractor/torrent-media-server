-- qBittorrent-specific database template for Radarr
-- Extracted from existing radarr.db.template.sql

CREATE TABLE IF NOT EXISTS "DownloadClients" ("Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "Enable" INTEGER NOT NULL, "Name" TEXT NOT NULL, "Implementation" TEXT NOT NULL, "Settings" TEXT NOT NULL, "ConfigContract" TEXT NOT NULL, "Priority" INTEGER NOT NULL DEFAULT 1, "RemoveCompletedDownloads" INTEGER NOT NULL DEFAULT 1, "RemoveFailedDownloads" INTEGER NOT NULL DEFAULT 1, "Tags" TEXT);

INSERT INTO DownloadClients VALUES(1,1,'qBittorrent','QBittorrent',unistr('{\u000a  "host": "nginx-proxy",\u000a  "port": 8080,\u000a  "useSsl": false,\u000a  "username": "admin",\u000a  "password": "adminadmin",\u000a  "movieCategory": "radarr-movies",\u000a  "recentMoviePriority": 0,\u000a  "olderMoviePriority": 0,\u000a  "initialState": 0,\u000a  "sequentialOrder": false,\u000a  "firstAndLast": false,\u000a  "contentLayout": 0\u000a}'),'QBittorrentSettings',1,0,1,'[]');