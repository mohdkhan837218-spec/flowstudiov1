import { create } from 'zustand';
import { Job, WorkerSession, QueueSummary } from '../../shared/types/job';

interface QueueState {
  jobs: Job[];
  workers: WorkerSession[];
  summary: QueueSummary;
  isLoading: boolean;
  selectedProjectId: string | 'ALL';

  loadQueue: () => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  pauseQueue: () => Promise<void>;
  resumeQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
  processQueue: () => Promise<void>;
  updateJobLocally: (job: Job) => void;
  updateWorkerLocally: (worker: WorkerSession) => void;
  updateSummaryLocally: (summary: QueueSummary) => void;
  setSelectedProjectId: (projectId: string | 'ALL') => void;
}

const defaultSummary: QueueSummary = {
  totalJobs: 0,
  queued: 0,
  waiting: 0,
  running: 0,
  completed: 0,
  failed: 0,
  activeWorkers: 0,
  isPaused: false,
  concurrencyLimit: 3,
  waitingReason: null
};

export const useQueueStore = create<QueueState>((set, get) => ({
  jobs: [],
  workers: [],
  summary: defaultSummary,
  isLoading: false,
  selectedProjectId: 'ALL',

  loadQueue: async () => {
    set({ isLoading: true });
    try {
      if (window.flowWorkspace) {
        const [jobs, workers, summary] = await Promise.all([
          window.flowWorkspace.jobs.list(),
          window.flowWorkspace.workers.list(),
          window.flowWorkspace.queue.getSummary()
        ]);
        set({ jobs, workers, summary, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  cancelJob: async (jobId: string) => {
    if (window.flowWorkspace) {
      await window.flowWorkspace.jobs.cancel(jobId);
    }
  },

  retryJob: async (jobId: string) => {
    if (window.flowWorkspace) {
      await window.flowWorkspace.jobs.retry(jobId);
    }
  },

  pauseQueue: async () => {
    if (window.flowWorkspace) {
      await window.flowWorkspace.queue.pause();
    }
  },

  resumeQueue: async () => {
    if (window.flowWorkspace) {
      await window.flowWorkspace.queue.resume();
    }
  },

  clearQueue: async () => {
    if (window.flowWorkspace) {
      await window.flowWorkspace.queue.clear();
      get().loadQueue();
    }
  },

  processQueue: async () => {
    if (window.flowWorkspace) {
      await window.flowWorkspace.queue.process();
      get().loadQueue();
    }
  },

  updateJobLocally: (job: Job) => {
    set((state) => {
      const exists = state.jobs.some((j) => j.jobId === job.jobId);
      if (exists) {
        return { jobs: state.jobs.map((j) => (j.jobId === job.jobId ? job : j)) };
      } else {
        return { jobs: [job, ...state.jobs] };
      }
    });
  },

  updateWorkerLocally: (worker: WorkerSession) => {
    set((state) => {
      const exists = state.workers.some((w) => w.workerId === worker.workerId);
      if (exists) {
        return { workers: state.workers.map((w) => (w.workerId === worker.workerId ? worker : w)) };
      } else {
        return { workers: [...state.workers, worker] };
      }
    });
  },

  updateSummaryLocally: (summary: QueueSummary) => set({ summary }),
  setSelectedProjectId: (selectedProjectId: string | 'ALL') => set({ selectedProjectId })
}));
