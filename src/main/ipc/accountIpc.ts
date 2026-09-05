import { ipcMain } from 'electron';
import { AccountManager } from '../managers/AccountManager';
import { CreateAccountInput } from '../../shared/types/account';

export function registerAccountIpc(): void {
  ipcMain.handle('accounts:list', async () => {
    return AccountManager.listAccounts();
  });

  ipcMain.handle('accounts:get', async (_event, id: string) => {
    return AccountManager.getAccount(id);
  });

  ipcMain.handle('accounts:create', async (_event, input: CreateAccountInput) => {
    return AccountManager.createAccount(input);
  });

  ipcMain.handle('accounts:connect', async (_event, id: string) => {
    return AccountManager.connectAccount(id);
  });

  ipcMain.handle('accounts:open', async (_event, id: string) => {
    return AccountManager.openProfile(id);
  });

  ipcMain.handle('accounts:close', async (_event, id: string) => {
    return AccountManager.closeProfile(id);
  });

  ipcMain.handle('accounts:pause', async (_event, id: string) => {
    return AccountManager.pauseAccount(id);
  });

  ipcMain.handle('accounts:resume', async (_event, id: string) => {
    return AccountManager.resumeAccount(id);
  });

  ipcMain.handle('accounts:remove', async (_event, id: string) => {
    return AccountManager.removeAccount(id);
  });

  ipcMain.handle('accounts:openFlow', async (_event, id: string) => {
    return AccountManager.openFlow(id);
  });

  ipcMain.handle('accounts:checkFlow', async (_event, id: string) => {
    return AccountManager.checkFlow(id);
  });

  ipcMain.handle('accounts:getStatus', async (_event, id: string) => {
    const account = AccountManager.getAccount(id);
    if (!account) {
      throw new Error(`Account not found: ${id}`);
    }
    return {
      status: account.status,
      browserStatus: account.browserStatus,
      flowStatus: account.flowStatus
    };
  });
}
