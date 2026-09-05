import { create } from 'zustand';
import { Project, CreateProjectInput, ShotPlanItem } from '../../shared/types/project';

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  isDecomposing: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  deleteProject: (id: string) => Promise<{ success: boolean }>;
  enqueueProject: (id: string) => Promise<{ success: boolean; jobsCount: number }>;
  decomposeWithGroq: (prompt: string, numShots?: number) => Promise<{
    projectName: string;
    description: string;
    shots: ShotPlanItem[];
  }>;
  updateProjectLocally: (project: Project) => void;
  removeProjectLocally: (id: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  isDecomposing: false,
  error: null,

  loadProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      if (window.flowWorkspace) {
        const projects = await window.flowWorkspace.projects.list();
        set({ projects, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed loading projects', isLoading: false });
    }
  },

  createProject: async (input: CreateProjectInput) => {
    if (!window.flowWorkspace) throw new Error('API bridge not ready');
    const newProj = await window.flowWorkspace.projects.create(input);
    set((state) => ({ projects: [newProj, ...state.projects] }));
    return newProj;
  },

  deleteProject: async (id: string) => {
    if (!window.flowWorkspace) return { success: false };
    const res = await window.flowWorkspace.projects.delete(id);
    if (res.success) {
      set((state) => ({ projects: state.projects.filter((p) => p.id !== id) }));
    }
    return res;
  },

  enqueueProject: async (id: string) => {
    if (!window.flowWorkspace) return { success: false, jobsCount: 0 };
    const res = await window.flowWorkspace.projects.enqueue(id);
    if (res.success) {
      get().loadProjects();
    }
    return res;
  },

  decomposeWithGroq: async (prompt: string, numShots = 4) => {
    set({ isDecomposing: true, error: null });
    try {
      if (!window.flowWorkspace) throw new Error('API bridge not ready');
      const plan = await window.flowWorkspace.groq.decomposePrompt(prompt, numShots);
      set({ isDecomposing: false });
      return plan;
    } catch (err: any) {
      set({ isDecomposing: false, error: err.message });
      throw err;
    }
  },

  updateProjectLocally: (project: Project) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === project.id ? project : p))
    }));
  },

  removeProjectLocally: (id: string) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id)
    }));
  }
}));
