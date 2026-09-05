import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export class PathSecurity {
  private static baseUserDataDir: string = '';
  private static profilesDir: string = '';
  private static downloadsDir: string = '';

  public static initialize(): void {
    // If running in packaged electron or normal dev mode
    this.baseUserDataDir = app ? app.getPath('userData') : path.join(process.cwd(), 'app-data');
    this.profilesDir = path.join(this.baseUserDataDir, 'profiles');
    this.downloadsDir = path.join(this.baseUserDataDir, 'downloads');

    if (!fs.existsSync(this.profilesDir)) {
      fs.mkdirSync(this.profilesDir, { recursive: true });
    }
    if (!fs.existsSync(this.downloadsDir)) {
      fs.mkdirSync(this.downloadsDir, { recursive: true });
    }
  }

  public static getUserDataDir(): string {
    if (!this.baseUserDataDir) this.initialize();
    return this.baseUserDataDir;
  }

  public static getProfilesDir(): string {
    if (!this.profilesDir) this.initialize();
    return this.profilesDir;
  }

  public static getDownloadsDir(): string {
    if (!this.downloadsDir) this.initialize();
    return this.downloadsDir;
  }

  public static sanitizeAccountId(accountId: string): string {
    if (!accountId || typeof accountId !== 'string') {
      throw new Error('Account ID must be a non-empty string');
    }
    if (accountId.includes('..') || accountId.includes('/') || accountId.includes('\\')) {
      throw new Error(`Invalid characters or path traversal attempt in account ID: ${accountId}`);
    }
    const sanitized = accountId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!sanitized) {
      throw new Error(`Invalid account ID format: ${accountId}`);
    }
    return sanitized;
  }

  public static getProfilePathForAccount(accountId: string): string {
    const safeId = this.sanitizeAccountId(accountId);
    const resolved = path.resolve(this.getProfilesDir(), safeId);
    
    // Ensure the resolved path stays within profilesDir
    if (!resolved.startsWith(path.resolve(this.getProfilesDir()))) {
      throw new Error(`Path traversal attempt detected for account ID: ${accountId}`);
    }
    return resolved;
  }

  public static ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
