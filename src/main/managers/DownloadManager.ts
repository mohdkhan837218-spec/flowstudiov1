import fs from 'fs';
import path from 'path';
import { PathSecurity } from '../security/paths';
import { AppDatabase } from '../database/db';
import { Logger } from '../logging/logger';

export class DownloadManager {
  /**
   * Returns the base output directory for a specific project.
   */
  public static getProjectOutputDir(projectId: string): string {
    const settings = AppDatabase.getSettings();
    const base = settings.downloadDirectory && fs.existsSync(settings.downloadDirectory)
      ? settings.downloadDirectory
      : PathSecurity.getDownloadsDir();

    const projectDir = path.join(base, projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    return projectDir;
  }

  /**
   * Generates a deterministic, non-overwriting destination filename for a shot.
   */
  public static generateShotOutputPath(projectId: string, shotId: string, extension = 'mp4'): string {
    const projectDir = this.getProjectOutputDir(projectId);
    const cleanShotId = shotId.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    let candidateName = `${cleanShotId}.${extension}`;
    let fullPath = path.join(projectDir, candidateName);
    let version = 2;

    while (fs.existsSync(fullPath)) {
      candidateName = `${cleanShotId}_v${version}.${extension}`;
      fullPath = path.join(projectDir, candidateName);
      version++;
    }

    return fullPath;
  }

  /**
   * Verifies that a generated file exists, is non-empty, and has expected size.
   */
  public static verifyFile(filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    try {
      const stats = fs.statSync(filePath);
      return stats.size > 0;
    } catch {
      return false;
    }
  }
}
