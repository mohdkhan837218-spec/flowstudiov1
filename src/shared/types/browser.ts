export interface BrowserProfileInfo {
  accountId: string;
  profileDir: string;
  isLocked: boolean;
  sizeBytes?: number;
  lastUsed?: string;
}

export interface BrowserLaunchOptions {
  headless?: boolean;
  startUrl?: string;
  timeout?: number;
  slowMo?: number;
}
