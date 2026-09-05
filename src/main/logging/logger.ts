import fs from 'fs';
import path from 'path';
import { BrowserWindow } from 'electron';
import { ActivityLogEntry, LogSeverity } from '../../shared/types/activity';
import { PathSecurity } from '../security/paths';

export class Logger {
  private static logFilePath: string = '';
  private static subscribers: Set<(log: ActivityLogEntry) => void> = new Set();

  public static initialize(): void {
    const logsDir = path.join(PathSecurity.getUserDataDir(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logFilePath = path.join(logsDir, `activity_${new Date().toISOString().slice(0, 10)}.log`);
  }

  private static sanitizeMetadata(meta?: Record<string, any>): Record<string, any> | undefined {
    if (!meta) return undefined;
    try {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(meta)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('cookie') ||
          lowerKey.includes('authorization') ||
          lowerKey.includes('auth_key')
        ) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeMetadata(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    } catch {
      return meta;
    }
  }

  public static log(
    severity: LogSeverity,
    component: string,
    message: string,
    accountId?: string | null,
    jobId?: string | null,
    metadata?: Record<string, any>
  ): ActivityLogEntry {
    const cleanMeta = this.sanitizeMetadata(metadata);
    const entry: ActivityLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      severity,
      component,
      category: cleanMeta?.category || 'SYSTEM',
      stage: cleanMeta?.stage,
      action: cleanMeta?.action,
      workerId: cleanMeta?.workerId,
      projectId: cleanMeta?.projectId,
      errorCode: cleanMeta?.errorCode,
      errorId: cleanMeta?.errorId,
      accountId,
      jobId,
      message,
      metadata: cleanMeta
    };

    // Console output
    const tag = `[${entry.timestamp.split('T')[1].slice(0, 8)}] [${severity.padEnd(8)}] [${component}]`;
    if (severity === 'CRITICAL' || severity === 'ERROR') {
      console.error(tag, message, cleanMeta || '');
    } else if (severity === 'WARNING') {
      console.warn(tag, message, cleanMeta || '');
    } else if (severity === 'DEBUG' || severity === 'TRACE') {
      console.debug(tag, message, cleanMeta || '');
    } else {
      console.log(tag, message, cleanMeta || '');
    }

    // Persist to file
    try {
      if (!this.logFilePath) this.initialize();
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFilePath, line, 'utf8');
    } catch (err) {
      console.error('Failed writing to log file:', err);
    }

    // Notify IPC renderer windows if running in Electron environment
    try {
      if (typeof BrowserWindow !== 'undefined' && BrowserWindow && typeof BrowserWindow.getAllWindows === 'function') {
        BrowserWindow.getAllWindows().forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send('activity:log', entry);
            win.webContents.send('terminal:log', entry);
          }
        });
      }
    } catch {
      // Ignored outside Electron
    }

    // In-memory subscribers
    this.subscribers.forEach((fn) => fn(entry));

    return entry;
  }

  public static trace(component: string, message: string, accountId?: string | null, jobId?: string | null, metadata?: any): ActivityLogEntry {
    return this.log('TRACE', component, message, accountId, jobId, metadata);
  }

  public static debug(component: string, message: string, accountId?: string | null, jobId?: string | null, metadata?: any): ActivityLogEntry {
    return this.log('DEBUG', component, message, accountId, jobId, metadata);
  }

  public static info(component: string, message: string, accountId?: string | null, jobId?: string | null, metadata?: any): ActivityLogEntry {
    return this.log('INFO', component, message, accountId, jobId, metadata);
  }

  public static success(component: string, message: string, accountId?: string | null, jobId?: string | null, metadata?: any): ActivityLogEntry {
    return this.log('SUCCESS', component, message, accountId, jobId, metadata);
  }

  public static warn(component: string, message: string, accountId?: string | null, jobId?: string | null, metadata?: any): ActivityLogEntry {
    return this.log('WARNING', component, message, accountId, jobId, metadata);
  }

  public static error(component: string, message: string, accountId?: string | null, jobId?: string | null, metadata?: any): ActivityLogEntry {
    return this.log('ERROR', component, message, accountId, jobId, metadata);
  }

  public static critical(component: string, message: string, accountId?: string | null, jobId?: string | null, metadata?: any): ActivityLogEntry {
    return this.log('CRITICAL', component, message, accountId, jobId, metadata);
  }

  public static subscribe(fn: (log: ActivityLogEntry) => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
}
