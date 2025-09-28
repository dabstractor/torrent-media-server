-- Transmission-specific database template for Sonarr
-- Based on qBittorrent template but modified for Transmission

CREATE TABLE IF NOT EXISTS "DownloadClients" ("Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "Enable" INTEGER NOT NULL, "Name" TEXT NOT NULL, "Implementation" TEXT NOT NULL, "Settings" TEXT NOT NULL, "ConfigContract" TEXT NOT NULL, "Priority" INTEGER NOT NULL DEFAULT 1, "RemoveCompletedDownloads" INTEGER NOT NULL DEFAULT 1, "RemoveFailedDownloads" INTEGER NOT NULL DEFAULT 1, "Tags" TEXT);

INSERT INTO DownloadClients VALUES(1,1,'Transmission','Transmission',unistr('{\u000a  "host": "nginx-proxy",\u000a  "port": 9091,\u000a  "useSsl": false,\u000a  "urlBase": "/transmission/",\u000a  "username": "",\u000a  "password": "",\u000a  "tvCategory": "sonarr-tv",\u000a  "tvDirectory": "/downloads/complete/sonarr-tv",\u000a  "recentTvPriority": 0,\u000a  "olderTvPriority": 0,\u000a  "addPaused": false\u000a}'),'TransmissionSettings',1,0,1,NULL);