# PRP-010: Plex Symlink and Media Conversion Integration

---

## Goal

**Feature Goal**: Update Plex integration to preserve files for qBittorrent seeding while organizing media for Plex through symlinks (for compatible files) and ffmpeg conversion (for incompatible files).

**Deliverable**: Complete media organization service that creates symlinks for MP4 H.264/AAC files and converts other formats to MP4 H.264/AAC, storing them in proper Plex directory structures.

**Success Definition**: Downloaded media files remain in original location for seeding, while Plex can access media through symlinks or converted MP4 files organized in proper Plex naming conventions.

## User Persona

**Target User**: Home media server operator running a torrenting + Plex setup

**Use Case**: User downloads torrents and wants them organized for Plex automatically without breaking seeding ratios

**User Journey**: 
1. User downloads torrent via qBittorrent 
2. Download completes
3. System analyzes media format
4. If compatible (MP4 H.264/AAC), creates symlink in Plex structure
5. If incompatible, converts to MP4 H.264/AAC and places in Plex structure
6. Original file remains untouched for seeding
7. Plex library automatically refreshes

**Pain Points Addressed**: 
- Manual media organization time waste
- Broken torrent seeding when files are moved
- Plex compatibility issues with various media formats
- Storage space duplication from copying files

## Why

- **Preservation of Seeding**: Original files remain untouched, maintaining torrent ratios
- **Plex Compatibility**: All media becomes accessible to Plex in optimal format (H.264/AAC MP4)
- **Storage Efficiency**: Compatible files use symlinks (no duplication), only incompatible files get converted
- **Automation**: Eliminates manual media organization workflow
- **Format Optimization**: Ensures maximum Plex client compatibility through H.264/AAC encoding

## What

System automatically processes completed torrent downloads by analyzing media format and taking appropriate action:

### Compatible Files (MP4 H.264/AAC)
- Create symlinks from Plex directory structure to original download location
- Preserve original file for seeding
- No storage space duplication

### Incompatible Files (Other formats)
- Convert to MP4 H.264/AAC using ffmpeg
- Store converted file in Plex directory structure
- Preserve original file for seeding
- Moderate storage space increase for converted files only

### Success Criteria

- [ ] Media format detection accurately identifies H.264/AAC MP4 files
- [ ] Symlinks created for compatible files maintain proper Plex directory structure
- [ ] Incompatible files converted to MP4 H.264/AAC format successfully
- [ ] Original download files remain untouched for qBittorrent seeding
- [ ] Plex library automatically refreshes after organization
- [ ] Conversion progress tracking and error handling implemented
- [ ] Docker container includes ffmpeg for media processing

## All Needed Context

### Context Completeness Check

_This PRP provides complete implementation guidance for someone unfamiliar with this codebase, including specific file patterns, ffmpeg integration, and symlink creation strategies._

### Documentation & References

```yaml
- docfile: PRPs/ai_docs/ffmpeg-nodejs-integration.md
  why: Complete ffmpeg integration patterns for Node.js/TypeScript
  section: Core Implementation Patterns
  critical: MediaConverter class and codec detection methods

- file: web-ui/src/lib/utils/file-monitoring.ts
  why: Existing file system monitoring and processing patterns
  pattern: FileMonitor class structure, file processing with debouncing
  gotcha: Uses chokidar for watching, includes ignored file extensions

- file: web-ui/src/lib/api/files.ts
  why: Current media type detection and Plex compatibility checking
  pattern: getMediaType(), isPlexCompatible(), extractQuality() functions
  gotcha: Only extension-based detection, no actual codec analysis

- file: web-ui/src/lib/managers/PlexIntegrationManager.ts
  why: Existing Plex integration structure for download completion handling
  pattern: onDownloadComplete() method, library type detection
  gotcha: Currently only triggers library refresh, no file organization

- file: web-ui/src/lib/services/PlexService.ts
  why: Plex API communication patterns
  pattern: Service class structure, library refresh methods
  gotcha: Uses internal API routes, not direct Plex API calls

- file: web-ui/src/lib/types/settings.ts
  why: Settings structure for Plex configuration
  pattern: Plex settings interface, default values
  gotcha: Current Plex settings are basic URL/token only

- file: web-ui/src/lib/db/file-history.ts
  why: Database patterns for tracking file operations
  pattern: SQLite database operations, file tracking
  gotcha: Existing schema for completed files tracking
```

### Current Codebase Tree (relevant sections)

```bash
web-ui/src/
├── lib/
│   ├── api/
│   │   └── files.ts                    # Basic media type detection
│   ├── managers/
│   │   └── PlexIntegrationManager.ts   # Existing Plex integration
│   ├── services/
│   │   └── PlexService.ts              # Plex API communication
│   ├── types/
│   │   ├── settings.ts                 # Plex settings structure
│   │   └── file-history.ts             # File tracking types
│   └── utils/
│       └── file-monitoring.ts          # File system monitoring
```

### Desired Codebase Tree with new files

```bash
web-ui/src/
├── lib/
│   ├── services/
│   │   ├── MediaAnalysisService.ts     # ffprobe codec detection
│   │   ├── MediaConversionService.ts   # ffmpeg conversion operations
│   │   └── PlexOrganizationService.ts  # Main organization orchestrator
│   ├── utils/
│   │   └── symlink-utils.ts            # Symlink creation utilities
│   └── types/
│       └── media-conversion.ts         # Conversion-related types
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: fluent-ffmpeg requires ffmpeg binary in Docker container
// Docker must install ffmpeg: RUN apt-get update && apt-get install -y ffmpeg

// GOTCHA: Node.js fs.symlink creates absolute symlinks by default
// Use relative paths for Docker volume mount compatibility

// CRITICAL: FFmpeg conversion is CPU intensive
// Implement conversion queue to prevent overwhelming container

// GOTCHA: Existing file monitoring uses chokidar with polling
// Integration must work with existing FileMonitor debouncing

// CRITICAL: Original Plex settings are minimal (URL/token only)
// Need to extend for media organization paths
```

## Implementation Blueprint

### Data Models and Structure

Core data models ensuring type safety for media conversion operations.

```typescript
// web-ui/src/lib/types/media-conversion.ts
export interface MediaAnalysis {
  videoCodec: string;
  audioCodec: string;
  duration: number;
  resolution: string;
  isPlexCompatible: boolean;
  needsConversion: boolean;
}

export interface ConversionTask {
  id: string;
  inputPath: string;
  outputPath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface PlexOrganizationResult {
  plexPath: string;
  action: 'symlink' | 'convert' | 'skip';
  conversionTask?: ConversionTask;
  success: boolean;
  error?: string;
}

// Extended Plex settings
export interface PlexSettings {
  enabled: boolean;
  url: string;
  token: string;
  movieLibrary: string;
  tvLibrary: string;
  mediaPath: string;           // NEW: Base path for organized media
  autoUpdate: boolean;
  refreshDelay: number;
  scanAllLibraries: boolean;
  organizationEnabled: boolean; // NEW: Enable/disable organization
}
```

### Implementation Tasks (ordered by dependencies)

```yaml
Task 1: UPDATE web-ui/src/lib/types/settings.ts
  - IMPLEMENT: Extend PlexSettings interface with organization settings
  - FOLLOW pattern: Existing settings interfaces with defaults
  - NAMING: camelCase for new properties (mediaPath, organizationEnabled)
  - PLACEMENT: Update existing plex settings interface
  - MIGRATION: Update DEFAULT_SETTINGS to include new properties

Task 2: CREATE web-ui/src/lib/types/media-conversion.ts
  - IMPLEMENT: MediaAnalysis, ConversionTask, PlexOrganizationResult interfaces
  - FOLLOW pattern: web-ui/src/lib/types/file-history.ts structure
  - NAMING: PascalCase interfaces, camelCase properties
  - PLACEMENT: New dedicated file for conversion types

Task 3: CREATE web-ui/src/lib/utils/symlink-utils.ts
  - IMPLEMENT: createSymlink, ensureSymlinkDirectory utility functions
  - FOLLOW pattern: web-ui/src/lib/utils/file-monitoring.ts error handling
  - NAMING: camelCase function names with descriptive verbs
  - DEPENDENCIES: Node.js fs/promises, path modules
  - PLACEMENT: Utility functions in utils directory

Task 4: CREATE web-ui/src/lib/services/MediaAnalysisService.ts
  - IMPLEMENT: MediaAnalysisService class with analyzeFile method
  - FOLLOW pattern: web-ui/src/lib/services/PlexService.ts class structure
  - NAMING: MediaAnalysisService class, async analyzeFile method
  - DEPENDENCIES: fluent-ffmpeg for codec detection
  - PLACEMENT: Service layer for media analysis operations

Task 5: CREATE web-ui/src/lib/services/MediaConversionService.ts
  - IMPLEMENT: MediaConversionService class with conversion queue management
  - FOLLOW pattern: web-ui/src/lib/services/PlexService.ts async patterns
  - NAMING: MediaConversionService class, convertToH264MP4 method
  - DEPENDENCIES: fluent-ffmpeg, MediaAnalysisService, conversion types
  - PLACEMENT: Service layer for ffmpeg operations

Task 6: CREATE web-ui/src/lib/services/PlexOrganizationService.ts
  - IMPLEMENT: Main orchestrator service for Plex organization workflow
  - FOLLOW pattern: web-ui/src/lib/managers/PlexIntegrationManager.ts structure
  - NAMING: PlexOrganizationService class, organizeForPlex method
  - DEPENDENCIES: All previous services, symlink utilities, Plex types
  - PLACEMENT: High-level service orchestrating organization workflow

Task 7: UPDATE web-ui/src/lib/managers/PlexIntegrationManager.ts
  - MODIFY: onDownloadComplete method to use new organization service
  - FOLLOW pattern: Existing method structure, preserve error handling
  - INTEGRATION: Call PlexOrganizationService.organizeForPlex
  - PRESERVE: Existing library refresh functionality
  - NAMING: Maintain existing method names and signatures

Task 8: UPDATE web-ui/src/components/settings/sections/PlexSection.tsx
  - IMPLEMENT: New UI controls for organization settings
  - FOLLOW pattern: Existing ToggleSwitch and input patterns in file
  - NAMING: Maintain existing camelCase for state handlers
  - INTEGRATION: Add mediaPath input, organizationEnabled toggle
  - PLACEMENT: Add to existing Integration Options section

Task 9: UPDATE Dockerfile
  - IMPLEMENT: Install ffmpeg in web-ui container
  - FOLLOW pattern: Existing RUN commands for system packages
  - NAMING: Standard apt package installation
  - PLACEMENT: Add after existing package installations
  - CRITICAL: Required for fluent-ffmpeg to function

Task 10: UPDATE package.json
  - IMPLEMENT: Add ffmpeg dependencies (fluent-ffmpeg, ffmpeg-static)
  - FOLLOW pattern: Existing dependency structure
  - NAMING: Standard npm package names with TypeScript types
  - PLACEMENT: Add to dependencies section
  - DEPENDENCIES: @types/fluent-ffmpeg for TypeScript support
```

### Implementation Patterns & Key Details

```typescript
// Media Analysis Service Pattern
export class MediaAnalysisService {
  async analyzeFile(filePath: string): Promise<MediaAnalysis> {
    // PATTERN: Promise-based ffprobe with structured error handling
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(new Error(`Analysis failed: ${err.message}`));
        
        // CRITICAL: Check both video and audio streams exist
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        
        const isH264AAC = videoStream?.codec_name === 'h264' && 
                         audioStream?.codec_name === 'aac';
        
        resolve({
          videoCodec: videoStream?.codec_name || 'unknown',
          audioCodec: audioStream?.codec_name || 'unknown',
          duration: parseFloat(metadata.format.duration || '0'),
          resolution: `${videoStream?.width}x${videoStream?.height}`,
          isPlexCompatible: isH264AAC,
          needsConversion: !isH264AAC
        });
      });
    });
  }
}

// Conversion Service Pattern with Queue Management
export class MediaConversionService extends EventEmitter {
  private conversionQueue: ConversionTask[] = [];
  private activeConversions = 0;
  private maxConcurrent = 2; // CRITICAL: Limit CPU usage

  async convertToH264MP4(inputPath: string, outputPath: string): Promise<ConversionTask> {
    const task: ConversionTask = {
      id: uuidv4(),
      inputPath,
      outputPath,
      status: 'pending',
      progress: 0
    };
    
    // PATTERN: Queue management to prevent resource exhaustion
    this.conversionQueue.push(task);
    this.processQueue();
    
    return task;
  }
  
  // GOTCHA: FFmpeg progress events may not be perfectly linear
  private processConversion(task: ConversionTask): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(task.inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-crf 23', '-preset medium'])
        .on('progress', (progress) => {
          task.progress = Math.round(progress.percent || 0);
          this.emit('progress', task);
        })
        .on('end', () => {
          task.status = 'completed';
          task.completedAt = new Date();
          resolve();
        })
        .on('error', (err) => {
          task.status = 'failed';
          task.error = err.message;
          reject(err);
        })
        .save(task.outputPath);
    });
  }
}

// Symlink Utility Pattern
export async function createSymlink(sourcePath: string, linkPath: string): Promise<void> {
  // CRITICAL: Use relative paths for Docker volume compatibility
  const linkDir = path.dirname(linkPath);
  await fs.mkdir(linkDir, { recursive: true });
  
  const relativePath = path.relative(linkDir, sourcePath);
  
  try {
    await fs.symlink(relativePath, linkPath);
  } catch (error) {
    // GOTCHA: Handle existing symlinks gracefully
    if (error.code === 'EEXIST') {
      const existingTarget = await fs.readlink(linkPath);
      if (existingTarget !== relativePath) {
        await fs.unlink(linkPath);
        await fs.symlink(relativePath, linkPath);
      }
    } else {
      throw error;
    }
  }
}
```

### Integration Points

```yaml
DOCKER:
  - modify: Dockerfile
  - add: "RUN apt-get update && apt-get install -y ffmpeg"
  - placement: After existing RUN commands

SETTINGS_UPDATE:
  - modify: web-ui/src/lib/types/settings.ts
  - extend: PlexSettings interface with mediaPath, organizationEnabled
  - update: DEFAULT_SETTINGS with new property defaults

FILE_MONITORING:
  - integrate: web-ui/src/lib/utils/file-monitoring.ts
  - hook: FileMonitor completion events to trigger organization
  - preserve: Existing debouncing and file tracking patterns

DATABASE:
  - extend: Existing completed_files table schema consideration
  - track: Conversion tasks and symlink relationships
  - pattern: Follow existing SQLite database patterns
```

## Validation Loop

### Level 1: Syntax & Style (Immediate Feedback)

```bash
# Install new dependencies first
npm install fluent-ffmpeg @types/fluent-ffmpeg ffmpeg-static

# Type checking for new files
npm run type-check

# Linting validation
npm run lint

# Format validation  
npm run format

# Expected: Zero TypeScript errors, all linting passes
```

### Level 2: Unit Tests (Component Validation)

```bash
# Test media analysis service
npm run test -- MediaAnalysisService

# Test conversion service  
npm run test -- MediaConversionService

# Test organization service
npm run test -- PlexOrganizationService

# Test symlink utilities
npm run test -- symlink-utils

# Full test suite for new functionality
npm run test -- --testNamePattern="media|conversion|symlink"

# Expected: All tests pass, good coverage for new services
```

### Level 3: Integration Testing (System Validation)

```bash
# Verify Docker build with ffmpeg
docker-compose build web-ui

# Verify ffmpeg installation in container
docker-compose run web-ui ffmpeg -version

# Verify fluent-ffmpeg integration
docker-compose run web-ui node -e "
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.getAvailableFormats((err, formats) => {
  console.log(err ? 'FFmpeg not working' : 'FFmpeg working');
});
"

# Test media file analysis
docker-compose run web-ui node -e "
const { MediaAnalysisService } = require('./dist/lib/services/MediaAnalysisService.js');
const service = new MediaAnalysisService();
// Test with sample media file
"

# Test symlink creation in Docker volumes
ls -la data/media/ # Verify symlinks created correctly

# Expected: FFmpeg working, analysis successful, symlinks functional
```

### Level 4: Creative & Domain-Specific Validation

```bash
# Test with real media files
# Place test files in downloads directory
cp test-files/*.{mp4,mkv,avi} data/downloads/complete/

# Verify organization workflow
docker-compose logs web-ui | grep -i "media organization"

# Check Plex media directory structure
find data/media/ -type l -ls # List all symlinks
find data/media/ -name "*.mp4" -ls # List converted files

# Test Plex library refresh
curl -X POST http://localhost:3000/api/plex/libraries/1/refresh

# Verify original files untouched
ls -la data/downloads/complete/ # Original files should be preserved

# Performance testing with large files
# Monitor CPU usage during conversion
docker stats torrents_web-ui_1

# Expected: Proper organization, symlinks working, originals preserved, reasonable performance
```

## Final Validation Checklist

### Technical Validation

- [ ] All validation levels completed successfully
- [ ] FFmpeg installed and working in Docker container
- [ ] New TypeScript services compile without errors
- [ ] Symlink utilities create proper relative symlinks
- [ ] Media analysis correctly detects H.264/AAC files

### Feature Validation

- [ ] Compatible files get symlinked to Plex directory structure
- [ ] Incompatible files get converted to MP4 H.264/AAC
- [ ] Original download files remain untouched for seeding
- [ ] Plex library refresh triggered after organization
- [ ] Settings UI includes new organization controls
- [ ] Conversion progress tracking functional

### Code Quality Validation

- [ ] Follows existing service class patterns
- [ ] Error handling implemented for all file operations
- [ ] Type safety maintained throughout conversion pipeline
- [ ] File placement matches desired codebase structure
- [ ] Integration with existing PlexIntegrationManager preserved

### User Experience Validation

- [ ] Organization happens automatically on download completion
- [ ] User can enable/disable organization via settings
- [ ] User can configure Plex media directory path
- [ ] Conversion progress visible (if UI implemented)
- [ ] Error states handled gracefully with user feedback

---

## Anti-Patterns to Avoid

- ❌ Don't move original files - preserve for seeding
- ❌ Don't run unlimited concurrent conversions - CPU intensive
- ❌ Don't create absolute symlinks - breaks Docker volume mounts  
- ❌ Don't skip codec analysis - extension-based detection unreliable
- ❌ Don't ignore conversion errors - implement proper retry logic
- ❌ Don't block UI during conversions - use background processing
- ❌ Don't hardcode media paths - make configurable via settings