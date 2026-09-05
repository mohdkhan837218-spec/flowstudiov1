import { contextBridge } from 'electron';
import { flowWorkspaceAPI } from './api';

// Safely expose the typed flowWorkspace API
try {
  contextBridge.exposeInMainWorld('flowWorkspace', flowWorkspaceAPI);
} catch (error) {
  console.error('Failed to expose flowWorkspace in main world:', error);
}
