import { ipcMain } from 'electron';
import { GroqProvider } from '../providers/GroqProvider';

export function registerGroqIpc(): void {
  ipcMain.handle('groq:decomposePrompt', async (_event, prompt: string, numShots?: number) => {
    return GroqProvider.decomposePrompt(prompt, numShots || 4);
  });
}
