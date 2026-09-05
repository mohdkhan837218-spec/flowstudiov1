import fs from 'fs';
import path from 'path';
import { PathSecurity } from '../security/paths';
import { Logger } from '../logging/logger';
import { BrowserProfileInfo } from '../../shared/types/browser';

export class ProfileManager {
  private static activeLocks: Set<string> = new Set();

  /**
   * Provisions an isolated persistent profile directory for a given account.
   */
  public static ensureProfile(accountId: string): string {
    const profilePath = PathSecurity.getProfilePathForAccount(accountId);
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
      Logger.info('ProfileManager', `Created isolated profile directory for ${accountId}`, accountId);
    }
    return profilePath;
  }

  /**
   * Returns profile directory path for an account.
   */
  public static getProfilePath(accountId: string): string {
    return PathSecurity.getProfilePathForAccount(accountId);
  }

  /**
   * Checks if an account's profile is currently locked by an active browser instance.
   */
  public static isLocked(accountId: string): boolean {
    return this.activeLocks.has(accountId);
  }

  /**
   * Acquires a single-instance lock for an account profile.
   * Throws an error if the profile is already locked.
   */
  public static acquireLock(accountId: string): void {
    if (this.activeLocks.has(accountId)) {
      throw new Error(`Profile for account ${accountId} is already locked by another active browser session`);
    }
    this.activeLocks.add(accountId);
    Logger.debug('ProfileManager', `Acquired lock for ${accountId}`, accountId);
  }

  /**
   * Releases lock when browser closes.
   */
  public static releaseLock(accountId: string): void {
    this.activeLocks.delete(accountId);
    Logger.debug('ProfileManager', `Released lock for ${accountId}`, accountId);
  }

  /**
   * Retrieves profile metadata including size and lock state.
   */
  public static getProfileInfo(accountId: string): BrowserProfileInfo {
    const profileDir = PathSecurity.getProfilePathForAccount(accountId);
    let sizeBytes = 0;

    if (fs.existsSync(profileDir)) {
      try {
        const calculateDirSize = (dir: string): number => {
          let total = 0;
          const files = fs.readdirSync(dir, { withFileTypes: true });
          for (const file of files) {
            const filePath = path.join(dir, file.name);
            if (file.isDirectory()) {
              total += calculateDirSize(filePath);
            } else {
              const stat = fs.statSync(filePath);
              total += stat.size;
            }
          }
          return total;
        };
        sizeBytes = calculateDirSize(profileDir);
      } catch {
        // Ignored for active profile directories with open files
      }
    }

    return {
      accountId,
      profileDir,
      isLocked: this.isLocked(accountId),
      sizeBytes
    };
  }

  /**
   * Safely deletes an account's isolated profile directory when account is removed.
   */
  public static deleteProfile(accountId: string): void {
    if (this.isLocked(accountId)) {
      throw new Error(`Cannot delete active profile for account ${accountId}. Close browser first.`);
    }

    const profilePath = PathSecurity.getProfilePathForAccount(accountId);
    if (fs.existsSync(profilePath)) {
      try {
        fs.rmSync(profilePath, { recursive: true, force: true });
        Logger.info('ProfileManager', `Deleted profile directory for account ${accountId}`, accountId);
      } catch (err) {
        Logger.error('ProfileManager', `Failed deleting profile directory for ${accountId}`, accountId, null, { error: String(err) });
        throw err;
      }
    }
  }
}
