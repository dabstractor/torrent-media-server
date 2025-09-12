PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "IndexerProxies" ("Id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "Name" TEXT NOT NULL, "Settings" TEXT NOT NULL, "Implementation" TEXT NOT NULL, "ConfigContract" TEXT, "Tags" TEXT);
INSERT INTO IndexerProxies VALUES(1,'FlareSolverr',unistr('{\u000a  "host": "http://flaresolverr:8191/",\u000a  "requestTimeout": 60\u000a}'),'FlareSolverr','FlareSolverrSettings',unistr('[\u000a  1\u000a]'));
COMMIT;
