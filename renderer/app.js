// DOM Elements - Navigation & Views
const tabBtnStudio = document.getElementById('tabBtnStudio');
const tabBtnGallery = document.getElementById('tabBtnGallery');
const tabBtnImageGallery = document.getElementById('tabBtnImageGallery');
const tabBtnHistory = document.getElementById('tabBtnHistory');
const tabBtnLogs = document.getElementById('tabBtnLogs');
const navGalleryBadge = document.getElementById('navGalleryBadge');
const navImageGalleryBadge = document.getElementById('navImageGalleryBadge');
const navHistoryBadge = document.getElementById('navHistoryBadge');
const pageTitle = document.getElementById('pageTitle');

const viewStudio = document.getElementById('viewStudio');
const viewGallery = document.getElementById('viewGallery');
const viewImageGallery = document.getElementById('viewImageGallery');
const viewHistory = document.getElementById('viewHistory');
const viewLogs = document.getElementById('viewLogs');

const videoGalleryContainer = document.getElementById('videoGalleryContainer');
const galleryCountBadge = document.getElementById('galleryCountBadge');
const galleryEmptyState = document.getElementById('galleryEmptyState');

const imageGalleryContainer = document.getElementById('imageGalleryContainer');
const imageGalleryCountBadge = document.getElementById('imageGalleryCountBadge');
const imageGalleryEmptyState = document.getElementById('imageGalleryEmptyState');
const btnOpenImageDownloadFolder = document.getElementById('btnOpenImageDownloadFolder');

// DOM Elements - Image Lightbox Modal
const imageLightboxModalBackdrop = document.getElementById('imageLightboxModalBackdrop');
const btnCloseImageLightbox = document.getElementById('btnCloseImageLightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxPromptText = document.getElementById('lightboxPromptText');
const btnLightboxCopyPrompt = document.getElementById('btnLightboxCopyPrompt');
const btnLightboxOpenFolder = document.getElementById('btnLightboxOpenFolder');
const btnLightboxRerun = document.getElementById('btnLightboxRerun');
const imageLightboxModelTag = document.getElementById('imageLightboxModelTag');
const imageLightboxRatioTag = document.getElementById('imageLightboxRatioTag');

// DOM Elements - Generation History
const historyTableBody = document.getElementById('historyTableBody');
const historyEmptyState = document.getElementById('historyEmptyState');
const inputSearchHistory = document.getElementById('inputSearchHistory');
const btnSyncHistory = document.getElementById('btnSyncHistory');
const btnExportHistory = document.getElementById('btnExportHistory');
const btnClearHistory = document.getElementById('btnClearHistory');

// DOM Elements - Video Player Modal
const videoPlayerModalBackdrop = document.getElementById('videoPlayerModalBackdrop');
const btnCloseVideoPlayer = document.getElementById('btnCloseVideoPlayer');
const modalVideoPlayer = document.getElementById('modalVideoPlayer');
const playerPromptText = document.getElementById('playerPromptText');
const btnPlayerOpenFolder = document.getElementById('btnPlayerOpenFolder');
const btnPlayerCopyPrompt = document.getElementById('btnPlayerCopyPrompt');
const btnPlayerRerun = document.getElementById('btnPlayerRerun');

// DOM Elements - Settings Modal & Triggers
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnQuickEditSettings = document.getElementById('btnQuickEditSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const btnSaveSettingsModal = document.getElementById('btnSaveSettingsModal');
const settingsModalBackdrop = document.getElementById('settingsModalBackdrop');

const accountsListContainer = document.getElementById('accountsListContainer');
const btnAddAccount = document.getElementById('btnAddAccount');

const inputDownloadFolder = document.getElementById('inputDownloadFolder');
const btnBrowseFolder = document.getElementById('btnBrowseFolder');
const btnOpenDownloadFolder = document.getElementById('btnOpenDownloadFolder');
const btnClearLogs = document.getElementById('btnClearLogs');
const terminalLogs = document.getElementById('terminalLogs');

// Interactive Quick Controls on Studio Main Bar
const quickSelectModel = document.getElementById('quickSelectModel');
const quickDurationGroup = document.getElementById('quickDurationGroup');
const quickRatioGroup = document.getElementById('quickRatioGroup');
const quickSelectQuality = document.getElementById('quickSelectQuality');

const historyCardsGridContainer = document.getElementById('historyCardsGridContainer');
const historyTableWrapper = document.getElementById('historyTableWrapper');

// DOM Elements - Mode Switcher & Attachments
const btnModeVideo = document.getElementById('btnModeVideo');
const btnModeImage = document.getElementById('btnModeImage');
const videoSubmodeGroup = document.getElementById('videoSubmodeGroup');
const btnSubmodeText = document.getElementById('btnSubmodeText');
const btnSubmodeIngredients = document.getElementById('btnSubmodeIngredients');
const btnSubmodeFrames = document.getElementById('btnSubmodeFrames');

const ingredientsAttachmentBox = document.getElementById('ingredientsAttachmentBox');
const btnPickRefImage = document.getElementById('btnPickRefImage');
const refImagePreviewArea = document.getElementById('refImagePreviewArea');
const refImageThumbnail = document.getElementById('refImageThumbnail');
const refImageFileName = document.getElementById('refImageFileName');
const btnRemoveRefImage = document.getElementById('btnRemoveRefImage');

const framesAttachmentBox = document.getElementById('framesAttachmentBox');
const btnPickStartFrame = document.getElementById('btnPickStartFrame');
const startFrameThumbnail = document.getElementById('startFrameThumbnail');
const btnPickEndFrame = document.getElementById('btnPickEndFrame');
const endFrameThumbnail = document.getElementById('endFrameThumbnail');

// DOM Elements - Studio & Queue
const promptInput = document.getElementById('promptInput');
const promptCountBadge = document.getElementById('promptCountBadge');
const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');

const globalStatusBadge = document.getElementById('globalStatusBadge');
const globalStatusText = document.getElementById('globalStatusText');
const activeProfileIndicator = document.getElementById('activeProfileIndicator');
const progressBarFill = document.getElementById('progressBarFill');
const progressStepText = document.getElementById('progressStepText');
const progressPercentText = document.getElementById('progressPercentText');
const currentTaskTitle = document.getElementById('currentTaskTitle');
const currentTaskDetail = document.getElementById('currentTaskDetail');
const taskSpinner = document.getElementById('taskSpinner');

// State
let accounts = [];
let isRunning = false;
let historyViewMode = 'cards'; // 'cards' | 'table'
let currentSelectedModel = 'Omni Flash';
let currentSelectedDuration = '6s';
let currentSelectedAspect = '9:16';
let currentSelectedQuality = '1080p';
let currentOutputsCount = 1;
let videoCardsMap = new Map();
let generationHistory = JSON.parse(localStorage.getItem('flow_gen_history') || '[]');
let currentActiveModalVideo = null;

// Generation Mode State
let currentType = 'Video'; // 'Video' | 'Image'
let currentVideoMode = 'Text'; // 'Text' | 'Ingredients' | 'Frames'
let referenceImagePath = null;
let batchReferenceImages = [];
let startFramePath = null;
let endFramePath = null;
let currentPromptDelaySec = 45;
let currentDownloadStrategy = 'instant';
let currentNamingPattern = 'scene';
let currentCustomNamingPrefix = 'scene';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}



function setupModeSwitcher() {
  const durationContainer = document.getElementById('quickDurationContainer');

  // Mode Switch (Video vs Image)
  btnModeVideo.addEventListener('click', () => {
    currentType = 'Video';
    btnModeVideo.classList.add('active');
    btnModeImage.classList.remove('active');
    videoSubmodeGroup.style.display = 'flex';
    if (durationContainer) durationContainer.style.display = 'flex';
    
    // Populate Video Models & Qualities
    if (quickSelectModel) {
      quickSelectModel.innerHTML = `
        <option value="Omni Flash" selected>⚡ Omni Flash</option>
        <option value="Veo 3.1 - Lite">🎥 Veo 3.1 - Lite</option>
        <option value="Veo 3.1 - Fast">🎬 Veo 3.1 - Fast</option>
        <option value="Veo 3.1 - Quality">🌟 Veo 3.1 - Quality</option>
      `;
      currentSelectedModel = 'Omni Flash';
    }
    if (quickSelectQuality) {
      quickSelectQuality.innerHTML = `
        <option value="1080p" selected>1080p (Upscaled / Full HD)</option>
        <option value="720p">720p (Original / Fast)</option>
        <option value="2k">2K (Upscaled)</option>
        <option value="4k">4K (Ultra HD)</option>
      `;
      currentSelectedQuality = '1080p';
    }
    const activeModeBadge = document.getElementById('activeModeBadge');
    if (activeModeBadge) {
      activeModeBadge.innerText = 'Video Mode';
      activeModeBadge.style.color = '#38bdf8';
      activeModeBadge.style.background = 'rgba(56, 189, 248, 0.15)';
    }
    updateSubmodeVisibility();
  });

  if (btnModeImage) {
    btnModeImage.addEventListener('click', () => {
      currentType = 'Image';
      btnModeImage.classList.add('active');
      btnModeVideo.classList.remove('active');
      videoSubmodeGroup.style.display = 'none';
      ingredientsAttachmentBox.style.display = 'none';
      framesAttachmentBox.style.display = 'none';
      if (durationContainer) durationContainer.style.display = 'none';

      const activeModeBadge = document.getElementById('activeModeBadge');
      if (activeModeBadge) {
        activeModeBadge.innerText = 'Image Mode (Nano Banana)';
        activeModeBadge.style.color = '#34d399';
        activeModeBadge.style.background = 'rgba(52, 211, 153, 0.15)';
      }

      // Populate Image Models & Qualities
      if (quickSelectModel) {
        quickSelectModel.innerHTML = `
          <option value="Nano Banana Pro" selected>🍌 Nano Banana Pro</option>
          <option value="Nano Banana 2">🍌 Nano Banana 2</option>
          <option value="Nano Banana 2 Lite">🍌 Nano Banana 2 Lite</option>
        `;
        currentSelectedModel = 'Nano Banana Pro';
      }
      if (quickSelectQuality) {
        quickSelectQuality.innerHTML = `
          <option value="2K" selected>2K (Upscaled Master)</option>
          <option value="1K">1K (Original size)</option>
          <option value="4K">4K (Ultra HD)</option>
        `;
        currentSelectedQuality = '2K';
      }
    });
  }

  // Sub-mode Switch (Text vs Ingredients vs Frames)
  const subBtns = [
    { btn: btnSubmodeText, mode: 'Text' },
    { btn: btnSubmodeIngredients, mode: 'Ingredients' },
    { btn: btnSubmodeFrames, mode: 'Frames' }
  ];

  subBtns.forEach(({ btn, mode }) => {
    btn.addEventListener('click', () => {
      subBtns.forEach(s => s.btn.classList.remove('active'));
      btn.classList.add('active');
      currentVideoMode = mode;
      updateSubmodeVisibility();
      updateQuickLabels();
    });
  });

  // Image & Frame Attachment Pickers
  const naturalSort = (arr) => {
    return arr.sort((a, b) => {
      const nameA = a.split(/[\\/]/).pop();
      const nameB = b.split(/[\\/]/).pop();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });
  };

  const renderMultiImageGrid = () => {
    const multiRefImagesGrid = document.getElementById('multiRefImagesGrid');
    const refAutoPairingBanner = document.getElementById('refAutoPairingBanner');
    const btnClearAllRefImages = document.getElementById('btnClearAllRefImages');
    if (!multiRefImagesGrid) return;
    multiRefImagesGrid.innerHTML = '';

    if (batchReferenceImages.length === 0) {
      multiRefImagesGrid.style.display = 'none';
      if (refAutoPairingBanner) refAutoPairingBanner.style.display = 'none';
      if (btnClearAllRefImages) btnClearAllRefImages.style.display = 'none';
      if (refImagePreviewArea) refImagePreviewArea.style.display = 'none';
      referenceImagePath = null;
      return;
    }

    if (batchReferenceImages.length === 1) {
      referenceImagePath = batchReferenceImages[0];
      if (refImageThumbnail) refImageThumbnail.src = 'file:///' + referenceImagePath.replace(/\\/g, '/');
      if (refImageFileName) refImageFileName.innerText = referenceImagePath.split(/[\\/]/).pop();
      if (refImagePreviewArea) refImagePreviewArea.style.display = 'flex';
      multiRefImagesGrid.style.display = 'none';
      if (refAutoPairingBanner) refAutoPairingBanner.style.display = 'none';
      if (btnClearAllRefImages) btnClearAllRefImages.style.display = 'inline-block';
      return;
    }

    if (refImagePreviewArea) refImagePreviewArea.style.display = 'none';
    multiRefImagesGrid.style.display = 'flex';
    if (btnClearAllRefImages) btnClearAllRefImages.style.display = 'inline-block';
    if (refAutoPairingBanner) {
      refAutoPairingBanner.style.display = 'block';
      const promptCount = getPromptsList().length;
      refAutoPairingBanner.innerHTML = `
        ⚡ <strong>1-to-1 Pairing Active:</strong> ${promptCount} Prompts will automatically match with ${batchReferenceImages.length} sequentially sorted Reference Images!
      `;
    }

    batchReferenceImages.forEach((imgSrc, idx) => {
      const fileName = imgSrc.split(/[\\/]/).pop();
      const chip = document.createElement('div');
      chip.className = 'multi-ref-chip';
      chip.style = 'position: relative; display: flex; align-items: center; gap: 6px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 4px 8px;';
      chip.innerHTML = `
        <span style="font-size: 11px; font-weight: 700; color: #38bdf8; background: rgba(56, 189, 248, 0.2); padding: 2px 6px; border-radius: 4px;">#${idx + 1}</span>
        <img src="file:///${imgSrc.replace(/\\/g, '/')}" style="width: 28px; height: 28px; object-fit: cover; border-radius: 4px;">
        <span style="font-size: 11px; color: #cbd5e1; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fileName}</span>
        <button type="button" class="btn-remove-single-ref" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 12px; padding: 0 2px;">✕</button>
      `;

      chip.querySelector('.btn-remove-single-ref').onclick = () => {
        batchReferenceImages.splice(idx, 1);
        renderMultiImageGrid();
      };
      multiRefImagesGrid.appendChild(chip);
    });
  };

  const btnPickRefImage = document.getElementById('btnPickRefImage');
  const btnPickMultiRefImages = document.getElementById('btnPickMultiRefImages');
  const btnClearAllRefImages = document.getElementById('btnClearAllRefImages');

  if (btnPickRefImage) {
    btnPickRefImage.addEventListener('click', async () => {
      if (window.api) {
        const selected = await window.api.selectImageFile();
        if (selected) {
          batchReferenceImages = [selected];
          referenceImagePath = selected;
          renderMultiImageGrid();
        }
      }
    });
  }

  if (btnPickMultiRefImages) {
    btnPickMultiRefImages.addEventListener('click', async () => {
      if (window.api) {
        const selectedList = await window.api.selectMultipleImages();
        if (selectedList && selectedList.length > 0) {
          batchReferenceImages = naturalSort([...selectedList]);
          referenceImagePath = batchReferenceImages[0];
          renderMultiImageGrid();
        }
      }
    });
  }

  if (btnClearAllRefImages) {
    btnClearAllRefImages.addEventListener('click', () => {
      batchReferenceImages = [];
      referenceImagePath = null;
      renderMultiImageGrid();
    });
  }

  if (btnRemoveRefImage) {
    btnRemoveRefImage.addEventListener('click', () => {
      batchReferenceImages = [];
      referenceImagePath = null;
      renderMultiImageGrid();
    });
  }

  if (btnPickStartFrame) {
    btnPickStartFrame.addEventListener('click', async () => {
      if (window.api) {
        const selected = await window.api.selectImageFile();
        if (selected) {
          startFramePath = selected;
          if (startFrameThumbnail) {
            startFrameThumbnail.src = 'file:///' + selected.replace(/\\/g, '/');
            startFrameThumbnail.style.display = 'block';
          }
          const emptyText = document.querySelector('#startFramePreviewArea .slot-empty-text');
          if (emptyText) emptyText.style.display = 'none';
        }
      }
    });
  }

  if (btnPickEndFrame) {
    btnPickEndFrame.addEventListener('click', async () => {
      if (window.api) {
        const selected = await window.api.selectImageFile();
        if (selected) {
          endFramePath = selected;
          if (endFrameThumbnail) {
            endFrameThumbnail.src = 'file:///' + selected.replace(/\\/g, '/');
            endFrameThumbnail.style.display = 'block';
          }
          const emptyText = document.querySelector('#endFramePreviewArea .slot-empty-text');
          if (emptyText) emptyText.style.display = 'none';
        }
      }
    });
  }
}

function updateSubmodeVisibility() {
  if (currentType === 'Image') {
    ingredientsAttachmentBox.style.display = 'none';
    framesAttachmentBox.style.display = 'none';
    return;
  }

  ingredientsAttachmentBox.style.display = (currentVideoMode === 'Ingredients') ? 'flex' : 'none';
  framesAttachmentBox.style.display = (currentVideoMode === 'Frames') ? 'block' : 'none';
}

function updateQuickLabels() {
  const quickType = document.getElementById('quickTypeLabel');
  const quickWorkflow = document.getElementById('quickWorkflowLabel');
  if (quickType) quickType.innerText = currentType;
  if (quickWorkflow) quickWorkflow.innerText = (currentType === 'Image') ? 'Image' : currentVideoMode;
}

// 📱 SIDEBAR NAVIGATION
function setupNavigation() {
  const tabs = [
    { btn: tabBtnStudio, view: viewStudio, title: 'Studio & Queue' },
    { btn: tabBtnGallery, view: viewGallery, title: '🎥 Live Video Gallery' },
    { btn: tabBtnImageGallery, view: viewImageGallery, title: '🖼️ Image Gallery & Showcase' },
    { btn: tabBtnHistory, view: viewHistory, title: 'Generation History' },
    { btn: tabBtnLogs, view: viewLogs, title: 'Real-time Execution Logs' }
  ];

  tabs.forEach(tab => {
    if (!tab.btn) return;
    tab.btn.addEventListener('click', () => {
      tabs.forEach(t => {
        if (t.btn) t.btn.classList.remove('active');
        if (t.view) t.view.classList.remove('active');
      });
      tab.btn.classList.add('active');
      if (tab.view) tab.view.classList.add('active');
      pageTitle.innerText = tab.title;

      if (tab.view === viewHistory) {
        syncHistoryFromFolder();
      } else if (tab.view === viewImageGallery) {
        syncImagesFromFolder();
      } else if (tab.view === viewGallery) {
        syncVideosFromFolder();
      }
    });
  });
}

// ⚙️ SETTINGS MODAL
function setupSettingsModal() {
  const openModal = async () => {
    settingsModalBackdrop.classList.add('open');
    if (window.api) {
      accounts = await window.api.getAccounts();
      renderAccounts();
    }
  };
  const closeModal = () => {
    settingsModalBackdrop.classList.remove('open');
    saveAccountsState();
  };

  if (btnOpenSettings) btnOpenSettings.addEventListener('click', openModal);
  if (btnQuickEditSettings) btnQuickEditSettings.addEventListener('click', openModal);
  if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeModal);
  if (btnSaveSettingsModal) btnSaveSettingsModal.addEventListener('click', closeModal);

  if (settingsModalBackdrop) {
    settingsModalBackdrop.addEventListener('click', (e) => {
      if (e.target === settingsModalBackdrop) closeModal();
    });
  }
}

// ⚡ INTERACTIVE DIRECT QUICK CONTROLS ON MAIN SCREEN
function setupInteractiveQuickControls() {
  const quickSelectModel = document.getElementById('quickSelectModel');
  const quickDurationGroup = document.getElementById('quickDurationGroup');
  const quickRatioGroup = document.getElementById('quickRatioGroup');
  const quickOutputsGroup = document.getElementById('quickOutputsGroup');
  const quickSelectQuality = document.getElementById('quickSelectQuality');

  // 1. Model Selector
  if (quickSelectModel) {
    quickSelectModel.addEventListener('change', () => {
      currentSelectedModel = quickSelectModel.value;
      const isOmni = currentSelectedModel.toLowerCase().includes('omni') || currentSelectedModel.toLowerCase().includes('flash');
      const isImage = currentType === 'Image';

      if (quickDurationGroup) {
        const chips = quickDurationGroup.querySelectorAll('.quick-chip');
        if (isImage) {
          quickDurationGroup.style.display = 'none';
        } else if (isOmni) {
          quickDurationGroup.style.display = 'flex';
          chips.forEach(c => {
            c.style.display = 'inline-flex';
          });
        } else {
          // For Veo models: Fixed 8s
          quickDurationGroup.style.display = 'flex';
          chips.forEach(c => {
            if (c.dataset.val === '8s') {
              c.classList.add('active');
              c.style.display = 'inline-flex';
              currentSelectedDuration = '8s';
            } else {
              c.classList.remove('active');
              c.style.display = 'none';
            }
          });
        }
      }
    });
  }

  // 2. Duration Selector Buttons (4s | 6s | 8s | 10s)
  if (quickDurationGroup) {
    const chips = quickDurationGroup.querySelectorAll('.quick-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentSelectedDuration = chip.dataset.val;
      });
    });
  }

  // 3. Aspect Ratio Selector Buttons (9:16 | 16:9 | 1:1 | 4:3 | 3:4)
  if (quickRatioGroup) {
    const chips = quickRatioGroup.querySelectorAll('.quick-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentSelectedAspect = chip.dataset.val;
      });
    });
  }

  // 4. Outputs Count Selector Buttons (x1 | x2 | x3 | x4)
  if (quickOutputsGroup) {
    const chips = quickOutputsGroup.querySelectorAll('.quick-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentOutputsCount = parseInt(chip.dataset.val, 10) || 1;
      });
    });
  }

  // 5. Quality Selector (720p | 1080p | 2k | 4k)
  if (quickSelectQuality) {
    quickSelectQuality.addEventListener('change', () => {
      currentSelectedQuality = quickSelectQuality.value;
    });
  }

  // 6. Prompt Interval Delay (0s | 30s | 45s | 50s | 60s | Custom)
  const quickDelayGroup = document.getElementById('quickDelayGroup');
  const inputCustomPromptDelay = document.getElementById('inputCustomPromptDelay');
  if (quickDelayGroup) {
    const chips = quickDelayGroup.querySelectorAll('.quick-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const val = chip.dataset.val;
        if (val === 'custom') {
          if (inputCustomPromptDelay) {
            inputCustomPromptDelay.style.display = 'inline-block';
            inputCustomPromptDelay.focus();
            currentPromptDelaySec = parseInt(inputCustomPromptDelay.value, 10) || 45;
          }
        } else {
          if (inputCustomPromptDelay) inputCustomPromptDelay.style.display = 'none';
          currentPromptDelaySec = parseInt(val, 10) || 0;
        }
      });
    });
  }
  if (inputCustomPromptDelay) {
    inputCustomPromptDelay.addEventListener('input', () => {
      currentPromptDelaySec = parseInt(inputCustomPromptDelay.value, 10) || 0;
    });
  }

  // 7. File Naming Pattern Selector & Live Preview
  const quickSelectNamingPattern = document.getElementById('quickSelectNamingPattern');
  const inputCustomNamingPrefix = document.getElementById('inputCustomNamingPrefix');
  const namingPreviewBadge = document.getElementById('namingPreviewBadge');

  const updateNamingPreview = () => {
    const pattern = quickSelectNamingPattern ? quickSelectNamingPattern.value : 'scene';
    const customPrefix = inputCustomNamingPrefix ? inputCustomNamingPrefix.value.trim() : 'scene';
    const ext = (currentType === 'Image') ? 'png' : 'mp4';

    if (pattern === 'custom') {
      if (inputCustomNamingPrefix) inputCustomNamingPrefix.style.display = 'inline-block';
      if (namingPreviewBadge) namingPreviewBadge.innerText = `${customPrefix || 'file'}1.${ext}`;
    } else {
      if (inputCustomNamingPrefix) inputCustomNamingPrefix.style.display = 'none';
      if (pattern === 'scene') namingPreviewBadge.innerText = `scene1.${ext}`;
      else if (pattern === 'numeric') namingPreviewBadge.innerText = `1.${ext}`;
      else if (pattern === 'clip') namingPreviewBadge.innerText = `clip1.${ext}`;
      else if (pattern === 'shot') namingPreviewBadge.innerText = `shot1.${ext}`;
      else if (pattern === 'video') namingPreviewBadge.innerText = (currentType === 'Image') ? `image1.png` : `video1.mp4`;
      else if (pattern === 'prompt') namingPreviewBadge.innerText = `174069..._neon_tokyo.${ext}`;
    }
  };

  if (quickSelectNamingPattern) {
    quickSelectNamingPattern.addEventListener('change', () => {
      currentNamingPattern = quickSelectNamingPattern.value;
      updateNamingPreview();
    });
  }
  if (inputCustomNamingPrefix) {
    inputCustomNamingPrefix.addEventListener('input', () => {
      currentCustomNamingPrefix = inputCustomNamingPrefix.value.trim();
      updateNamingPreview();
    });
  }

  // 8. Download Strategy
  const quickSelectDownloadStrategy = document.getElementById('quickSelectDownloadStrategy');
  if (quickSelectDownloadStrategy) {
    quickSelectDownloadStrategy.addEventListener('change', () => {
      currentDownloadStrategy = quickSelectDownloadStrategy.value;
    });
  }
}

async function loadDefaultDownloadFolder() {
  if (window.api) {
    const defaultPath = await window.api.getDefaultDownloadPath();
    inputDownloadFolder.value = defaultPath;
  }
}

async function loadAccounts() {
  if (!window.api) return;
  accountsListContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; padding: 10px;">Loading accounts...</div>';

  try {
    accounts = await window.api.getAccounts();
    renderAccounts();
  } catch (err) {
    accountsListContainer.innerHTML = `<div style="color: var(--danger); font-size: 12px; padding: 10px;">Error: ${err.message}</div>`;
  }
}

function updateTotalCreditsHeader() {
  const headerBadge = document.getElementById('headerTotalCreditsText');
  const activeProfileIndicator = document.getElementById('activeProfileIndicator');

  if (!accounts || accounts.length === 0) {
    if (headerBadge) headerBadge.innerText = '0 Credits';
    if (activeProfileIndicator) {
      activeProfileIndicator.innerText = 'No Profiles Added';
      activeProfileIndicator.style.background = 'rgba(239, 68, 68, 0.15)';
      activeProfileIndicator.style.color = '#f87171';
    }
    return;
  }

  const activeAccounts = accounts.filter(a => a.selected);
  let totalCredits = 0;
  let hasKnown = false;

  for (const a of activeAccounts) {
    if (typeof a.credits === 'number') {
      totalCredits += a.credits;
      hasKnown = true;
    }
  }

  if (headerBadge) {
    if (hasKnown) {
      headerBadge.innerText = `${totalCredits} Live Credits`;
    } else {
      headerBadge.innerText = `${activeAccounts.length} Active Accounts`;
    }
  }

  if (activeProfileIndicator) {
    if (activeAccounts.length === 0) {
      activeProfileIndicator.innerText = '⚠️ 0 Accounts Active (Enable in Settings)';
      activeProfileIndicator.style.background = 'rgba(234, 179, 8, 0.15)';
      activeProfileIndicator.style.color = '#facc15';
    } else if (activeAccounts.length === 1) {
      const single = activeAccounts[0];
      const name = single.googleName || single.name;
      activeProfileIndicator.innerText = `🟢 ${name} (${single.credits !== undefined ? single.credits : 0} Live Credits)`;
      activeProfileIndicator.style.background = 'rgba(34, 197, 94, 0.15)';
      activeProfileIndicator.style.color = '#4ade80';
    } else {
      activeProfileIndicator.innerText = `🟢 ${activeAccounts.length} Google Accounts Active (${totalCredits} Total Credits)`;
      activeProfileIndicator.style.background = 'rgba(56, 189, 248, 0.15)';
      activeProfileIndicator.style.color = '#38bdf8';
    }
  }
}

function renderAccounts() {
  accountsListContainer.innerHTML = '';
  updateTotalCreditsHeader();

  if (!accounts || accounts.length === 0) {
    accountsListContainer.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-muted);">
        <p style="margin-bottom: 12px;">No Google accounts added yet.</p>
        <button class="btn btn-sm btn-primary" id="btnEmptyAddAccount">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          + Add First Google Account
        </button>
      </div>
    `;
    const btnEmpty = document.getElementById('btnEmptyAddAccount');
    if (btnEmpty) {
      btnEmpty.addEventListener('click', handleAddNewAccount);
    }
    return;
  }

  accounts.forEach((account, idx) => {
    const card = document.createElement('div');
    const isLogged = !!account.email || account.status === 'Ready';
    const isExhausted = account.credits === 0 || account.status === 'Exhausted';
    
    let statusClass = 'not-logged';
    let statusBadgeText = '🟡 Not Logged In';
    let cardBorder = 'border-color: rgba(234, 179, 8, 0.3); background: rgba(234, 179, 8, 0.03);';

    if (isLogged) {
      if (isExhausted) {
        statusClass = 'exhausted';
        statusBadgeText = '🔴 Quota Exhausted (0 Credits)';
        cardBorder = 'border-color: rgba(239, 68, 68, 0.35); background: rgba(239, 68, 68, 0.04);';
      } else {
        statusClass = 'ready';
        statusBadgeText = `🟢 Connected (${account.googleName || 'Google User'})`;
        cardBorder = account.selected ? 'border-color: rgba(34, 197, 94, 0.45); background: rgba(34, 197, 94, 0.05);' : 'border-color: rgba(255, 255, 255, 0.1);';
      }
    }

    card.className = `account-card ${account.selected ? 'active' : ''} ${statusClass}`;
    card.style.cssText = cardBorder;
    
    const creditsDisplay = typeof account.credits === 'number' ? `${account.credits} Credits` : (isLogged ? '⚡ Click Sync' : '0 Credits');
    const emailBadge = account.email ? `<span style="font-size: 11px; color: #94a3b8; display: block; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">📧 ${account.email}</span>` : `<span style="font-size: 11px; color: #eab308; display: block;">⚠️ Click "Sign In" to connect Google ID</span>`;

    card.innerHTML = `
      <div class="account-left" style="gap: 14px; align-items: flex-start;">
        <input type="checkbox" class="account-checkbox" ${account.selected ? 'checked' : ''} title="Include in Auto-Rotation" style="margin-top: 4px; width: 16px; height: 16px; cursor: pointer;">
        <div class="account-details">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="account-name" title="Click to rename" style="cursor: pointer; font-weight: 700; font-size: 14px; color: var(--text-main);">${account.name}</span>
            <span class="account-status-tag ${statusClass}" style="font-size: 10px; padding: 2px 8px; border-radius: 12px;">${statusBadgeText}</span>
          </div>
          ${emailBadge}
          <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: ${isExhausted ? '#ef4444' : (isLogged ? '#4ade80' : '#94a3b8')}; background: rgba(0,0,0,0.3); padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
              ⚡ ${creditsDisplay}
            </span>
            <span style="font-size: 10px; color: var(--text-muted);">${account.lastChecked ? `Checked ${account.lastChecked}` : ''}</span>
          </div>
        </div>
      </div>
      <div class="account-actions" style="gap: 6px; align-items: center;">
        ${isLogged ? `
          <button class="btn btn-sm btn-secondary btn-sync-credits" title="Query live credits from Google Flow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Sync
          </button>
        ` : ''}
        <button class="btn btn-sm ${isLogged ? 'btn-secondary' : 'btn-primary'} btn-login" title="Open Chrome to sign in once">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
          ${isLogged ? 'Re-Login' : 'Sign In'}
        </button>
        <button class="btn-icon btn-delete" title="Delete Profile">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;

    // Checkbox toggle
    const checkbox = card.querySelector('.account-checkbox');
    checkbox.addEventListener('change', (e) => {
      account.selected = e.target.checked;
      card.classList.toggle('active', account.selected);
      saveAccountsState();
      updateTotalCreditsHeader();
    });

    // Rename on click
    const nameEl = card.querySelector('.account-name');
    nameEl.addEventListener('click', async () => {
      const newName = window.prompt(`Rename account:`, account.name);
      if (newName && newName.trim().length > 0) {
        account.name = newName.trim();
        renderAccounts();
        saveAccountsState();
      }
    });

    // Sync individual account real credits
    const btnSync = card.querySelector('.btn-sync-credits');
    if (btnSync) {
      btnSync.addEventListener('click', async () => {
        btnSync.disabled = true;
        btnSync.innerHTML = `<span class="spinner-small" style="width: 10px; height: 10px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span> Syncing...`;
        appendLog({ message: `Fetching real Google Flow credits for [${account.name}]...`, type: 'info' });
        
        if (window.api) {
          const res = await window.api.refreshAccountCredits(account.id);
          if (res.success && res.account) {
            appendLog({ message: `✓ [${account.name}] has ${res.account.credits} live remaining credits on Google Flow!`, type: 'success' });
            accounts = res.accounts;
            renderAccounts();
          } else {
            appendLog({ message: `Could not fetch credits for [${account.name}]: ${res.error || 'Please click Sign In first'}`, type: 'warn' });
            btnSync.disabled = false;
            btnSync.innerText = 'Sync';
          }
        }
      });
    }

    // Sign in Chrome window
    const btnLogin = card.querySelector('.btn-login');
    btnLogin.addEventListener('click', async () => {
      appendLog({ message: `Opening Chrome profile for [${account.name}]. Please sign in to Google...`, type: 'info' });
      if (window.api) {
        await window.api.openLoginWindow(account.id);
      }
    });

    // Delete
    const btnDelete = card.querySelector('.btn-delete');
    btnDelete.addEventListener('click', async () => {
      if (confirm(`Are you sure you want to remove "${account.name}"?`)) {
        if (window.api) {
          accounts = await window.api.deleteAccount(account.id);
          renderAccounts();
        }
      }
    });

    accountsListContainer.appendChild(card);
  });

  // Add Bottom Quick Action Bar
  const bottomBar = document.createElement('div');
  bottomBar.style.cssText = 'margin-top: 14px; display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--border-color);';
  bottomBar.innerHTML = `
    <span style="font-size: 11px; color: var(--text-muted);">${accounts.length} Google Profile${accounts.length === 1 ? '' : 's'} (${accounts.filter(a => a.selected).length} Active in Rotation)</span>
    <button class="btn btn-sm btn-primary" id="btnBottomAddAccount" style="gap: 6px;">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      + Add Another Account
    </button>
  `;
  accountsListContainer.appendChild(bottomBar);

  const btnBottomAdd = bottomBar.querySelector('#btnBottomAddAccount');
  if (btnBottomAdd) {
    btnBottomAdd.addEventListener('click', handleAddNewAccount);
  }
}

async function handleAddNewAccount() {
  if (!window.api) return;
  const nextNum = (accounts ? accounts.length : 0) + 1;
  const defaultName = `Google Account ${nextNum}`;
  accounts = await window.api.addAccount(defaultName);
  renderAccounts();
  appendLog({ message: `✓ Added new profile [${defaultName}]. Click "Sign In" on it to log in to Google once.`, type: 'success' });
}

async function saveAccountsState() {
  if (window.api) {
    await window.api.saveAccountsState(accounts);
  }
}

function updatePromptCount() {
  const lines = promptInput.value
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  promptCountBadge.innerText = `${lines.length} ${lines.length === 1 ? 'Prompt' : 'Prompts'}`;
}

function getPromptsList() {
  return promptInput.value
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

function appendLog(logData) {
  const time = logData.timestamp || new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry log-${logData.type || 'info'}`;
  entry.innerText = `[${time}] ${logData.message}`;
  
  terminalLogs.appendChild(entry);
  terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

// 🌟 CREATE LIVE RENDERING CARD IN GALLERY
function createRenderingVideoCard(data) {
  if (galleryEmptyState) {
    galleryEmptyState.style.display = 'none';
  }

  const ratioClass = (data.aspectRatio === '9:16') ? 'ratio-9-16' : 'ratio-16-9';
  const card = document.createElement('div');
  card.className = 'video-card rendering';
  card.id = data.id;
  const safePrompt = escapeHtml(data.prompt);
  const safeAccountName = escapeHtml(data.accountName);
  const safeDuration = escapeHtml(data.duration || '6s');
  const safeAspectRatio = escapeHtml(data.aspectRatio || '9:16');
  const safeTimestamp = escapeHtml(data.timestamp || '');

  card.innerHTML = `
    <div class="video-card-preview ${ratioClass}">
      <div class="rendering-placeholder">
        <div class="rendering-spinner-icon"></div>
        <div class="rendering-status-text" id="status_${data.id}">
          ⚡ Rendering with Veo... (6s)
        </div>
      </div>
    </div>
    <div class="video-card-body">
      <div class="video-card-prompt" title="${safePrompt}">${safePrompt}</div>
      <div class="video-card-meta">
        <span class="meta-tag rendering-tag" id="tag_${data.id}">Rendering...</span>
        <span class="meta-tag account">${safeAccountName}</span>
        <span class="meta-tag quality">${safeDuration} · ${safeAspectRatio}</span>
        <span class="meta-tag">${safeTimestamp}</span>
      </div>
      <div class="video-card-actions">
        <button class="btn btn-secondary" disabled style="opacity: 0.6; cursor: not-allowed;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Generating Video...
        </button>
      </div>
    </div>
  `;

  videoCardsMap.set(data.id, card);
  const countStr = `${videoCardsMap.size} Videos`;
  galleryCountBadge.innerText = countStr;
  navGalleryBadge.innerText = videoCardsMap.size;
  videoGalleryContainer.insertBefore(card, videoGalleryContainer.firstChild);
}

// 🌟 2-STAGE LIVE PROGRESS (GENERATION % -> EXPORT & DOWNLOAD)
function updateRenderingTick(progressData) {
  const statusEl = document.getElementById(`status_${progressData.id}`);
  const tagEl = document.getElementById(`tag_${progressData.id}`);

  if (progressData.stage === 'download' || progressData.statusText) {
    if (statusEl) {
      statusEl.innerHTML = `<span style="color: #38bdf8; font-weight: 700;">${progressData.statusText || '📥 Exporting & Downloading MP4...'}</span> (${progressData.elapsed}s)`;
    }
    if (tagEl) {
      tagEl.innerText = `📥 Downloading...`;
      tagEl.style.background = 'rgba(56, 189, 248, 0.15)';
      tagEl.style.borderColor = 'rgba(56, 189, 248, 0.4)';
      tagEl.style.color = '#38bdf8';
    }
  } else {
    if (statusEl) {
      statusEl.innerHTML = `⚡ Rendering with Veo... <span style="color: var(--primary); font-weight: 700;">${progressData.percentage || ''}</span> (${progressData.elapsed}s)`;
    }
    if (tagEl) {
      tagEl.innerText = `Rendering ${progressData.percentage || ''}`;
    }
  }
}

function normalizeMediaSrc(filePath, fallbackUrl = '') {
  if (filePath && typeof filePath === 'string') {
    return `local-video://${encodeURIComponent(filePath)}`;
  }
  return /^https?:\/\//i.test(fallbackUrl) ? fallbackUrl : '';
}

// Lightweight LRU Cache with Max 10 items to prevent RAM accumulation
const blobUrlCache = new Map();
const MAX_BLOB_CACHE = 10;

async function resolveMediaBlobUrl(filePath, fallbackUrl = '') {
  if (filePath && blobUrlCache.has(filePath)) {
    return blobUrlCache.get(filePath);
  }

  if (window.api && filePath) {
    try {
      const dataUrl = await window.api.readVideoDataUrl(filePath);
      if (dataUrl && dataUrl.length > 50) {
        if (blobUrlCache.size >= MAX_BLOB_CACHE) {
          const firstKey = blobUrlCache.keys().next().value;
          const oldVal = blobUrlCache.get(firstKey);
          if (oldVal && oldVal.startsWith('blob:')) URL.revokeObjectURL(oldVal);
          blobUrlCache.delete(firstKey);
        }
        blobUrlCache.set(filePath, dataUrl);
        return dataUrl;
      }
    } catch (e) {}

    try {
      const buffer = await window.api.readVideoBinary(filePath);
      if (buffer && (buffer.byteLength > 0 || buffer.length > 0)) {
        const mimeType = isImageFile(filePath) ? 'image/png' : 'video/mp4';
        const blob = new Blob([buffer], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        if (blobUrlCache.size >= MAX_BLOB_CACHE) {
          const firstKey = blobUrlCache.keys().next().value;
          const oldVal = blobUrlCache.get(firstKey);
          if (oldVal && oldVal.startsWith('blob:')) URL.revokeObjectURL(oldVal);
          blobUrlCache.delete(firstKey);
        }
        blobUrlCache.set(filePath, blobUrl);
        return blobUrl;
      }
    } catch (e) {}
  }

  return normalizeMediaSrc(filePath, fallbackUrl);
}

// 🌟 IMAGE & VIDEO GALLERY CARDS, SORTING & ROUTING
const imageCardsMap = new Map();
let currentVideoSort = 'newest'; // 'newest' | 'oldest' | 'sequence'
let currentImageSort = 'newest'; // 'newest' | 'oldest' | 'sequence'
let cachedDiskVideos = [];
let cachedDiskImages = [];

function isImageFile(filePath = '') {
  return /\.(png|jpe?g|webp|gif)$/i.test(filePath);
}

function sortMediaList(list, sortType) {
  if (!Array.isArray(list)) return [];
  const copied = [...list];
  if (sortType === 'newest') {
    return copied.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else if (sortType === 'oldest') {
    return copied.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  } else if (sortType === 'sequence') {
    return copied.sort((a, b) => {
      const aName = a.fileName || a.prompt || '';
      const bName = b.fileName || b.prompt || '';
      return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
    });
  }
  return copied;
}

function renderSortedVideos() {
  if (!videoGalleryContainer) return;
  const sorted = sortMediaList(cachedDiskVideos, currentVideoSort);
  videoGalleryContainer.innerHTML = '';
  videoCardsMap.clear();

  if (sorted.length === 0) {
    if (galleryEmptyState) galleryEmptyState.style.display = 'flex';
    if (galleryCountBadge) galleryCountBadge.innerText = '0 Videos';
    if (navGalleryBadge) navGalleryBadge.innerText = 0;
    return;
  }

  if (galleryEmptyState) galleryEmptyState.style.display = 'none';
  if (galleryCountBadge) galleryCountBadge.innerText = `${sorted.length} Videos`;
  if (navGalleryBadge) navGalleryBadge.innerText = sorted.length;

  for (const vid of sorted) {
    const cleanPrompt = vid.fileName
      .replace(/^\d+_/, '')
      .replace(/\.mp4$/, '')
      .replace(/_/g, ' ');

    renderCompletedVideoCard({
      id: 'vid_' + Math.random().toString(36).substring(2, 9),
      prompt: cleanPrompt || 'Generated Video',
      fileName: vid.fileName,
      filePath: vid.filePath,
      sizeMB: vid.sizeMB,
      timestamp: vid.timestamp,
      dateStr: vid.dateStr,
      duration: '8s',
      aspectRatio: '9:16',
      model: '⚡ Omni Flash'
    });
  }
}

function renderSortedImages() {
  if (!imageGalleryContainer) return;
  const sorted = sortMediaList(cachedDiskImages, currentImageSort);
  imageGalleryContainer.innerHTML = '';
  imageCardsMap.clear();

  if (sorted.length === 0) {
    if (imageGalleryEmptyState) imageGalleryEmptyState.style.display = 'flex';
    if (imageGalleryCountBadge) imageGalleryCountBadge.innerText = '0 Images';
    if (navImageGalleryBadge) navImageGalleryBadge.innerText = 0;
    return;
  }

  if (imageGalleryEmptyState) imageGalleryEmptyState.style.display = 'none';
  if (imageGalleryCountBadge) imageGalleryCountBadge.innerText = `${sorted.length} Images`;
  if (navImageGalleryBadge) navImageGalleryBadge.innerText = sorted.length;

  for (const img of sorted) {
    const cleanPrompt = img.fileName
      .replace(/^\d+_/, '')
      .replace(/\.(png|jpe?g|webp)$/i, '')
      .replace(/_/g, ' ');

    renderImageCard({
      id: 'img_' + Math.random().toString(36).substring(2, 9),
      prompt: cleanPrompt || 'Generated Image',
      fileName: img.fileName,
      filePath: img.filePath,
      sizeMB: img.sizeMB,
      timestamp: img.timestamp,
      dateStr: img.dateStr,
      quality: '2K',
      model: '🍌 Nano Banana Pro'
    });
  }
}

async function syncVideosFromFolder() {
  if (!window.api || !inputDownloadFolder.value) return;
  try {
    cachedDiskVideos = await window.api.scanDownloadFolder(inputDownloadFolder.value);
    renderSortedVideos();
  } catch (err) {
    console.error('Error syncing videos from folder:', err);
  }
}

async function syncImagesFromFolder() {
  if (!window.api || !inputDownloadFolder.value) return;
  try {
    cachedDiskImages = await window.api.scanImageFolder(inputDownloadFolder.value);
    renderSortedImages();
  } catch (err) {
    console.error('Error syncing images from folder:', err);
  }
}

function renderImageCard(data) {
  const card = document.createElement('div');
  card.className = 'video-card image-card-premium';
  card.id = data.id;

  const imgSrc = normalizeMediaSrc(data.filePath, data.videoUrl);
  const safePrompt = escapeHtml(data.prompt || 'Google Flow Image');
  const safeQuality = escapeHtml(data.quality || '2K');
  const safeTimestamp = escapeHtml(data.timestamp || 'Now');
  const safeSize = escapeHtml(data.sizeMB || '2K Master');

  card.innerHTML = `
    <div class="video-card-header">
      <span class="meta-tag" style="background: rgba(34, 197, 94, 0.15); color: #4ade80; border-color: rgba(34, 197, 94, 0.3);">✓ Ready Image</span>
      <span class="meta-tag">${safeQuality}</span>
      <span class="video-card-time">${safeTimestamp}</span>
    </div>
    
    <div class="video-card-preview ratio-9-16" style="cursor: pointer;" title="Click to open 2K Image Master Lightbox">
      <img src="${imgSrc}" loading="lazy" alt="${safePrompt}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">
    </div>
    
    <div class="video-card-body">
      <p class="video-card-prompt">${safePrompt}</p>
      <div class="video-card-meta">
        <span class="meta-tag">🍌 Nano Banana Pro</span>
        <span class="meta-tag">${safeSize}</span>
      </div>
      <div class="video-card-actions">
        <button class="btn btn-secondary btn-open-img-folder" style="font-size: 11px; padding: 5px 10px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          Open in Folder
        </button>
      </div>
    </div>
  `;

  // Asynchronously resolve local fallback if needed
  const imgEl = card.querySelector('img');
  if (imgEl && data.filePath) {
    imgEl.onerror = () => {
      resolveMediaBlobUrl(data.filePath, data.videoUrl).then(resolvedSrc => {
        if (resolvedSrc && imgEl) imgEl.src = resolvedSrc;
      }).catch(() => {});
    };
  }

  card.querySelector('.video-card-preview').onclick = () => openImageLightboxModal(data);
  const btnFolder = card.querySelector('.btn-open-img-folder');
  if (btnFolder) {
    btnFolder.onclick = (e) => {
      e.stopPropagation();
      if (window.api && inputDownloadFolder.value) {
        window.api.openFolder(inputDownloadFolder.value);
      }
    };
  }

  imageCardsMap.set(data.id, card);
  if (imageGalleryEmptyState) imageGalleryEmptyState.style.display = 'none';
  imageGalleryContainer.insertBefore(card, imageGalleryContainer.firstChild);

  if (imageGalleryCountBadge) imageGalleryCountBadge.innerText = `${imageCardsMap.size} Images`;
  if (navImageGalleryBadge) navImageGalleryBadge.innerText = imageCardsMap.size;
}

function renderCompletedVideoCard(data) {
  const card = document.createElement('div');
  card.className = 'video-card';
  card.id = data.id;

  const vidSrc = normalizeMediaSrc(data.filePath, data.videoUrl);
  const safePrompt = escapeHtml(data.prompt || 'Google Flow Video');
  const safeDuration = escapeHtml(data.duration || '8s');
  const safeTimestamp = escapeHtml(data.timestamp || 'Now');
  const safeModel = escapeHtml(data.model || '⚡ Omni Flash');
  const safeSize = escapeHtml(data.sizeMB || '1080p');

  card.innerHTML = `
    <div class="video-card-header">
      <span class="meta-tag completed-tag">✓ Ready Video</span>
      <span class="meta-tag">${safeDuration}</span>
      <span class="video-card-time">${safeTimestamp}</span>
    </div>
    
    <div class="video-card-preview ratio-9-16" style="cursor: pointer; position: relative;" title="Hover to play preview | Click to open Google Flow Cinema">
      <video preload="metadata" muted loop playsinline style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; background: #000;" src="${vidSrc}"></video>
      <div class="video-play-overlay" style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; opacity: 0.85; transition: opacity 0.2s ease;">
        <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.2);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
      </div>
    </div>
    
    <div class="video-card-body">
      <p class="video-card-prompt">${safePrompt}</p>
      <div class="video-card-meta">
        <span class="meta-tag">${safeModel}</span>
        <span class="meta-tag">${safeSize}</span>
      </div>
      <div class="video-card-actions">
        <button class="btn btn-secondary btn-open-card-folder" style="font-size: 11px; padding: 5px 10px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          Open in Folder
        </button>
      </div>
    </div>
  `;

  const previewBox = card.querySelector('.video-card-preview');
  const vidEl = card.querySelector('video');
  const overlay = card.querySelector('.video-play-overlay');

  // Lightweight Hover Preview: only active card decodes frames in GPU/RAM
  if (previewBox && vidEl) {
    previewBox.addEventListener('mouseenter', () => {
      if (overlay) overlay.style.opacity = '0';
      vidEl.play().catch(() => {});
    });
    previewBox.addEventListener('mouseleave', () => {
      if (overlay) overlay.style.opacity = '0.85';
      vidEl.pause();
      vidEl.currentTime = 0;
    });
  }

  // Fallback blob resolver if direct file streaming fails
  if (vidEl && data.filePath) {
    vidEl.onerror = () => {
      resolveMediaBlobUrl(data.filePath, data.videoUrl).then(resolvedSrc => {
        if (resolvedSrc && vidEl) vidEl.src = resolvedSrc;
      }).catch(() => {});
    };
  }

  card.querySelector('.video-card-preview').onclick = (e) => {
    e.stopPropagation();
    openVideoPreviewModal(data);
  };
  const btnFolder = card.querySelector('.btn-open-card-folder');
  if (btnFolder) {
    btnFolder.onclick = (e) => {
      e.stopPropagation();
      if (window.api && inputDownloadFolder.value) {
        window.api.openFolder(inputDownloadFolder.value);
      }
    };
  }

  videoCardsMap.set(data.id, card);
  if (galleryEmptyState) galleryEmptyState.style.display = 'none';
  videoGalleryContainer.insertBefore(card, videoGalleryContainer.firstChild);

  if (galleryCountBadge) galleryCountBadge.innerText = `${videoCardsMap.size} Videos`;
  if (navGalleryBadge) navGalleryBadge.innerText = videoCardsMap.size;
}

// 🌟 TRANSITION TO PLAYABLE VIDEO / IMAGE
async function completeVideoCard(videoData) {
  console.log('[completeVideoCard] Received completion:', videoData);

  // A policy rejection or failed local download must never be displayed as a
  // playable, successfully saved item.
  if (videoData.status === 'Filtered by Safety Policy' || videoData.status === 'Download failed') {
    const card = videoCardsMap.get(videoData.id) || document.getElementById(videoData.id);
    if (card) {
      card.classList.remove('rendering');
      card.classList.add('failed');
      const preview = card.querySelector('.video-card-preview');
      if (preview) {
        preview.innerHTML = `
          <div class="rendering-placeholder" role="status">
            <div style="font-size: 26px; margin-bottom: 8px;">⚠️</div>
            <div class="rendering-status-text">${videoData.status}</div>
          </div>
        `;
        preview.style.cursor = 'default';
        preview.onclick = null;
      }
      const tagEl = document.getElementById(`tag_${videoData.id}`);
      if (tagEl) {
        tagEl.className = 'meta-tag';
        tagEl.style.color = '#fca5a5';
        tagEl.style.borderColor = 'rgba(239, 68, 68, 0.45)';
        tagEl.style.background = 'rgba(239, 68, 68, 0.12)';
        tagEl.innerText = videoData.status;
      }
      const actions = card.querySelector('.video-card-actions');
      if (actions) actions.innerText = videoData.error || 'Generation did not produce a local media file.';
    }
    return;
  }

  // Auto-route based on Image vs Video
  if (isImageFile(videoData.filePath) || videoData.type === 'Image') {
    renderImageCard({
      id: videoData.id || 'img_' + Math.random().toString(36).substring(2, 9),
      prompt: videoData.prompt,
      fileName: videoData.fileName,
      filePath: videoData.filePath,
      sizeMB: videoData.sizeMB,
      timestamp: videoData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateStr: new Date().toLocaleDateString(),
      quality: '2K',
      model: videoData.model || '🍌 Nano Banana Pro'
    });
  } else {
    // 1️⃣ Update Gallery Card
    const card = videoCardsMap.get(videoData.id) || document.getElementById(videoData.id);
    if (card) {
      card.classList.remove('rendering');
      const ratioClass = (videoData.aspectRatio === '9:16') ? 'ratio-9-16' : 'ratio-16-9';
      const previewContainer = card.querySelector('.video-card-preview');

      if (previewContainer) {
        previewContainer.className = `video-card-preview ${ratioClass}`;
        const mediaSrc = await resolveMediaBlobUrl(videoData.filePath, videoData.videoUrl);
        previewContainer.innerHTML = `
          <video controls autoplay loop muted playsinline preload="auto" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; background: #000;" src="${mediaSrc}"></video>
        `;
        const vEl = previewContainer.querySelector('video');
        if (vEl) {
          vEl.play().catch(() => {});
        }

        previewContainer.style.cursor = 'pointer';
        previewContainer.title = 'Click to open Google Flow Cinema Preview';
        previewContainer.onclick = (e) => {
          e.stopPropagation();
          openVideoPreviewModal(videoData);
        };
      }

      const tagEl = document.getElementById(`tag_${videoData.id}`);
      if (tagEl) {
        tagEl.className = 'meta-tag completed-tag';
        tagEl.innerText = `✓ Ready (${videoData.elapsed || '30'}s)`;
      }

      const actionsContainer = card.querySelector('.video-card-actions');
      if (actionsContainer) {
        actionsContainer.innerHTML = `
          <button class="btn btn-secondary btn-open-card-folder">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            Open in Folder
          </button>
        `;

        const btnOpen = actionsContainer.querySelector('.btn-open-card-folder');
        if (btnOpen) {
          btnOpen.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.api && inputDownloadFolder.value) {
              window.api.openFolder(inputDownloadFolder.value);
            }
          });
        }
      }
    } else {
      renderCompletedVideoCard(videoData);
    }
  }

  // 2️⃣ Save to persistent generation history
  saveHistoryItem({
    prompt: videoData.prompt,
    accountName: videoData.accountName,
    duration: videoData.duration,
    aspectRatio: videoData.aspectRatio,
    quality: videoData.quality,
    elapsed: videoData.elapsed,
    filePath: videoData.filePath,
    videoUrl: videoData.videoUrl,
    type: isImageFile(videoData.filePath) ? 'Image' : 'Video',
    timestamp: videoData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    dateStr: new Date().toLocaleDateString()
  });
}

// 🎬 GOOGLE FLOW CINEMA PREVIEW MODAL
function setupVideoPlayerModal() {
  const closePlayer = () => {
    const vid = document.getElementById('modalVideoPlayer');
    if (vid) {
      vid.pause();
      vid.src = '';
    }
    if (videoPlayerModalBackdrop) videoPlayerModalBackdrop.classList.remove('open');
    currentActiveModalVideo = null;
  };

  if (btnCloseVideoPlayer) btnCloseVideoPlayer.addEventListener('click', closePlayer);
  if (videoPlayerModalBackdrop) {
    videoPlayerModalBackdrop.addEventListener('click', (e) => {
      if (e.target === videoPlayerModalBackdrop) closePlayer();
    });
  }

  // ESC key closes preview
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoPlayerModalBackdrop && videoPlayerModalBackdrop.classList.contains('open')) {
      closePlayer();
    }
  });

  if (btnPlayerOpenFolder) {
    btnPlayerOpenFolder.addEventListener('click', () => {
      if (window.api && inputDownloadFolder.value) {
        window.api.openFolder(inputDownloadFolder.value);
      }
    });
  }

  if (btnPlayerCopyPrompt) {
    btnPlayerCopyPrompt.addEventListener('click', () => {
      if (currentActiveModalVideo && currentActiveModalVideo.prompt) {
        navigator.clipboard.writeText(currentActiveModalVideo.prompt);
        btnPlayerCopyPrompt.innerText = '✓ Copied!';
        setTimeout(() => btnPlayerCopyPrompt.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy Prompt
        `, 1500);
      }
    });
  }

  if (btnPlayerRerun) {
    btnPlayerRerun.addEventListener('click', () => {
      if (currentActiveModalVideo && currentActiveModalVideo.prompt) {
        if (promptInput) promptInput.value = currentActiveModalVideo.prompt;
        updatePromptCount();
        closePlayer();
        if (tabBtnStudio) tabBtnStudio.click();
        if (promptInput) promptInput.focus();
      }
    });
  }
}

async function openVideoPreviewModal(item) {
  currentActiveModalVideo = item;
  playerPromptText.innerText = item.prompt || item.fileName || 'Google Flow Media';

  const cinemaModelTag = document.getElementById('cinemaModelTag');
  const cinemaRatioTag = document.getElementById('cinemaRatioTag');
  if (cinemaModelTag) cinemaModelTag.innerText = item.model || '⚡ Omni Flash';
  if (cinemaRatioTag) cinemaRatioTag.innerText = item.aspectRatio || '📱 9:16';

  const cinemaStage = document.getElementById('cinemaStage');
  const mediaSrc = await resolveMediaBlobUrl(item.filePath, item.videoUrl);

  if (cinemaStage && mediaSrc) {
    if (isImageFile(item.filePath) || item.type === 'Image') {
      cinemaStage.innerHTML = `<img src="${mediaSrc}" alt="Preview" style="max-height: 450px; max-width: 100%; border-radius: 12px; object-fit: contain;">`;
    } else {
      cinemaStage.innerHTML = `<video id="modalVideoPlayer" controls autoplay loop playsinline preload="auto" src="${mediaSrc}" style="max-height: 450px; max-width: 100%; border-radius: 12px; outline: none; background: #000;"></video>`;
      const vidEl = document.getElementById('modalVideoPlayer');
      if (vidEl) {
        vidEl.play().catch(() => {});
      }
    }
  }

  videoPlayerModalBackdrop.classList.add('open');
}

// 🖼️ 2K IMAGE MASTER LIGHTBOX MODAL LOGIC
let currentActiveLightboxImage = null;

function setupImageLightboxModal() {
  const closeLightbox = () => {
    if (imageLightboxModalBackdrop) imageLightboxModalBackdrop.classList.remove('open');
    currentActiveLightboxImage = null;
  };

  if (btnCloseImageLightbox) btnCloseImageLightbox.addEventListener('click', closeLightbox);
  if (imageLightboxModalBackdrop) {
    imageLightboxModalBackdrop.addEventListener('click', (e) => {
      if (e.target === imageLightboxModalBackdrop) closeLightbox();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && imageLightboxModalBackdrop && imageLightboxModalBackdrop.classList.contains('open')) {
      closeLightbox();
    }
  });

  if (btnLightboxOpenFolder) {
    btnLightboxOpenFolder.addEventListener('click', () => {
      if (window.api && inputDownloadFolder.value) {
        window.api.openFolder(inputDownloadFolder.value);
      }
    });
  }

  if (btnLightboxCopyPrompt) {
    btnLightboxCopyPrompt.addEventListener('click', () => {
      if (currentActiveLightboxImage && currentActiveLightboxImage.prompt) {
        navigator.clipboard.writeText(currentActiveLightboxImage.prompt);
        btnLightboxCopyPrompt.innerText = '✓ Copied!';
        setTimeout(() => btnLightboxCopyPrompt.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          Copy Prompt
        `, 1500);
      }
    });
  }

  if (btnLightboxRerun) {
    btnLightboxRerun.addEventListener('click', () => {
      if (currentActiveLightboxImage && currentActiveLightboxImage.prompt) {
        if (promptInput) promptInput.value = currentActiveLightboxImage.prompt;
        updatePromptCount();
        closeLightbox();
        if (tabBtnStudio) tabBtnStudio.click();
        if (promptInput) promptInput.focus();
      }
    });
  }

  if (btnOpenImageDownloadFolder) {
    btnOpenImageDownloadFolder.addEventListener('click', () => {
      if (window.api && inputDownloadFolder.value) {
        window.api.openFolder(inputDownloadFolder.value);
      }
    });
  }
}

async function openImageLightboxModal(item) {
  currentActiveLightboxImage = item;
  if (lightboxPromptText) lightboxPromptText.innerText = item.prompt || item.fileName || 'Google Flow 2K Image';
  if (imageLightboxModelTag) imageLightboxModelTag.innerText = item.model || '🍌 Nano Banana Pro';
  if (imageLightboxRatioTag) imageLightboxRatioTag.innerText = item.quality || '2K Upscaled';

  const mediaSrc = await resolveMediaBlobUrl(item.filePath, item.videoUrl);
  if (lightboxImage && mediaSrc) {
    lightboxImage.src = mediaSrc;
  }

  if (imageLightboxModalBackdrop) imageLightboxModalBackdrop.classList.add('open');
}

// 🕒 GENERATION HISTORY LOGIC
function setupHistoryView() {
  const btnCards = document.getElementById('btnHistoryViewCards');
  const btnTable = document.getElementById('btnHistoryViewTable');

  if (btnCards && btnTable) {
    btnCards.addEventListener('click', () => {
      historyViewMode = 'cards';
      btnCards.classList.add('active');
      btnTable.classList.remove('active');
      renderHistoryTable();
    });

    btnTable.addEventListener('click', () => {
      historyViewMode = 'table';
      btnTable.classList.add('active');
      btnCards.classList.remove('active');
      renderHistoryTable();
    });
  }

  if (inputSearchHistory) {
    inputSearchHistory.addEventListener('input', () => {
      renderHistoryTable(inputSearchHistory.value.trim().toLowerCase());
    });
  }

  if (btnSyncHistory) {
    btnSyncHistory.addEventListener('click', async () => {
      btnSyncHistory.disabled = true;
      btnSyncHistory.innerText = 'Syncing...';
      await syncHistoryFromFolder();
      btnSyncHistory.disabled = false;
      btnSyncHistory.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        Sync Folder
      `;
    });
  }

  if (btnExportHistory) btnExportHistory.addEventListener('click', exportHistoryToCSV);

  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
      if (confirm('Clear all generation history records? (Downloaded video files will not be deleted)')) {
        generationHistory = [];
        localStorage.setItem('flow_gen_history', JSON.stringify([]));
        renderHistoryTable();
      }
    });
  }
}

async function syncHistoryFromFolder() {
  if (!window.api || !inputDownloadFolder.value) return;

  try {
    const diskFiles = await window.api.scanDownloadFolder(inputDownloadFolder.value);
    
    for (const file of diskFiles) {
      const exists = generationHistory.some(h => h.filePath === file.filePath || (h.fileName && h.fileName === file.fileName));
      if (!exists) {
        const cleanPrompt = file.fileName
          .replace(/^\d+_/, '')
          .replace(/\.mp4$/, '')
          .replace(/_/g, ' ');

        generationHistory.push({
          prompt: cleanPrompt || 'Generated Video',
          fileName: file.fileName,
          filePath: file.filePath,
          accountName: 'Google Account 1',
          duration: '6s',
          aspectRatio: '9:16',
          sizeMB: file.sizeMB,
          elapsed: '50',
          timestamp: file.timestamp || 'Recent',
          dateStr: file.dateStr || ''
        });
      }
    }

    localStorage.setItem('flow_gen_history', JSON.stringify(generationHistory));
    renderHistoryTable();
  } catch (err) {
    console.error('Error syncing history from folder:', err);
  }
}

function saveHistoryItem(item) {
  const idx = generationHistory.findIndex(h => h.filePath && h.filePath === item.filePath);
  if (idx >= 0) {
    generationHistory[idx] = { ...generationHistory[idx], ...item };
  } else {
    generationHistory.unshift(item);
  }
  if (generationHistory.length > 500) generationHistory.pop();
  localStorage.setItem('flow_gen_history', JSON.stringify(generationHistory));
  renderHistoryTable();
}

function exportHistoryToCSV() {
  if (generationHistory.length === 0) {
    alert('No generation history records to export.');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,';
  csvContent += 'Index,Prompt,Account,Duration,AspectRatio,RenderTime,Size,Date,FilePath\n';

  generationHistory.forEach((h, i) => {
    const p = `"${(h.prompt || '').replace(/"/g, '""')}"`;
    const acc = `"${h.accountName || ''}"`;
    const dur = `"${h.duration || ''}"`;
    const asp = `"${h.aspectRatio || ''}"`;
    const ren = `"${h.elapsed || ''}s"`;
    const sz = `"${h.sizeMB || ''}"`;
    const dt = `"${h.timestamp || ''} ${h.dateStr || ''}"`;
    const fp = `"${(h.filePath || '').replace(/"/g, '""')}"`;
    csvContent += `${i + 1},${p},${acc},${dur},${asp},${ren},${sz},${dt},${fp}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `GoogleFlow_Generation_History_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function renderHistoryTable(searchTerm = '') {
  if (!historyTableBody || !historyCardsGridContainer) return;
  historyTableBody.innerHTML = '';
  historyCardsGridContainer.innerHTML = '';

  const filtered = generationHistory.filter(item => {
    if (!searchTerm) return true;
    return (item.prompt && item.prompt.toLowerCase().includes(searchTerm)) ||
           (item.fileName && item.fileName.toLowerCase().includes(searchTerm)) ||
           (item.accountName && item.accountName.toLowerCase().includes(searchTerm));
  });

  navHistoryBadge.innerText = generationHistory.length;

  if (filtered.length === 0) {
    historyEmptyState.style.display = 'flex';
    historyCardsGridContainer.style.display = 'none';
    historyTableWrapper.style.display = 'none';
    return;
  }

  historyEmptyState.style.display = 'none';

  if (historyViewMode === 'cards') {
    historyCardsGridContainer.style.display = 'grid';
    historyTableWrapper.style.display = 'none';

    filtered.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'history-card';
      const idNum = `#${generationHistory.length - index}`;
      const ratioClass = (item.aspectRatio === '9:16') ? 'ratio-9-16' : 'ratio-16-9';
      const isImg = isImageFile(item.filePath);

      card.innerHTML = `
        <div class="video-card-preview ${ratioClass}" style="cursor: pointer;" title="Click to open Cinema Preview">
          ${isImg ? `<img alt="${escapeHtml(item.prompt || 'Generated')}" style="width: 100%; height: 100%; object-fit: cover;">` : `<video controls loop muted playsinline preload="auto" style="width: 100%; height: 100%; object-fit: cover; background: #000;"></video>`}
        </div>
        <div class="history-card-body">
          <div class="history-card-header">
            <span class="history-id-badge">${idNum}</span>
            <span class="history-date-text">${escapeHtml(item.timestamp || '')}</span>
          </div>
          <div class="history-card-prompt" title="${escapeHtml(item.prompt || '')}">
            ${escapeHtml(item.prompt || '')}
          </div>
          <div class="history-card-tags">
            <span class="meta-tag account">${escapeHtml(item.accountName || 'Google Account 1')}</span>
            <span class="meta-tag quality">${escapeHtml(item.duration || '6s')} · ${escapeHtml(item.aspectRatio || '9:16')}</span>
            <span class="meta-tag completed-tag">✓ Ready</span>
          </div>
          <div class="history-card-actions">
            <button class="btn btn-secondary btn-history-rerun" title="Re-Run in Studio">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              Re-run
            </button>
            <button class="btn-icon btn-history-folder" title="Open Folder">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            </button>
            <button class="btn-icon btn-history-copy" title="Copy Prompt">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="btn-icon btn-history-delete" title="Delete">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;

      const previewCont = card.querySelector('.video-card-preview');
      const previewEl = previewCont ? previewCont.querySelector(isImg ? 'img' : 'video') : null;
      if (previewCont) {
        previewCont.addEventListener('click', () => openVideoPreviewModal(item));
      }
      resolveMediaBlobUrl(item.filePath, item.videoUrl).then(src => {
        if (previewEl && src) previewEl.src = src;
      });

      card.querySelector('.btn-history-rerun').addEventListener('click', () => {
        promptInput.value = item.prompt;
        updatePromptCount();
        tabBtnStudio.click();
        promptInput.focus();
      });
      card.querySelector('.btn-history-folder').addEventListener('click', () => {
        if (window.api && inputDownloadFolder.value) {
          window.api.openFolder(inputDownloadFolder.value);
        }
      });
      card.querySelector('.btn-history-copy').addEventListener('click', (e) => {
        navigator.clipboard.writeText(item.prompt);
        e.currentTarget.title = '✓ Copied!';
      });
      card.querySelector('.btn-history-delete').addEventListener('click', () => {
        if (confirm(`Remove "${item.prompt.substring(0, 30)}..." from history?`)) {
          generationHistory = generationHistory.filter(h => h !== item);
          localStorage.setItem('flow_gen_history', JSON.stringify(generationHistory));
          renderHistoryTable();
        }
      });

      historyCardsGridContainer.appendChild(card);
    });
  } else {
    historyCardsGridContainer.style.display = 'none';
    historyTableWrapper.style.display = 'block';

    filtered.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="color: var(--text-muted); font-size: 11px;">#${generationHistory.length - index}</td>
        <td class="history-prompt-cell">
          <div title="${escapeHtml(item.prompt || '')}"><strong>${escapeHtml(item.prompt || '')}</strong></div>
          <span class="history-subtext">${escapeHtml(item.timestamp || '')} ${item.dateStr ? '· ' + escapeHtml(item.dateStr) : ''}</span>
        </td>
        <td><span class="meta-tag account">${escapeHtml(item.accountName || 'Google Account 1')}</span></td>
        <td><span class="meta-tag quality">${escapeHtml(item.duration || '6s')} · ${escapeHtml(item.aspectRatio || '9:16')}</span></td>
        <td>
          <div style="color: var(--primary); font-weight: 600; font-size: 11px;">${escapeHtml(item.elapsed ? item.elapsed + 's render' : 'Ready')}</div>
          <div class="history-subtext">${escapeHtml(item.sizeMB || 'MP4 Video')}</div>
        </td>
        <td><span class="meta-tag completed-tag">✓ Completed</span></td>
        <td>
          <div class="history-actions-cell">
            <button class="btn btn-sm btn-primary btn-history-play" title="Play Video Preview">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              Play
            </button>
            <button class="btn btn-sm btn-secondary btn-history-rerun" title="Re-Run in Studio">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              Re-run
            </button>
            <button class="btn-icon btn-history-copy" title="Copy Prompt">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button class="btn-icon btn-history-delete" title="Delete from History">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-history-play').addEventListener('click', () => openVideoPreviewModal(item));
      tr.querySelector('.btn-history-rerun').addEventListener('click', () => {
        promptInput.value = item.prompt;
        updatePromptCount();
        tabBtnStudio.click();
        promptInput.focus();
      });
      tr.querySelector('.btn-history-copy').addEventListener('click', (e) => {
        navigator.clipboard.writeText(item.prompt);
        e.currentTarget.title = '✓ Copied!';
      });
      tr.querySelector('.btn-history-delete').addEventListener('click', () => {
        if (confirm(`Remove "${item.prompt.substring(0, 30)}..." from history?`)) {
          generationHistory = generationHistory.filter(h => h !== item);
          localStorage.setItem('flow_gen_history', JSON.stringify(generationHistory));
          renderHistoryTable();
        }
      });

      historyTableBody.appendChild(tr);
    });
  }
}

function getPromptsList() {
  const raw = (promptInput && promptInput.value) ? promptInput.value.trim() : '';
  if (!raw) return [];

  // 1. Check if user separated prompts with divider lines (--- or ===)
  if (/\n\s*[-=]{3,}\s*\n/.test(raw)) {
    return raw
      .split(/\n\s*[-=]{3,}\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && !p.startsWith('#') && !p.startsWith('//'));
  }

  // 2. Check if user separated prompts with Blank Lines (\n\n) -> Supports Multi-line Paragraph Prompts!
  if (/\n\s*\n/.test(raw)) {
    return raw
      .split(/\n\s*\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0 && !p.startsWith('#') && !p.startsWith('//'));
  }

  // 3. Standard single line-by-line prompts
  return raw
    .split('\n')
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.startsWith('#') && !p.startsWith('//'));
}

function updatePromptCount() {
  const list = getPromptsList();
  const el = promptCountBadge || document.getElementById('promptCountBadge');
  if (el) {
    el.innerText = `${list.length} Prompt${list.length === 1 ? '' : 's'}`;
  }
}

function setupEventListeners() {
  if (btnAddAccount) {
    btnAddAccount.addEventListener('click', handleAddNewAccount);
  }

  const btnHeaderRefresh = document.getElementById('btnHeaderRefreshCredits');
  const btnHeaderBadge = document.getElementById('headerCreditsPoolBadge');
  const btnRefreshAll = document.getElementById('btnRefreshAllCredits');

  async function handleSyncAllCredits() {
    if (!window.api) return;
    appendLog({ message: 'Syncing real remaining credits from Google Flow for all accounts...', type: 'info' });
    if (btnHeaderRefresh) btnHeaderRefresh.style.animation = 'spin 0.8s linear infinite';
    if (btnRefreshAll) btnRefreshAll.disabled = true;

    try {
      accounts = await window.api.refreshAllCredits();
      renderAccounts();
      appendLog({ message: '✓ All account credits successfully synced with Google Flow live servers!', type: 'success' });
    } catch (e) {
      appendLog({ message: `Sync error: ${e.message}`, type: 'warn' });
    } finally {
      if (btnHeaderRefresh) btnHeaderRefresh.style.animation = '';
      if (btnRefreshAll) btnRefreshAll.disabled = false;
    }
  }

  if (promptInput) promptInput.addEventListener('input', updatePromptCount);

  if (btnBrowseFolder) {
    btnBrowseFolder.addEventListener('click', async () => {
      if (window.api) {
        const selected = await window.api.selectFolder();
        if (selected) {
          inputDownloadFolder.value = selected;
          appendLog({ message: `Download directory set to: ${selected}`, type: 'info' });
          await syncHistoryFromFolder();
        }
      }
    });
  }

  if (btnOpenDownloadFolder) {
    btnOpenDownloadFolder.addEventListener('click', () => {
      if (window.api && inputDownloadFolder.value) {
        window.api.openFolder(inputDownloadFolder.value);
      }
    });
  }

  // 🎬 Video Gallery Sort & Sync Controls
  const selectVideoSort = document.getElementById('selectVideoSort');
  if (selectVideoSort) {
    selectVideoSort.addEventListener('change', () => {
      currentVideoSort = selectVideoSort.value;
      renderSortedVideos();
    });
  }

  const btnSyncVideoGallery = document.getElementById('btnSyncVideoGallery');
  if (btnSyncVideoGallery) {
    btnSyncVideoGallery.addEventListener('click', async () => {
      btnSyncVideoGallery.disabled = true;
      btnSyncVideoGallery.innerHTML = '<span class="task-spinner" style="width: 12px; height: 12px; display: inline-block;"></span> Syncing...';
      await syncVideosFromFolder();
      btnSyncVideoGallery.disabled = false;
      btnSyncVideoGallery.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        Sync Folder
      `;
    });
  }

  // 🖼️ Image Gallery Sort & Sync Controls
  const selectImageSort = document.getElementById('selectImageSort');
  if (selectImageSort) {
    selectImageSort.addEventListener('change', () => {
      currentImageSort = selectImageSort.value;
      renderSortedImages();
    });
  }

  const btnSyncImageGallery = document.getElementById('btnSyncImageGallery');
  if (btnSyncImageGallery) {
    btnSyncImageGallery.addEventListener('click', async () => {
      btnSyncImageGallery.disabled = true;
      btnSyncImageGallery.innerHTML = '<span class="task-spinner" style="width: 12px; height: 12px; display: inline-block;"></span> Syncing...';
      await syncImagesFromFolder();
      btnSyncImageGallery.disabled = false;
      btnSyncImageGallery.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
        Sync Folder
      `;
    });
  }

  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', () => {
      if (terminalLogs) terminalLogs.innerHTML = '';
    });
  }

// 🔔 Audio Chime Alert for Google Captchas / Verification
function playAlertChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

  const btnPause = document.getElementById('btnPause');
  let isQueuePaused = false;

  if (btnPause) {
    btnPause.addEventListener('click', async () => {
      if (!isQueuePaused) {
        if (window.api) await window.api.pauseAutomation();
        isQueuePaused = true;
        btnPause.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          Resume Queue
        `;
        btnPause.className = 'btn btn-lg btn-success';
        globalStatusText.innerText = 'Queue Paused';
        currentTaskTitle.innerText = 'Queue Paused';
        currentTaskDetail.innerText = 'Finishing current renders before holding.';
      } else {
        if (window.api) await window.api.resumeAutomation();
        isQueuePaused = false;
        btnPause.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
          Pause
        `;
        btnPause.className = 'btn btn-lg btn-secondary';
        globalStatusText.innerText = `Running ${currentType} Queue`;
      }
    });
  }

  if (btnStart) {
    btnStart.addEventListener('click', async () => {
    try {
      console.log('Start Generation Queue button clicked!');
      const prompts = getPromptsList();
      let selectedAccounts = accounts.filter(a => a.selected);

      if (prompts.length === 0) {
        alert('Please enter at least one video prompt in the text area.');
        return;
      }

      if (selectedAccounts.length === 0) {
        if (accounts.length > 0) {
          accounts.forEach(a => a.selected = true);
          selectedAccounts = accounts;
          renderAccounts();
        } else if (window.api) {
          accounts = await window.api.getAccounts();
          if (accounts.length === 0) {
            accounts = await window.api.addAccount('Google Account 1');
          }
          accounts.forEach(a => a.selected = true);
          selectedAccounts = accounts;
          renderAccounts();
        }
      }

      let downloadFolder = inputDownloadFolder.value.trim();
      if (!downloadFolder && window.api) {
        downloadFolder = await window.api.getDefaultDownloadPath();
        inputDownloadFolder.value = downloadFolder;
      }

      const activeDurationChip = quickDurationGroup ? quickDurationGroup.querySelector('.quick-chip.active') : null;
      const activeRatioChip = quickRatioGroup ? quickRatioGroup.querySelector('.quick-chip.active') : null;

      const hasFrames = !!(startFramePath || endFramePath);
      const hasReference = !!referenceImagePath;
      let effectiveVideoMode = currentVideoMode;
      if (currentType === 'Image') {
        effectiveVideoMode = 'Text';
      } else if (currentVideoMode === 'Frames' || hasFrames) {
        effectiveVideoMode = 'Frames';
      } else if (currentVideoMode === 'Ingredients' || hasReference) {
        effectiveVideoMode = 'Ingredients';
      }

      const settings = {
        type: currentType, // 'Video' | 'Image'
        videoMode: effectiveVideoMode,
        referenceImage: referenceImagePath || null,
        referenceImages: (typeof batchReferenceImages !== 'undefined' && batchReferenceImages.length > 0) ? batchReferenceImages : (referenceImagePath ? [referenceImagePath] : []),
        startFrame: startFramePath || null,
        endFrame: endFramePath || null,
        model: (quickSelectModel && quickSelectModel.value) ? quickSelectModel.value : currentSelectedModel,
        duration: activeDurationChip ? activeDurationChip.dataset.val : currentSelectedDuration,
        aspectRatio: activeRatioChip ? activeRatioChip.dataset.val : currentSelectedAspect,
        quality: (quickSelectQuality && quickSelectQuality.value) ? quickSelectQuality.value : currentSelectedQuality,
        outputsCount: currentOutputsCount || 1,
        promptDelaySec: (typeof currentPromptDelaySec === 'number') ? currentPromptDelaySec : 0,
        downloadStrategy: currentDownloadStrategy || 'instant',
        namingPattern: currentNamingPattern || 'scene',
        customNamingPrefix: currentCustomNamingPrefix || 'scene'
      };

      isRunning = true;
      btnStart.disabled = true;
      btnStop.disabled = false;
      if (btnPause) {
        btnPause.style.display = 'inline-flex';
        btnPause.disabled = false;
        isQueuePaused = false;
        btnPause.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
          Pause
        `;
        btnPause.className = 'btn btn-lg btn-secondary';
      }
      globalStatusText.innerText = `Running ${currentType} Queue`;
      taskSpinner.style.display = 'block';

      appendLog({ message: `Initiating ${currentType} (${currentVideoMode}) Queue with ${prompts.length} prompts across ${selectedAccounts.length} Google accounts (${settings.duration} · ${settings.aspectRatio})...`, type: 'info' });

      if (window.api) {
        console.log('Sending startAutomation IPC to main process...');
        await window.api.startAutomation({
          prompts,
          accounts: selectedAccounts,
          settings,
          downloadFolder
        });
      }
    } catch (err) {
      console.error('Error starting queue:', err);
      alert('Error starting queue: ' + err.message);
    }
    });
  }

  if (btnStop) {
    btnStop.addEventListener('click', async () => {
      if (window.api) {
        await window.api.stopAutomation();
      }
      isRunning = false;
      if (btnStart) btnStart.disabled = false;
      if (btnPause) {
        btnPause.style.display = 'none';
        btnPause.disabled = true;
      }
      btnStop.disabled = true;
      globalStatusText.innerText = 'Stopped';
      taskSpinner.style.display = 'none';
      currentTaskTitle.innerText = 'Queue Stopped';
      currentTaskDetail.innerText = 'Automation halted by user.';
    });
  }

  // IPC Event Listeners
  if (window.api) {
    window.api.onLog((logData) => {
      appendLog(logData);
      if (logData.isCaptcha || (logData.type === 'error' && logData.message.toLowerCase().includes('captcha'))) {
        playAlertChime();
      }
    });

    window.api.onProgress((data) => {
      if (data.currentPromptIndex && data.totalPrompts) {
        const percent = Math.round((data.currentPromptIndex / data.totalPrompts) * 100);
        progressBarFill.style.width = `${percent}%`;
        progressStepText.innerText = `${data.currentPromptIndex} / ${data.totalPrompts}`;
        progressPercentText.innerText = `${percent}%`;
      }

      if (data.currentProfileName) {
        activeProfileIndicator.innerText = data.currentProfileName;
      }

      if (data.activePromptText) {
        currentTaskTitle.innerText = `Generating: "${data.activePromptText.substring(0, 40)}..."`;
        currentTaskDetail.innerText = `Active on ${data.currentProfileName} (${currentSelectedModel})`;
      }

      if (data.status === 'Completed') {
        isRunning = false;
        btnStart.disabled = false;
        btnStop.disabled = true;
        if (btnPause) {
          btnPause.style.display = 'none';
          btnPause.disabled = true;
        }
        globalStatusText.innerText = 'Completed';
        taskSpinner.style.display = 'none';
        currentTaskTitle.innerText = 'All Videos Generated & Downloaded!';
        currentTaskDetail.innerText = 'Batch generation completed successfully.';
      } else if (data.status === 'Exhausted All Accounts' || data.status === 'Stopped') {
        isRunning = false;
        btnStart.disabled = false;
        btnStop.disabled = true;
        if (btnPause) {
          btnPause.style.display = 'none';
          btnPause.disabled = true;
        }
        globalStatusText.innerText = data.status;
        taskSpinner.style.display = 'none';
      }
    });

    window.api.onVideoStarted((videoData) => createRenderingVideoCard(videoData));
    window.api.onVideoRenderingTick((progressData) => updateRenderingTick(progressData));
    window.api.onVideoCompleted((videoData) => completeVideoCard(videoData));

    // Real-time Auto Login Sync
    window.api.onAccountLoggedIn((data) => {
      if (data && data.accounts) {
        accounts = data.accounts;
        renderAccounts();
        if (data.result && data.result.account) {
          const acc = data.result.account;
          appendLog({ message: `🎉 [${acc.name}] is successfully connected as ${acc.email || 'Google User'} (${acc.credits} live credits)!`, type: 'success' });
        } else {
          appendLog({ message: `Google account profile updated.`, type: 'info' });
        }
      }
    });
  }
}

async function init() {
  setupNavigation();
  setupSettingsModal();
  setupModeSwitcher();
  if (typeof setupInteractiveQuickControls === 'function') setupInteractiveQuickControls();
  if (typeof setupImageControls === 'function') setupImageControls();
  if (typeof setupFramesControls === 'function') setupFramesControls();
  setupImageLightboxModal();
  setupVideoPlayerModal();
  setupHistoryView();
  setupEventListeners();

  if (window.api) {
    accounts = await window.api.getAccounts();
    renderAccounts();
    const defFolder = await window.api.getDefaultDownloadPath();
    if (defFolder && inputDownloadFolder) {
      inputDownloadFolder.value = defFolder;
    }
    if (typeof syncVideosFromFolder === 'function') syncVideosFromFolder();
    if (typeof syncImagesFromFolder === 'function') syncImagesFromFolder();
    if (typeof syncHistoryFromFolder === 'function') syncHistoryFromFolder();
  }

  if (!promptInput.value || promptInput.value.trim() === '') {
    promptInput.value = `First long prompt.\nIt can span multiple lines.\n\nSecond prompt starts after a blank line.\n\nThird prompt.`;
  }
  updatePromptCount();
}

// Start
init();
