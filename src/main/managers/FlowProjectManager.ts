import { Page } from 'playwright';
import { AppDatabase } from '../database/db';
import { FlowProjectRecord } from '../../shared/types/job';
import { FlowWorkspaceInspector } from '../providers/FlowWorkspaceInspector';
import { FlowComposerController } from '../providers/FlowComposerController';
import { Logger } from '../logging/logger';
import { FlowProvider } from '../providers/FlowProvider';
import { GenerationWorkspaceResolver } from '../providers/GenerationWorkspaceResolver';

export class FlowProjectManager {
  private static projectLocks = new Map<string, string>(); // flowProjectId -> workerId

  /**
   * Generates a clean, safe Flow project name.
   */
  public static generateProjectName(applicationProjectName?: string): string {
    const raw = applicationProjectName || 'Direct Prompt';
    const sanitized = raw.replace(/[<>:"/\\|?*]/g, '').trim().substring(0, 40);
    const dateStr = new Date().toISOString().substring(0, 10);
    return `FLOW AUTO — ${sanitized} — ${dateStr}`;
  }

  /**
   * Acquires an atomic lock on a Flow project for a specific worker.
   */
  public static lockProject(flowProjectId: string, workerId: string): boolean {
    const currentWorker = this.projectLocks.get(flowProjectId);
    if (currentWorker && currentWorker !== workerId) {
      Logger.warn('FlowProjectManager', `Flow project ${flowProjectId} is currently locked by ${currentWorker}`);
      return false;
    }
    this.projectLocks.set(flowProjectId, workerId);
    return true;
  }

  /**
   * Releases an atomic lock on a Flow project.
   */
  public static releaseProject(flowProjectId: string): void {
    this.projectLocks.delete(flowProjectId);
  }

  /**
   * Ensures an active, verified Google Flow project workspace exists for the application project.
   * If an existing project is found and accessible, it is reused. Otherwise, a new project is created automatically.
   */
  public static async ensureProject(
    page: Page,
    accountId: string,
    applicationProjectId: string,
    applicationProjectName: string,
    workerId: string
  ): Promise<{ success: boolean; record?: FlowProjectRecord; error?: string }> {
    Logger.info(
      'FlowProjectManager',
      `[FLOW PROJECT] Ensuring workspace for account ${accountId} (App Project: ${applicationProjectId} - ${applicationProjectName})`,
      accountId
    );

    // 1. Check if a Flow Project is already registered for this Application Project & Account
    const existing = AppDatabase.getFlowProjectForApp(applicationProjectId, accountId);
    if (existing && existing.flowProjectUrl) {
      Logger.info(
        'FlowProjectManager',
        `[FLOW PROJECT] Found existing registered Flow project ${existing.flowProjectId} (${existing.flowProjectUrl}). Verifying workspace...`,
        accountId
      );

      const isValid = await this.verifyExistingProject(page, existing.flowProjectUrl);
      if (isValid) {
        this.lockProject(existing.flowProjectId, workerId);
        existing.lastUsedAt = new Date().toISOString();
        AppDatabase.saveFlowProject(existing);
        return { success: true, record: existing };
      } else {
        Logger.warn(
          'FlowProjectManager',
          `[FLOW PROJECT] Existing Flow project ${existing.flowProjectId} is no longer accessible. Creating new project...`,
          accountId
        );
      }
    }

    // 2. Create a new Google Flow project automatically
    return await this.createNewProject(page, accountId, applicationProjectId, applicationProjectName, workerId);
  }

  /**
   * Sanitizes project URLs so sub-routes like /characters or /scenes are never stored.
   */
  public static cleanProjectUrl(url: string): string {
    if (!url) return url;
    return url.replace(/(?<=\/project\/[^/?#]+)\/(characters|scenes|tools|videos)(\/.*)?$/i, '');
  }

  /**
   * Navigates to an existing project URL and verifies that the generation composer is ready.
   */
  private static async verifyExistingProject(page: Page, projectUrl: string, accountId?: string): Promise<boolean> {
    try {
      const sanitizedUrl = this.cleanProjectUrl(projectUrl);
      const currentUrl = page.url();
      if (!currentUrl.includes(sanitizedUrl) || GenerationWorkspaceResolver.isWrongRoute(currentUrl).isWrong) {
        await page.goto(sanitizedUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(1500);
      }

      // Check workspace via GenerationWorkspaceResolver
      const workspaceRes = await GenerationWorkspaceResolver.findGenerationWorkspace(page, 'VIDEO', {
        timeoutMs: 8000,
        allowRecovery: true,
        accountId
      });

      return workspaceRes.found && !workspaceRes.isWrongRoute;
    } catch {
      return false;
    }
  }

  /**
   * Automatically executes the New Project creation sequence on Google Flow.
   */
  public static async createNewProject(
    page: Page,
    accountId: string,
    applicationProjectId: string,
    applicationProjectName: string,
    workerId: string
  ): Promise<{ success: boolean; record?: FlowProjectRecord; error?: string }> {
    const flowHomeUrl = FlowProvider.getFlowUrl();
    const projectName = this.generateProjectName(applicationProjectName);

    Logger.info('FlowProjectManager', `[FLOW PROJECT] Creating new Flow Project: "${projectName}"`, accountId);

    try {
      // 1. Ensure we are on Flow Home or a valid Flow URL
      const currentUrl = page.url();
      if (!currentUrl.includes('labs.google') && !currentUrl.includes('flow')) {
        await page.goto(flowHomeUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(1500);
      }

      // 2. Use FlowWorkspaceInspector to trigger New Project creation
      const creationResult = await FlowWorkspaceInspector.openNewProject(page, accountId);
      if (!creationResult.success) {
        return {
          success: false,
          error: creationResult.error || 'Failed to create new Flow project from home page'
        };
      }

      // 3. Verify that the Project Generation Workspace is present using GenerationWorkspaceResolver
      const workspaceRes = await GenerationWorkspaceResolver.findGenerationWorkspace(page, 'VIDEO', {
        timeoutMs: 12000,
        allowRecovery: true,
        accountId
      });

      if (!workspaceRes.found || workspaceRes.isWrongRoute) {
        return {
          success: false,
          error: workspaceRes.error || 'New Project opened but Generation Workspace controls were not verified'
        };
      }

      // 4. Capture current URL and generate stable ID (sanitized of any sub-route)
      const rawUrl = page.url();
      const sanitizedUrl = this.cleanProjectUrl(rawUrl);
      const urlMatch = sanitizedUrl.match(/project\/([a-zA-Z0-9_-]+)/i);
      const flowProjectId = urlMatch ? urlMatch[1] : `flow_proj_${Math.random().toString(36).substring(2, 9)}`;

      const now = new Date().toISOString();
      const record: FlowProjectRecord = {
        flowProjectId,
        applicationProjectId,
        accountId,
        flowProjectName: projectName,
        flowProjectUrl: sanitizedUrl,
        flowProjectStatus: 'READY',
        createdAt: now,
        lastUsedAt: now
      };

      AppDatabase.saveFlowProject(record);
      this.lockProject(flowProjectId, workerId);

      Logger.success(
        'FlowProjectManager',
        `[FLOW PROJECT] Successfully created and verified Flow project workspace: ${flowProjectId} (${sanitizedUrl})`,
        accountId
      );

      return { success: true, record };
    } catch (err: any) {
      Logger.error('FlowProjectManager', `Error creating new Flow project: ${err.message}`, accountId, null, { error: String(err) });
      return { success: false, error: err.message };
    }
  }
}
