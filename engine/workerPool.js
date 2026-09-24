const { FlowAutomationEngine } = require('./flowAutomation');
const { getAccounts, saveAccounts } = require('./accountStore');
const { FFmpegService } = require('./ffmpegService');
const { dbService } = require('./db');
const { recordRuntimeError } = require('./diagnosticsService');
const path = require('path');
const fs = require('fs');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class WorkerPool {
  constructor(options = {}) {
    this.concurrency = Math.max(1, Math.min(5, Number(options.concurrency) || 1));
    this.headless = !!options.headless;
    this.onLog = options.onLog || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.onWorkerUpdate = options.onWorkerUpdate || (() => {});
    this.onVideoStarted = options.onVideoStarted || (() => {});
    this.onVideoProgress = options.onVideoProgress || (() => {});
    this.onVideoCompleted = options.onVideoCompleted || (() => {});
    this.onAccountUpdated = options.onAccountUpdated || (() => {});

    this.isStopping = false;
    this.isPaused = false;
    this.activeWorkers = new Map(); // workerId -> FlowAutomationEngine
    this.assignedAccounts = new Set(); // accountId currently in use
    this.queuePromise = null;
    this.currentBatchId = null;
  }

  log(msg, type = 'info', extra = {}) {
    this.onLog({ message: msg, type, timestamp: new Date().toLocaleTimeString(), ...extra });
  }

  pause() {
    this.isPaused = true;
    for (const [wId, engine] of this.activeWorkers.entries()) {
      engine.pause();
    }
    this.log('⏸️ Multi-Worker Queue PAUSED.', 'warn');
  }

  resume() {
    this.isPaused = false;
    for (const [wId, engine] of this.activeWorkers.entries()) {
      engine.resume();
    }
    this.log('▶️ Multi-Worker Queue RESUMED.', 'success');
  }

  async stop() {
    this.isStopping = true;
    this.isPaused = false;
    const engines = [...this.activeWorkers.values()];
    for (const engine of engines) {
      engine.stop();
    }
    await Promise.all(engines.map(engine => engine.closeBrowser().catch(() => {})));
    if (this.queuePromise) {
      await Promise.race([
        this.queuePromise.catch(() => {}),
        sleep(6000)
      ]);
    }
    this.activeWorkers.clear();
    this.assignedAccounts.clear();
    this.log('🛑 Multi-Worker Queue STOPPED by user.', 'warn');
  }

  async runQueue(prompts, settings = {}, downloadFolder = '', selectedAccounts = []) {
    let queueResolver;
    this.queuePromise = new Promise(resolve => { queueResolver = resolve; });

    try {
      this.isStopping = false;
      this.isPaused = false;
      this.activeWorkers.clear();
      this.assignedAccounts.clear();

      const all = getAccounts();
      let validPool = [];
      if (selectedAccounts && selectedAccounts.length > 0) {
        validPool = selectedAccounts.map(sa => all.find(a => a.id === sa.id) || sa);
      } else {
        validPool = all.filter(a => a.selected);
      }
      const isImageMode = (settings.type === 'Image');
      selectedAccounts = validPool.filter(a => {
        if (a.status === 'Need Login') return false;
        if (isImageMode) return true;
        return a.status !== 'Exhausted' && (Number(a.credits) > 0 || a.status === 'Ready');
      });

      if (selectedAccounts.length === 0) {
        this.log('❌ No ready Google accounts found in pool (All accounts need login or are exhausted). Please open Settings to login with an active Google account.', 'error');
        this.onProgress({ status: 'Exhausted' });
        return;
      }

      const batchId = `batch_${Date.now()}`;
      this.currentBatchId = batchId;
      const pendingTasks = dbService.createBatchTasks(batchId, prompts, settings);

      const actualWorkersCount = Math.min(this.concurrency, selectedAccounts.length, pendingTasks.length);
      this.log(`🚀 Starting V2 Concurrent Queue: ${pendingTasks.length} tasks across ${actualWorkersCount} parallel workers (Concurrency: ${this.concurrency}x, Headless: ${this.headless ? 'ON' : 'OFF'})...`, 'info');

      // Thread-safe FIFO task queue
      const taskQueue = [...pendingTasks];
      const allCompletedMedia = [];

    // Worker Runner function
    const runWorker = async (workerIndex) => {
      const workerId = `worker_${workerIndex + 1}`;
      let workerAccount = null;

      // Calculate required credits for current generation mode
      const initialReqCredits = (settings.type === 'Image') ? 0 : 10;

      // Find initial available account with sufficient credits
      workerAccount = this._findNextAvailableAccount(selectedAccounts, initialReqCredits);

      if (!workerAccount) {
        this.log(`Worker #${workerIndex + 1}: No free Google account with remaining credits available to bind.`, 'warn');
        return;
      }
      this.assignedAccounts.add(workerAccount.id);

      const engine = new FlowAutomationEngine({
        onLog: (data) => {
          this.onLog({ ...data, workerId, message: `[Worker #${workerIndex + 1} (${workerAccount.name})]: ${data.message}` });
        },
        onProgress: (p) => {
          this.onWorkerUpdate({ workerId, workerIndex, accountName: workerAccount.name, ...p });
        },
        onVideoStarted: (data) => {
          this.onVideoStarted({ ...data, workerId, accountName: workerAccount.name });
        },
        onVideoProgress: (data) => {
          this.onVideoProgress({ ...data, workerId });
        },
        onVideoCompleted: (data) => {
          this.onVideoCompleted({ ...data, workerId, accountName: workerAccount.name });
          allCompletedMedia.push(data);
        },
        onAccountUpdated: (data) => {
          this.onAccountUpdated(data);
        }
      }, {
        headless: this.headless,
        workerId
      });

      this.activeWorkers.set(workerId, engine);

      try {
        const activeWorkerTasks = [];
        const maxBurstConcurrency = Math.min(4, Math.max(1, Number(settings.burstConcurrency) || 4));

        // Outer loop: process prompts until queue is empty and activeWorkerTasks is empty
        while ((taskQueue.length > 0 || activeWorkerTasks.length > 0) && !this.isStopping) {
          while (this.isPaused && !this.isStopping) {
            await sleep(1000);
          }
          if (this.isStopping) break;

          // Check if worker account has enough credits for next video (only when no tasks are currently active in the window)
          const requiredCredits = engine.getRequiredCredits ? engine.getRequiredCredits(settings) : (settings.type === 'Image' ? 0 : 10);
          const currentCredits = Number(workerAccount.credits);
          if (activeWorkerTasks.length === 0 && settings.type !== 'Image' && typeof workerAccount.credits === 'number' && workerAccount.credits < requiredCredits) {
            this.log(`Worker #${workerIndex + 1}: Account [${workerAccount.name}] has only ${workerAccount.credits} credits remaining (requires ${requiredCredits}). Switching to next ready account...`, 'warn');
            workerAccount.status = 'Exhausted';
            dbService.updateAccountStatus(workerAccount.id, 'Exhausted', workerAccount.credits);
            try {
              const all = getAccounts();
              const t = all.find(a => a.id === workerAccount.id);
              if (t) { t.status = 'Exhausted'; saveAccounts(all); }
            } catch (e) {}
            this.onAccountUpdated({ account: workerAccount, accounts: getAccounts() });
            await engine.closeBrowser();
            this.assignedAccounts.delete(workerAccount.id);
            workerAccount = this._findNextAvailableAccount(selectedAccounts, requiredCredits);
            if (!workerAccount) {
              this.log(`Worker #${workerIndex + 1}: No other accounts with at least ${requiredCredits} credits available. Worker stopping.`, 'warn');
              break;
            }
            this.assignedAccounts.add(workerAccount.id);
            continue;
          }

          // Check if worker needs browser launch
          if (!engine.browser || !engine.page || engine.page.isClosed()) {
            const launched = await engine.launchBrowserForAccount(workerAccount, downloadFolder);
            if (!launched) {
              this.log(`Worker #${workerIndex + 1} launch failed for [${workerAccount.name}]. Rotating account...`, 'warn');
              this.assignedAccounts.delete(workerAccount.id);
              workerAccount = this._findNextAvailableAccount(selectedAccounts);
              if (!workerAccount) break;
              this.assignedAccounts.add(workerAccount.id);
              continue;
            }

            const status = await engine.openFlowStudio(settings);
            if (status !== 'READY') {
              if (status === 'NEED_LOGIN') {
                this.log(`Worker #${workerIndex + 1}: Account [${workerAccount.name}] requires 1-time Google Login. Please click "Sign In" on the card in Accounts tab. Rotating to next account...`, 'warn');
                workerAccount.status = 'Need Login';
                dbService.updateAccountStatus(workerAccount.id, 'Need Login', workerAccount.credits);
              } else {
                this.log(`Worker #${workerIndex + 1} studio status: ${status} for [${workerAccount.name}]. Rotating to next available account...`, 'warn');
                workerAccount.status = 'Exhausted';
                workerAccount.credits = 0;
                dbService.updateAccountStatus(workerAccount.id, 'Exhausted', 0);
              }
              try {
                const all = getAccounts();
                const t = all.find(a => a.id === workerAccount.id);
                if (t) { t.status = workerAccount.status; t.credits = workerAccount.credits; saveAccounts(all); }
              } catch (e) {}
              this.onAccountUpdated({ account: workerAccount, accounts: getAccounts() });
              await engine.closeBrowser();
              this.assignedAccounts.delete(workerAccount.id);
              workerAccount = this._findNextAvailableAccount(selectedAccounts);
              if (!workerAccount) {
                this.log(`Worker #${workerIndex + 1}: No other accounts with credits available. Worker stopping.`, 'warn');
                break;
              }
              this.assignedAccounts.add(workerAccount.id);
              continue;
            }
          }

          // 1. BURST SUBMIT: Fill sliding window up to maxBurstConcurrency (4 concurrent generations)
          while (activeWorkerTasks.length < maxBurstConcurrency && taskQueue.length > 0 && !this.isStopping && !this.isPaused) {
            // Check credits before grabbing each task
            if (settings.type !== 'Image' && typeof workerAccount.credits === 'number' && workerAccount.credits < requiredCredits) {
              this.log(`Worker #${workerIndex + 1}: Account [${workerAccount.name}] has insufficient credits for next video (${workerAccount.credits} credits). Holding new submissions on this account...`, 'warn');
              break;
            }

            // Atomically grab next task from head of queue
            const currentTask = taskQueue.shift();
            if (!currentTask) break;

            const currentIdx = (currentTask.prompt_index !== undefined) ? currentTask.prompt_index : (currentTask.promptIndex || 0);

            dbService.updateTaskProgress(currentTask.id, 'running', workerAccount.id, workerAccount.name);
            this.onProgress({
              currentPromptIndex: currentIdx + 1,
              totalPrompts: pendingTasks.length,
              currentProfileName: workerAccount.name,
              activePromptText: currentTask.prompt_text,
              status: `Running (${activeWorkerTasks.length + 1}/${maxBurstConcurrency})`
            });

            this.log(`Worker #${workerIndex + 1}: 🚀 [Burst Concurrency] Submitting Prompt #${currentIdx + 1} (Slot ${activeWorkerTasks.length + 1}/${maxBurstConcurrency})...`, 'info');

            // Submit prompt through engine
            const submitRes = await engine.submitPrompt(
              currentTask.prompt_text,
              settings,
              currentIdx,
              pendingTasks.length
            );

            if (submitRes.status === 'EXHAUSTED') {
              this.log(`Worker #${workerIndex + 1}: Account [${workerAccount.name}] ran out of required credits (${workerAccount.credits || 0} Credits remaining)!`, 'warn');
              workerAccount.status = 'Exhausted';
              dbService.updateAccountStatus(workerAccount.id, 'Exhausted', workerAccount.credits || 0);
              try {
                const all = getAccounts();
                const t = all.find(a => a.id === workerAccount.id);
                if (t) { t.status = 'Exhausted'; saveAccounts(all); }
              } catch (e) {}
              this.onAccountUpdated({ account: workerAccount, accounts: getAccounts() });

              // Re-insert task to the front so next available account processes it
              taskQueue.unshift(currentTask);
              break;
            }

            if (submitRes.status === 'VIOLATION') {
              this.log(`Worker #${workerIndex + 1}: Prompt #${currentIdx + 1} skipped due to Google Policy Violation. Advancing immediately to next prompt in queue...`, 'warn');
              try {
                dbService.failTask(currentTask.id, submitRes.reason || 'Safety / Policy Violation');
              } catch (dbErr) {}
              recordRuntimeError({
                stage: 'Safety Violation',
                message: submitRes.reason || 'Google Safety Policy filter rejected prompt content',
                accountName: workerAccount ? workerAccount.name : 'Unknown',
                accountEmail: workerAccount ? workerAccount.email : 'N/A',
                promptText: currentTask.prompt_text,
                suggestion: 'Rephrase the prompt to avoid sensitive words or imagery flagged by Google safety filters.'
              });
              continue;
            }

            if (submitRes.status === 'SUBMITTED') {
              submitRes.taskId = currentTask.id;
              activeWorkerTasks.push(submitRes);

              // Natural burst interval (2.5s) between rapid prompts if window not full yet
              if (activeWorkerTasks.length < maxBurstConcurrency && taskQueue.length > 0 && !this.isStopping) {
                this.log(`Worker #${workerIndex + 1}: ⏳ [Burst Concurrency] Slot ${activeWorkerTasks.length}/${maxBurstConcurrency} filled. Submitting next burst prompt in 2.5s...`, 'info');
                await sleep(2500);
              }
            }
          }

          // 2. SLIDING WINDOW WAIT & MONITOR:
          if (activeWorkerTasks.length > 0 && !this.isStopping) {
            const isWindowFull = (activeWorkerTasks.length >= maxBurstConcurrency);
            const returnOnAny = (taskQueue.length > 0);

            if (isWindowFull && taskQueue.length > 0) {
              this.log(`Worker #${workerIndex + 1}: 🛡️ [Window Full: ${activeWorkerTasks.length}/${maxBurstConcurrency}] All 4 slots rendering in parallel. Holding new submissions until at least 1 video completes...`, 'info');
            }

            // Wait for any task in window to complete and download
            await engine.waitForAccountTasks(activeWorkerTasks, downloadFolder, settings, returnOnAny);

            const completedInWindow = activeWorkerTasks.filter(t => t.completed || t.downloaded);
            const remaining = activeWorkerTasks.filter(t => !t.completed && !t.downloaded);
            activeWorkerTasks.length = 0;
            activeWorkerTasks.push(...remaining);

            if (completedInWindow.length > 0 && taskQueue.length > 0) {
              this.log(`Worker #${workerIndex + 1}: ✨ [Sliding Window] Video finished & downloaded! ${activeWorkerTasks.length}/${maxBurstConcurrency} slots active. Immediately refilling window with next prompt...`, 'success');
            }

            // Check if any task failed due to Unusual Activity / Google Cooldown
            const cooldownTask = completedInWindow.find(t => t.completed && t.status && t.status.includes('Unusual Activity'));
            if (cooldownTask && activeWorkerTasks.length === 0) {
              const otherAccounts = selectedAccounts.filter(a => a.id !== workerAccount.id && a.status === 'Ready' && Number(a.credits) > 0);
              if (otherAccounts.length > 0) {
                this.log(`Worker #${workerIndex + 1}: Account [${workerAccount.name}] hit Google cooldown. Setting Cooldown status and switching to next available account...`, 'warn');
                workerAccount.status = 'Cooldown';
                await engine.closeBrowser();
                this.assignedAccounts.delete(workerAccount.id);
                workerAccount = this._findNextAvailableAccount(selectedAccounts);
                if (workerAccount) {
                  this.assignedAccounts.add(workerAccount.id);
                  continue;
                }
              }
            }
          }

          // 3. MULTI-ACCOUNT ROTATION (when window has drained)
          if (activeWorkerTasks.length === 0 && settings.rotateEveryPrompt === true) {
            const alternateAccounts = selectedAccounts.filter(a =>
              a.id !== workerAccount.id &&
              !this.assignedAccounts.has(a.id) &&
              a.status === 'Ready' &&
              (typeof a.credits !== 'number' || a.credits >= requiredCredits)
            );
            if (alternateAccounts.length > 0 && taskQueue.length > 0 && !this.isStopping) {
              this.log(`Worker #${workerIndex + 1}: Rotating to next available Google account [${alternateAccounts[0].name}] (${alternateAccounts[0].credits} credits) for balanced prompt distribution...`, 'info');
              await engine.closeBrowser();
              this.assignedAccounts.delete(workerAccount.id);
              workerAccount = alternateAccounts[0];
              this.assignedAccounts.add(workerAccount.id);
            }
          }

          // Prompt interval delay between bursts on this worker if requested
          const delaySec = Number(settings.promptDelaySec) || 0;
          if (delaySec > 0 && activeWorkerTasks.length === 0 && taskQueue.length > 0 && !this.isStopping) {
            this.log(`Worker #${workerIndex + 1}: Waiting prompt interval delay of ${delaySec}s before next burst...`, 'info');
            await sleep(delaySec * 1000);
          }
        }
      } catch (err) {
        this.log(`Worker #${workerIndex + 1} error: ${err.message}`, 'error');
        recordRuntimeError({
          stage: 'Worker Execution',
          message: err.message,
          stack: err.stack,
          accountName: workerAccount ? workerAccount.name : 'Unknown',
          accountEmail: workerAccount ? workerAccount.email : 'N/A',
          promptText: currentTask ? currentTask.prompt_text : 'N/A'
        });
      } finally {
        await engine.closeBrowser();
        if (workerAccount) this.assignedAccounts.delete(workerAccount.id);
        this.activeWorkers.delete(workerId);
        this.onWorkerUpdate({ workerId, workerIndex, status: 'Idle' });
      }
    };

    // Spawn concurrent workers
    const workerPromises = [];
    for (let i = 0; i < actualWorkersCount; i++) {
      workerPromises.push(runWorker(i));
    }

      await Promise.all(workerPromises);

      if (this.isStopping) {
        if (batchId) {
          try {
            dbService.run("UPDATE queue_tasks SET status = 'cancelled' WHERE batch_id = ? AND status = 'running'", [batchId]);
          } catch (e) {}
        }
        this.onProgress({ status: 'Stopped' });
        this.log(`🛑 Parallel worker queue stopped. Media generated: ${allCompletedMedia.length}`, 'warn');
      } else {
        this.onProgress({ status: 'Completed' });
        this.log(`\n🎉 All parallel worker queues completed! Total media generated: ${allCompletedMedia.length}`, 'success');
      }
    } finally {
      if (queueResolver) queueResolver();
      this.queuePromise = null;
    }
  }

  _findNextAvailableAccount(selectedAccounts, requiredCredits = 10) {
    const all = getAccounts();
    for (const acc of selectedAccounts) {
      const live = all.find(a => a.id === acc.id) || acc;
      if (this.assignedAccounts.has(acc.id)) continue;
      if (live.status === 'Exhausted' || live.status === 'Need Login' || live.status === 'Cooldown') continue;
      if (acc.status === 'Exhausted' || acc.status === 'Need Login' || acc.status === 'Cooldown') continue;

      const credits = (typeof live.credits === 'number') ? live.credits : (typeof acc.credits === 'number' ? acc.credits : null);
      if (credits !== null && credits < requiredCredits) {
        continue;
      }
      return acc;
    }
    return null;
  }
}

module.exports = { WorkerPool };
