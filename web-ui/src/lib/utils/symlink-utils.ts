import { promises as fs } from 'fs';
import path from 'path';

/**
 * Symlink utility functions for Plex media organization
 * Follows pattern from web-ui/src/lib/utils/file-monitoring.ts for error handling
 */

/**
 * Create a symlink from source to target path
 * Uses relative paths for Docker volume compatibility
 */
export async function createSymlink(sourcePath: string, linkPath: string): Promise<void> {
  // CRITICAL: Use relative paths for Docker volume compatibility
  const linkDir = path.dirname(linkPath);
  await ensureSymlinkDirectory(linkDir);
  
  const relativePath = path.relative(linkDir, sourcePath);
  
  try {
    await fs.symlink(relativePath, linkPath);
  } catch (error: unknown) {
    // GOTCHA: Handle existing symlinks gracefully
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      const existingTarget = await fs.readlink(linkPath);
      if (existingTarget !== relativePath) {
        await fs.unlink(linkPath);
        await fs.symlink(relativePath, linkPath);
      }
      // If symlink already points to correct target, do nothing
    } else {
      throw new Error(`Failed to create symlink: ${(error as Error).message}`);
    }
  }
}

/**
 * Ensure the directory for a symlink exists
 * Creates parent directories recursively if needed
 */
export async function ensureSymlinkDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: unknown) {
    throw new Error(`Failed to create symlink directory: ${(error as Error).message}`);
  }
}

/**
 * Check if a symlink exists and points to the expected target
 */
export async function verifySymlink(linkPath: string, expectedSource: string): Promise<boolean> {
  try {
    const stats = await fs.lstat(linkPath);
    if (!stats.isSymbolicLink()) {
      return false;
    }
    
    const actualTarget = await fs.readlink(linkPath);
    const linkDir = path.dirname(linkPath);
    const expectedRelative = path.relative(linkDir, expectedSource);
    
    return actualTarget === expectedRelative;
  } catch {
    // If file doesn't exist or any other error, symlink is not valid
    return false;
  }
}

/**
 * Remove a symlink if it exists
 * Safe operation that won't affect the source file
 */
export async function removeSymlink(linkPath: string): Promise<void> {
  try {
    const stats = await fs.lstat(linkPath);
    if (stats.isSymbolicLink()) {
      await fs.unlink(linkPath);
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw new Error(`Failed to remove symlink: ${(error as Error).message}`);
    }
    // If file doesn't exist, consider it successfully removed
  }
}

/**
 * Get the target of a symlink (resolved to absolute path)
 */
export async function getSymlinkTarget(linkPath: string): Promise<string | null> {
  try {
    const stats = await fs.lstat(linkPath);
    if (!stats.isSymbolicLink()) {
      return null;
    }
    
    const relativeTarget = await fs.readlink(linkPath);
    const linkDir = path.dirname(linkPath);
    return path.resolve(linkDir, relativeTarget);
  } catch {
    return null;
  }
}

/**
 * Generate a Plex-compatible directory structure path
 * Based on media type and naming conventions
 */
export function generatePlexPath(
  mediaPath: string,
  mediaType: 'movie' | 'tv',
  title: string,
  filename: string
): string {
  // Sanitize title for filesystem
  const sanitizedTitle = sanitizeFilename(title);
  
  if (mediaType === 'movie') {
    return path.join(mediaPath, 'Movies', sanitizedTitle, filename);
  } else {
    return path.join(mediaPath, 'TV Shows', sanitizedTitle, filename);
  }
}

/**
 * Sanitize a string for use as a filename/directory name
 * Removes or replaces characters that might cause filesystem issues
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, ' ')         // Normalize whitespace
    .trim()                       // Remove leading/trailing whitespace
    .substring(0, 255);           // Limit length for filesystem compatibility
}

/**
 * Extract media title from filename for organization
 * Simple implementation - could be enhanced with more sophisticated parsing
 */
export function extractMediaTitle(filename: string): string {
  const nameWithoutExt = path.parse(filename).name;
  
  // Remove common patterns like year, quality, etc.
  return nameWithoutExt
    .replace(/\b\d{4}\b/g, '')         // Remove years
    .replace(/\b(720p|1080p|2160p|4k)\b/gi, '') // Remove quality
    .replace(/\b(x264|x265|h264|h265)\b/gi, '') // Remove codecs
    .replace(/\b(bluray|bdrip|webrip|hdtv)\b/gi, '') // Remove source
    .replace(/[._-]+/g, ' ')           // Replace separators with spaces
    .replace(/\s+/g, ' ')              // Normalize whitespace
    .trim();
}

/**
 * Check if a path exists and is accessible
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file stats safely with error handling
 */
export async function getFileStats(filePath: string): Promise<Awaited<ReturnType<typeof fs.stat>> | null> {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}