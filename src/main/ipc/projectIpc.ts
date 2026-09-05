import { ipcMain } from 'electron';
import { JobManager } from '../managers/JobManager';
import { CreateProjectInput } from '../../shared/types/project';

export function registerProjectIpc(): void {
  ipcMain.handle('projects:list', async () => {
    return JobManager.listProjects();
  });

  ipcMain.handle('projects:get', async (_event, id: string) => {
    return JobManager.getProject(id);
  });

  ipcMain.handle('projects:create', async (_event, input: CreateProjectInput) => {
    return JobManager.createProject(input);
  });

  ipcMain.handle('projects:delete', async (_event, id: string) => {
    const success = JobManager.deleteProject(id);
    return { success };
  });

  ipcMain.handle('projects:enqueue', async (_event, projectId: string) => {
    return JobManager.enqueueProjectShots(projectId);
  });
}
