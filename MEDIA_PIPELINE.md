# Media Pipeline Documentation

## Overview
This system automatically processes downloaded torrent files and organizes them for Plex Media Server consumption. The pipeline handles file analysis, conversion when necessary, and automatic library updates.

## Pipeline Flow

### 1. Torrent Download & Completion
1. **Torrent Client** (qBittorrent) downloads files to `/downloads/` directory
2. **File Monitoring Service** detects completed downloads via filesystem events
3. Download completion triggers the `onDownloadComplete` event handler

### 2. File Analysis & Organization
When a download completes, the system processes it through several stages:

#### PlexIntegrationManager.onDownloadComplete()
- Receives download completion event with file metadata
- Calls `plexOrganizationService.organizeForPlex(completedFiles)` to process files

#### PlexOrganizationService Processing
1. **Media Analysis**: 
   - Analyzes each file using `MediaAnalysisService`
   - Determines if file needs conversion (codec compatibility check)
   - Extracts media metadata (resolution, codecs, duration)

2. **File Organization Decision**:
   - Determines media type (movie vs TV show) based on filename patterns
   - Extracts title from filename
   - Generates Plex-compatible path using `generatePlexPath()`

3. **Action Execution**:
   - **Symlink Creation**: For H.264/AAC MP4 files (Plex-compatible)
     - Creates symbolic links in `/media/tv/` or `/media/movies/` directory structure
     - Preserves original files for seeding
   - **Conversion**: For incompatible files (MKV, HEVC, etc.)
     - Converts to H.264/AAC MP4 format using FFmpeg
     - Places converted files in Plex directory structure

#### Path Generation
The `generatePlexPath()` function creates organized directory structures:
- **TV Shows**: `/media/tv/{Show Title}/Season {N}/{filename}.mp4`
- **Movies**: `/media/movies/{Movie Title}/{filename}.mp4`

### 3. Plex Library Integration
After file organization:

1. **Library Detection**: 
   - Determines correct Plex library (Movies or TV Shows) based on file types
   - Finds library ID using Plex API

2. **Library Refresh**: 
   - Triggers library refresh via Plex API (`/library/sections/{id}/refresh`)
   - Plex scans the `/media/tv/` or `/media/movies/` directories
   - New files are automatically added to the library

### 4. Docker Container Architecture
The system uses multiple containers with proper user ID mapping:

- **web-ui**: Runs as UID 1000:1000 (matches host user)
  - Handles file organization and conversion
  - Creates files with correct ownership
- **plex**: Runs as UID 1000:1000 
  - Scans `/media/` volumes with proper permissions
- **qbittorrent**: Runs as UID 1000:1000
  - Downloads to `/downloads/` with correct ownership

### 5. File Processing Examples

#### TV Show Organization:
1. **Input**: `/downloads/South.Park.S27E02.1080p.AMZN.WEB-DL.DDP5.1.x265.10-bit-KSPEncodes.mkv`
2. **Analysis**: Detects HEVC codec (incompatible with direct play)
3. **Conversion**: Converts to H.264 MP4
4. **Output**: `/media/tv/South Park/Season 27/South.Park.S27E02.mp4`

#### Compatible File Organization:
1. **Input**: `/downloads/south.park.s27e04.1080p.web.h264-successfulcrab[EZTVx.to].mkv`
2. **Analysis**: Detects H.264 codec (compatible)
3. **Symlink**: Creates symlink at `/media/tv/South Park/Season 27/South.Park.S27E04.mkv`
   - Points to original file for seeding
   - Plex can direct play the file

## Key Components

### Services
- **PlexService**: Handles Plex API communication
- **PlexOrganizationService**: Main orchestration for file processing
- **MediaAnalysisService**: Analyzes media files for compatibility
- **MediaConversionService**: Handles FFmpeg-based conversions
- **FileMonitoringService**: Watches for download completion events

### Utilities
- **symlink-utils.ts**: Path generation and symlink management
- **file-monitoring.ts**: File system event handling

### Configuration
- Plex libraries configured to scan `/media/tv/` and `/media/movies/`
- Container user IDs mapped to host user (1000:1000)
- Volumes properly mounted between containers

## Success Criteria
- Files appear in correct Plex library automatically
- Compatible files are symlinked (no duplication)
- Incompatible files are converted to Plex-compatible format
- Original files preserved for seeding
- Proper file ownership maintained across containers