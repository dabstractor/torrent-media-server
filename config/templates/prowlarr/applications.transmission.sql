-- Transmission-specific Applications and DownloadClients for Prowlarr
-- Configures Prowlarr to work with Transmission as the download client

-- Applications table (Sonarr and Radarr sync configuration)
INSERT INTO Applications VALUES(1,'Sonarr','Sonarr',unistr('{\u000a  "prowlarrUrl": "http://prowlarr:9696",\u000a  "baseUrl": "http://sonarr:8989",\u000a  "apiKey": "'||replace(hex(randomblob(16)), ' ', '')||'",\u000a  "syncLevel": 2,\u000a  "syncCategories": [5000, 5010, 5020, 5030, 5040, 5045, 5050],\u000a  "downloadClient": "Transmission",\u000a  "downloadClientId": 1,\u000a  "proxyenabled": false\u000a}'),'SonarrSettings',2,'[]');

INSERT INTO Applications VALUES(2,'Radarr','Radarr',unistr('{\u000a  "prowlarrUrl": "http://prowlarr:9696",\u000a  "baseUrl": "http://radarr:7878",\u000a  "apiKey": "'||replace(hex(randomblob(16)), ' ', '')||'",\u000a  "syncLevel": 2,\u000a  "syncCategories": [2000, 2010, 2020, 2030, 2040, 2045, 2050, 2060, 2070, 2080],\u000a  "downloadClient": "Transmission",\u000a  "downloadClientId": 1,\u000a  "proxyenabled": false\u000a}'),'RadarrSettings',2,'[]');

-- DownloadClients table (Transmission configuration)
INSERT OR REPLACE INTO DownloadClients VALUES(1,1,'Transmission','Transmission',unistr('{\u000a  "host": "nginx-proxy",\u000a  "port": 9091,\u000a  "useSsl": false,\u000a  "urlBase": "/",\u000a  "username": "",\u000a  "password": "",\u000a  "category": "",\u000a  "priority": 0,\u000a  "initialState": 0\u000a}'),'TransmissionSettings',1,'[]');