import { Job } from '../../shared/types/job';
import { Logger } from '../logging/logger';

export class RetryManager {
  private static nonRecoverableErrors = [
    'MANUAL_VERIFICATION_REQUIRED',
    'LOGIN_REQUIRED',
    'CANCELLED',
    'ACCOUNT_DISABLED',
    'PAYMENT_REQUIRED',
    'CAPTCHA'
  ];

  /**
   * Checks if an error can be automatically retried.
   */
  public static isRecoverable(errorMessage: string | null | undefined): boolean {
    if (!errorMessage) return true;
    const lower = errorMessage.toLowerCase();
    for (const nonRec of this.nonRecoverableErrors) {
      if (lower.includes(nonRec.toLowerCase())) {
        return false;
      }
    }
    return true;
  }

  /**
   * Calculates exponential backoff delay in milliseconds.
   * Retry 1 -> 5s (5000ms)
   * Retry 2 -> 15s (15000ms)
   * Retry 3 -> 45s (45000ms)
   */
  public static getBackoffDelayMs(retryCount: number): number {
    const base = 5000;
    return base * Math.pow(3, Math.max(0, retryCount - 1));
  }
}
