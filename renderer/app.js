// Safe HTML escape helper
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// DOM Elements - Navigation & Views
const tabBtnStudio = document.getElementById('tabBtnStudio');
const tabBtnGallery = document.getElementById('tabBtnGallery');
const tabBtnImageGallery = document.getElementById('tabBtnImageGallery');
const tabBtnHistory = document.getElementById('tabBtnHistory');
const tabBtnLogs = document.getElementById('tabBtnLogs');
const navGalleryBadge = document.getElementById('navGalleryBadge');
const navImageGalleryBadge = document.getElementById('navImageGalleryBadge');
const navHistoryBadge = document.getElementById('navHistoryBadge');
const historyTotalVideosCount = document.getElementById('historyTotalVideosCount');
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
let currentCanvasStrategy = 'fresh';
let currentNamingPattern = 'scene';
let currentCustomNamingPrefix = 'scene';

// V2 Enhanced State
let currentConcurrency = 1;
let isHeadlessMode = false; // Default to false (Visible) to avoid Google bot block

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeProxyUrl(url = '') {
  if (!url) return '';
  return String(url).replace(/(https?:\/\/|socks5:\/\/|socks4:\/\/)?([^:/@\s]+):([^@\s]+)@/i, '$1$2:***@');
}



function setupModeSwitcher() {
  const durationContainer = document.getElementById('quickDurationContainer');

  const allModePills = [btnModeVideo, btnModeImage, btnSubmodeIngredients, btnSubmodeFrames].filter(Boolean);

  const activatePill = (activeBtn) => {
    allModePills.forEach(b => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
  };

  // 1. Video Generation Mode
  if (btnModeVideo) {
    btnModeVideo.addEventListener('click', () => {
      currentType = 'Video';
      currentVideoMode = 'Text';
      activatePill(btnModeVideo);
      if (videoSubmodeGroup) videoSubmodeGroup.style.display = 'none';
      if (ingredientsAttachmentBox) ingredientsAttachmentBox.style.display = 'none';
      if (framesAttachmentBox) framesAttachmentBox.style.display = 'none';
      if (durationContainer) durationContainer.style.display = 'flex';
      
      // Populate Video Models & Qualities
      if (quickSelectModel) {
        quickSelectModel.innerHTML = `
          <option value="Omni Flash" selected>Omni Flash</option>
          <option value="Veo 3.1 - Lite">Veo 3.1 - Lite</option>
          <option value="Veo 3.1 - Fast">Veo 3.1 - Fast</option>
          <option value="Veo 3.1 - Quality">Veo 3.1 - Quality</option>
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
      updateQuickLabels();
    });
  }

  // 2. Image Generation Mode
  if (btnModeImage) {
    btnModeImage.addEventListener('click', () => {
      currentType = 'Image';
      activatePill(btnModeImage);
      if (videoSubmodeGroup) videoSubmodeGroup.style.display = 'none';
      if (ingredientsAttachmentBox) ingredientsAttachmentBox.style.display = 'none';
      if (framesAttachmentBox) framesAttachmentBox.style.display = 'none';
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
          <option value="Nano Banana Pro" selected>Nano Banana Pro</option>
          <option value="Nano Banana 2">Nano Banana 2</option>
          <option value="Nano Banana 2 Lite">Nano Banana 2 Lite</option>
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
      updateSubmodeVisibility();
      updateQuickLabels();
    });
  }

  // 3. Ingredients (Ref Image)
  if (btnSubmodeIngredients) {
    btnSubmodeIngredients.addEventListener('click', () => {
      currentType = 'Video';
      currentVideoMode = 'Ingredients';
      activatePill(btnSubmodeIngredients);
      if (durationContainer) durationContainer.style.display = 'flex';

      if (quickSelectModel && (quickSelectModel.value.includes('Nano Banana') || quickSelectModel.value.includes('Imagen'))) {
        quickSelectModel.innerHTML = `
          <option value="Omni Flash" selected>Omni Flash</option>
          <option value="Veo 3.1 - Lite">Veo 3.1 - Lite</option>
          <option value="Veo 3.1 - Fast">Veo 3.1 - Fast</option>
          <option value="Veo 3.1 - Quality">Veo 3.1 - Quality</option>
        `;
        currentSelectedModel = 'Omni Flash';
      }

      const activeModeBadge = document.getElementById('activeModeBadge');
      if (activeModeBadge) {
        activeModeBadge.innerText = 'Ingredients Mode';
        activeModeBadge.style.color = '#a855f7';
        activeModeBadge.style.background = 'rgba(168, 85, 247, 0.15)';
      }
      updateSubmodeVisibility();
      updateQuickLabels();
    });
  }

  // 4. Frames (Start -> End)
  if (btnSubmodeFrames) {
    btnSubmodeFrames.addEventListener('click', () => {
      currentType = 'Video';
      currentVideoMode = 'Frames';
      activatePill(btnSubmodeFrames);
      if (durationContainer) durationContainer.style.display = 'flex';

      if (quickSelectModel && (quickSelectModel.value.includes('Nano Banana') || quickSelectModel.value.includes('Imagen'))) {
        quickSelectModel.innerHTML = `
          <option value="Omni Flash" selected>Omni Flash</option>
          <option value="Veo 3.1 - Lite">Veo 3.1 - Lite</option>
          <option value="Veo 3.1 - Fast">Veo 3.1 - Fast</option>
          <option value="Veo 3.1 - Quality">Veo 3.1 - Quality</option>
        `;
        currentSelectedModel = 'Omni Flash';
      }

      const activeModeBadge = document.getElementById('activeModeBadge');
      if (activeModeBadge) {
        activeModeBadge.innerText = 'Frames Mode';
        activeModeBadge.style.color = '#38bdf8';
        activeModeBadge.style.background = 'rgba(56, 189, 248, 0.15)';
      }
      updateSubmodeVisibility();
      updateQuickLabels();
    });
  }

  if (btnSubmodeText) {
    btnSubmodeText.addEventListener('click', () => {
      currentType = 'Video';
      currentVideoMode = 'Text';
      activatePill(btnModeVideo);
      updateSubmodeVisibility();
      updateQuickLabels();
    });
  }

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
  const tabBtnStudio = document.getElementById('tabBtnStudio');
  const viewStudio = document.getElementById('viewStudio');
  const tabBtnAccounts = document.getElementById('tabBtnAccounts');
  const viewAccounts = document.getElementById('viewAccounts');
  const tabBtnHistory = document.getElementById('tabBtnHistory');
  const viewHistory = document.getElementById('viewHistory');
  const tabBtnFailed = document.getElementById('tabBtnFailed');
  const viewFailedQueue = document.getElementById('viewFailedQueue');
  const tabBtnDiagnostics = document.getElementById('tabBtnDiagnostics');
  const viewDiagnostics = document.getElementById('viewDiagnostics');
  const tabBtnLogs = document.getElementById('tabBtnLogs');
  const viewLogs = document.getElementById('viewLogs');

  const tabBtnSettings = document.getElementById('tabBtnSettings');
  const viewSettings = document.getElementById('viewSettings');
  const viewUpcoming = document.getElementById('viewUpcoming');
  const tabBtnMediaLibrary = document.getElementById('tabBtnMediaLibrary');
  const tabBtnQueueWorkers = document.getElementById('tabBtnQueueWorkers');
  const tabBtnTemplates = document.getElementById('tabBtnTemplates');
  const tabBtnPromptTools = document.getElementById('tabBtnPromptTools');
  const upcomingFeatureTitle = document.getElementById('upcomingFeatureTitle');
  const upcomingFeatureDesc = document.getElementById('upcomingFeatureDesc');
  const btnUpcomingBackToStudio = document.getElementById('btnUpcomingBackToStudio');

  const tabs = [
    { btn: tabBtnStudio, view: viewStudio, title: 'Studio & Queue' },
    { btn: tabBtnAccounts, view: viewAccounts, title: '👥 Google Accounts & Rotation Pool' },
    { btn: tabBtnHistory, view: viewHistory, title: 'Generation History' },
    { btn: tabBtnFailed, view: viewFailedQueue, title: '⚠️ Failed Prompts & Recovery' },
    { btn: tabBtnDiagnostics, view: viewDiagnostics, title: '🩺 System Diagnostics & Live Health Monitor' },
    { btn: tabBtnLogs, view: viewLogs, title: 'Real-time Execution Logs' },
    { btn: tabBtnSettings, view: viewSettings, title: '⚙️ Studio Settings & Preferences' }
  ];

  const upcomingBtns = [tabBtnMediaLibrary, tabBtnQueueWorkers, tabBtnTemplates, tabBtnPromptTools];

  const deactivateAll = () => {
    tabs.forEach(t => {
      if (t.btn) t.btn.classList.remove('active');
      if (t.view) t.view.classList.remove('active');
    });
    upcomingBtns.forEach(b => b && b.classList.remove('active'));
    if (viewUpcoming) viewUpcoming.classList.remove('active');
  };

  tabs.forEach(tab => {
    if (!tab.btn) return;
    tab.btn.addEventListener('click', () => {
      deactivateAll();
      tab.btn.classList.add('active');
      if (tab.view) tab.view.classList.add('active');
      if (pageTitle) pageTitle.innerText = tab.title;

      try {
        if (tab.view === viewAccounts && typeof renderAccounts === 'function') {
          renderAccounts();
        } else if (tab.view === viewHistory) {
          if (typeof renderHistoryTable === 'function') renderHistoryTable();
          if (typeof syncHistoryFromFolder === 'function') syncHistoryFromFolder();
        } else if (tab.view === viewFailedQueue && typeof syncFailedTasks === 'function') {
          syncFailedTasks();
        } else if (tab.view === viewDiagnostics && typeof runLiveDiagnostics === 'function') {
          runLiveDiagnostics(false);
        } else if (tab.view === viewSettings && typeof loadDedicatedSettings === 'function') {
          loadDedicatedSettings();
        }
      } catch (err) {
        console.warn('[Navigation]: Tab hook warning:', err);
      }
    });
  });

  upcomingBtns.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      deactivateAll();
      btn.classList.add('active');
      if (viewUpcoming) {
        viewUpcoming.classList.add('active');
        const fTitle = btn.getAttribute('data-feature-title') || 'Upcoming Feature';
        const fDesc = btn.getAttribute('data-feature-desc') || 'This module is scheduled for the upcoming V2.1 release.';
        if (upcomingFeatureTitle) upcomingFeatureTitle.textContent = fTitle;
        if (upcomingFeatureDesc) upcomingFeatureDesc.textContent = fDesc;
      }
      if (pageTitle) pageTitle.innerText = btn.getAttribute('data-feature-title') || 'Upcoming Feature';
    });
  });

  if (btnUpcomingBackToStudio && tabBtnStudio) {
    btnUpcomingBackToStudio.addEventListener('click', () => {
      tabBtnStudio.click();
    });
  }

  const btnHistoryGoToStudio = document.getElementById('btnHistoryGoToStudio');
  if (btnHistoryGoToStudio && tabBtnStudio) {
    btnHistoryGoToStudio.addEventListener('click', () => {
      tabBtnStudio.click();
    });
  }

  // 📱 Collapsible Sidebar Logic (Close & Open)
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const appSidebar = document.getElementById('appSidebar');

  if (appSidebar) {
    const updateSidebarUI = (isCol) => {
      if (isCol) {
        appSidebar.classList.add('collapsed');
        document.body.classList.add('sidebar-collapsed');
      } else {
        appSidebar.classList.remove('collapsed');
        document.body.classList.remove('sidebar-collapsed');
      }

      if (btnToggleSidebar) {
        btnToggleSidebar.title = isCol ? 'Expand Menu (Ctrl+B)' : 'Collapse Menu (Ctrl+B)';
        btnToggleSidebar.setAttribute('aria-expanded', isCol ? 'false' : 'true');
      }
    };

    const toggleSidebar = () => {
      const willCollapse = !appSidebar.classList.contains('collapsed');
      updateSidebarUI(willCollapse);
      localStorage.setItem('flow_sidebar_collapsed', willCollapse ? 'true' : 'false');
    };

    if (btnToggleSidebar) {
      btnToggleSidebar.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      });
    }

    // Keyboard shortcut: Ctrl + B or Cmd + B
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
        e.preventDefault();
        toggleSidebar();
      }
    });

    // Restore saved state
    const savedState = localStorage.getItem('flow_sidebar_collapsed');
    if (savedState === 'true') {
      updateSidebarUI(true);
    }
  }
}

// ⚙️ SETTINGS MODAL
function setupSettingsModal() {
  const inputChrome = document.getElementById('inputChromePath');
  const btnBrowseChrome = document.getElementById('btnBrowseChromePath');

  const openModal = async () => {
    settingsModalBackdrop.classList.add('open');
    if (window.api) {
      accounts = await window.api.getAccounts();
      renderAccounts();
      updateTotalCreditsHeader();

      // Silently sync real credits from Google Flow whenever Settings is opened
      window.api.refreshAllCredits().then(res => {
        if (res && Array.isArray(res)) {
          accounts = res;
          renderAccounts();
          updateTotalCreditsHeader();
        }
      }).catch(() => {});

      if (inputDownloadFolder) {
        const savedFolder = await window.api.getSetting('download_folder');
        if (savedFolder) inputDownloadFolder.value = savedFolder;
      }

      if (inputChrome) {
        const savedChrome = await window.api.getSetting('chrome_path');
        if (savedChrome) {
          inputChrome.value = savedChrome;
        } else {
          const detected = await window.api.getChromePath();
          if (detected) inputChrome.value = detected;
        }
      }
    }
  };

  const closeModal = async () => {
    settingsModalBackdrop.classList.remove('open');
    if (window.api) {
      if (inputDownloadFolder && inputDownloadFolder.value) {
        await window.api.setSetting('download_folder', inputDownloadFolder.value.trim());
      }
      if (inputChrome && inputChrome.value) {
        await window.api.setSetting('chrome_path', inputChrome.value.trim());
      }
    }
    saveAccountsState();
  };

  if (btnOpenSettings) btnOpenSettings.addEventListener('click', openModal);
  if (btnQuickEditSettings) btnQuickEditSettings.addEventListener('click', openModal);
  
  const btnQuickOpenSettings = document.getElementById('btnQuickOpenSettings');
  if (btnQuickOpenSettings) btnQuickOpenSettings.addEventListener('click', openModal);

  const btnGoToAccountsTab = document.getElementById('btnGoToAccountsTab');
  if (btnGoToAccountsTab) {
    btnGoToAccountsTab.addEventListener('click', () => {
      closeModal();
      const tabBtnAccounts = document.getElementById('tabBtnAccounts');
      if (tabBtnAccounts) tabBtnAccounts.click();
    });
  }

  // Hook up dedicated accounts view buttons
  const btnAddAccountDedicated = document.getElementById('btnAddAccountDedicated');
  if (btnAddAccountDedicated) {
    btnAddAccountDedicated.addEventListener('click', handleAddNewAccount);
  }

  const btnRefreshAllCreditsDedicated = document.getElementById('btnRefreshAllCreditsDedicated');
  if (btnRefreshAllCreditsDedicated) {
    btnRefreshAllCreditsDedicated.addEventListener('click', async () => {
      if (!window.api) return;
      btnRefreshAllCreditsDedicated.disabled = true;
      btnRefreshAllCreditsDedicated.innerHTML = '<span class="task-spinner" style="width: 12px; height: 12px; display: inline-block;"></span> Syncing...';
      appendLog({ message: 'Syncing live credits from Google Flow for all accounts...', type: 'info' });
      try {
        const updated = await window.api.refreshAllCredits();
        if (updated && Array.isArray(updated)) {
          accounts = updated;
          renderAccounts();
          updateTotalCreditsHeader();
          const readyWithCredits = accounts.filter(a => a.status === 'Ready' && typeof a.credits === 'number' && a.credits > 0);
          appendLog({ message: `✓ Fleet sync complete! Found ${readyWithCredits.length} active ready account(s).`, type: 'success' });
        }
      } catch (err) {
        console.error('Dedicated sync error:', err);
        appendLog({ message: `Fleet sync failed: ${err.message}`, type: 'error' });
      } finally {
        btnRefreshAllCreditsDedicated.disabled = false;
        btnRefreshAllCreditsDedicated.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          <span>Sync All</span>
        `;
      }
    });
  }

  const btnImportFromChromeDedicated = document.getElementById('btnImportFromChromeDedicated');
  if (btnImportFromChromeDedicated) {
    btnImportFromChromeDedicated.addEventListener('click', () => {
      openChromeProfilesModal(null);
    });
  }

  const btnImportAllChromeDedicated = document.getElementById('btnImportAllChromeDedicated');
  if (btnImportAllChromeDedicated) {
    btnImportAllChromeDedicated.addEventListener('click', () => {
      openChromeProfilesModal(null);
    });
  }

  const btnClearAllAccountsDedicated = document.getElementById('btnClearAllAccountsDedicated');
  if (btnClearAllAccountsDedicated) {
    btnClearAllAccountsDedicated.addEventListener('click', async () => {
      if (!accounts || accounts.length === 0) {
        alert('No Google accounts to remove.');
        return;
      }
      const selected = accounts.filter(a => a.selected !== false);
      if (selected.length > 0 && selected.length < accounts.length) {
        if (confirm(`Remove the ${selected.length} selected Google account(s) from your fleet?`)) {
          for (const a of selected) {
            if (window.api && window.api.deleteAccount) {
              await window.api.deleteAccount(a.id);
            }
          }
          if (window.api && window.api.getAccounts) {
            accounts = await window.api.getAccounts();
          } else {
            accounts = accounts.filter(a => a.selected === false);
          }
          renderAccounts();
          appendLog({ message: `✓ Removed ${selected.length} selected account(s).`, type: 'info' });
        }
        return;
      }

      if (confirm(`Are you sure you want to remove ALL ${accounts.length} Google accounts from the studio? This will clear all profiles.`)) {
        if (window.api && window.api.deleteAllAccounts) {
          accounts = await window.api.deleteAllAccounts();
        } else {
          for (const a of accounts) {
            if (window.api && window.api.deleteAccount) {
              await window.api.deleteAccount(a.id);
            }
          }
          accounts = [];
        }
        renderAccounts();
        appendLog({ message: '✓ All Google accounts successfully removed from studio.', type: 'info' });
      }
    });
  }

  if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeModal);
  if (btnSaveSettingsModal) btnSaveSettingsModal.addEventListener('click', closeModal);

  if (btnBrowseChrome) {
    btnBrowseChrome.addEventListener('click', async () => {
      if (window.api) {
        const selected = await window.api.selectChromeExe();
        if (selected && inputChrome) {
          inputChrome.value = selected;
          appendLog({ message: `Chrome executable set to: ${selected}`, type: 'info' });
        }
      }
    });
  }

  const btnExportSessions = document.getElementById('btnExportSessions');
  if (btnExportSessions) {
    btnExportSessions.addEventListener('click', async () => {
      if (!window.api) return;
      try {
        btnExportSessions.disabled = true;
        btnExportSessions.innerHTML = '<span class="task-spinner" style="width: 12px; height: 12px; display: inline-block;"></span> Exporting...';
        const res = await window.api.exportSessionsBundle();
        if (res.success) {
          alert(`Sessions exported successfully!\n\nBackup File: ${res.filePath || res.path}`);
        } else if (!res.canceled) {
          alert('Export failed: ' + (res.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Export error: ' + err.message);
      } finally {
        btnExportSessions.disabled = false;
        btnExportSessions.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Export Sessions Backup (.flowbackup)
        `;
      }
    });
  }

  const btnImportSessions = document.getElementById('btnImportSessions');
  if (btnImportSessions) {
    btnImportSessions.addEventListener('click', async () => {
      if (!window.api) return;
      try {
        btnImportSessions.disabled = true;
        btnImportSessions.innerHTML = '<span class="task-spinner" style="width: 12px; height: 12px; display: inline-block;"></span> Restoring...';
        const res = await window.api.importSessionsBundle();
        if (res.success) {
          const count = (res.accounts && res.accounts.length) || res.accountsCount || 0;
          alert(`Sessions imported successfully!\n\nRestored ${count} Google accounts with session cookies.`);
          accounts = await window.api.getAccounts();
          renderAccounts();
        } else if (!res.canceled) {
          alert('Import failed: ' + (res.error || 'Unknown error'));
        }
      } catch (err) {
        alert('Import error: ' + err.message);
      } finally {
        btnImportSessions.disabled = false;
        btnImportSessions.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Import Sessions Backup
        `;
      }
    });
  }

  if (settingsModalBackdrop) {
    settingsModalBackdrop.addEventListener('click', (e) => {
      if (e.target === settingsModalBackdrop) closeModal();
    });
  }
}

// ⚙️ DEDICATED WORKING SETTINGS VIEW & LOGIC
async function loadDedicatedSettings() {
  if (!window.api) return;
  const inputChrome = document.getElementById('inputChromePathSettings');
  const chromeStatusMsg = document.getElementById('chromeDetectStatusMsg');
  const inputFolder = document.getElementById('inputDownloadFolderSettings');
  const selectQuality = document.getElementById('selectDefaultQualityDedicated');
  const selectDuration = document.getElementById('selectDefaultDurationDedicated');
  const inputDelay = document.getElementById('inputPromptDelaySettings');
  const selectConcurrency = document.getElementById('selectConcurrencySettings');
  const toggleHeadless = document.getElementById('toggleHeadlessModeSettings');
  const accountsCountEl = document.getElementById('settingsAccountsCount');

  try {
    // 1. Chrome Path
    let chromePath = await window.api.getSetting('chrome_path');
    if (!chromePath) {
      chromePath = await window.api.getChromePath();
    }
    if (inputChrome && chromePath) {
      inputChrome.value = chromePath;
      if (chromeStatusMsg) chromeStatusMsg.textContent = `✓ Chrome path active: ${chromePath}`;
    }

    // 2. Folder
    let dlFolder = await window.api.getSetting('download_folder');
    if (!dlFolder) {
      dlFolder = await window.api.getDefaultDownloadPath();
    }
    if (inputFolder && dlFolder) {
      inputFolder.value = dlFolder;
    }

    // 3. Delay & Concurrency
    const delay = await window.api.getSetting('prompt_delay', 45);
    if (inputDelay) inputDelay.value = delay;

    const conc = await window.api.getSetting('concurrency', 1);
    if (selectConcurrency) selectConcurrency.value = String(conc);

    const isHead = await window.api.getSetting('headless', 'false');
    if (toggleHeadless) toggleHeadless.checked = (isHead === 'true' || isHead === true);

    // 4. Quality & Duration
    const qual = await window.api.getSetting('default_quality', '1080p');
    if (selectQuality) selectQuality.value = qual;

    const dur = await window.api.getSetting('default_duration', '6s');
    if (selectDuration) selectDuration.value = dur;

    // 5. Accounts Fleet Count
    const accs = await window.api.getAccounts();
    if (accountsCountEl && Array.isArray(accs)) {
      accountsCountEl.textContent = `${accs.length} Google Accounts Fleet Active`;
    }
  } catch (err) {
    console.warn('[Settings]: Error loading preferences:', err);
  }
}

function setupDedicatedSettings() {
  const inputChrome = document.getElementById('inputChromePathSettings');
  const btnBrowseChrome = document.getElementById('btnBrowseChromeDedicated');
  const btnAutoDetect = document.getElementById('btnAutoDetectChromeDedicated');
  const chromeStatusMsg = document.getElementById('chromeDetectStatusMsg');
  
  const inputFolder = document.getElementById('inputDownloadFolderSettings');
  const btnBrowseFolder = document.getElementById('btnBrowseFolderDedicated');
  const btnOpenFolder = document.getElementById('btnOpenFolderDedicated');
  
  const selectQuality = document.getElementById('selectDefaultQualityDedicated');
  const selectDuration = document.getElementById('selectDefaultDurationDedicated');
  const inputDelay = document.getElementById('inputPromptDelaySettings');
  const selectConcurrency = document.getElementById('selectConcurrencySettings');
  const toggleHeadless = document.getElementById('toggleHeadlessModeSettings');
  
  const btnSaveTop = document.getElementById('btnSaveFullSettings');
  const btnSaveBottom = document.getElementById('btnSaveBottomSettings');
  const saveStatusText = document.getElementById('settingsSaveStatusText');
  const btnJumpToAccounts = document.getElementById('btnSettingsGoToAccounts');

  if (btnJumpToAccounts) {
    btnJumpToAccounts.addEventListener('click', () => {
      const tabAccounts = document.getElementById('tabBtnAccounts');
      if (tabAccounts) tabAccounts.click();
    });
  }

  // Browse Chrome
  if (btnBrowseChrome) {
    btnBrowseChrome.addEventListener('click', async () => {
      if (window.api && window.api.selectChromeExe) {
        const picked = await window.api.selectChromeExe();
        if (picked && inputChrome) {
          inputChrome.value = picked;
          if (chromeStatusMsg) chromeStatusMsg.textContent = `✓ Selected Chrome: ${picked}`;
        }
      }
    });
  }

  // Auto Detect Chrome
  if (btnAutoDetect) {
    btnAutoDetect.addEventListener('click', async () => {
      if (window.api && window.api.getChromePath) {
        const detected = await window.api.getChromePath();
        if (detected && inputChrome) {
          inputChrome.value = detected;
          if (chromeStatusMsg) chromeStatusMsg.textContent = `✓ Auto-detected Chrome at: ${detected}`;
        }
      }
    });
  }

  // Browse Folder
  if (btnBrowseFolder) {
    btnBrowseFolder.addEventListener('click', async () => {
      if (window.api && window.api.selectFolder) {
        const picked = await window.api.selectFolder();
        if (picked && inputFolder) {
          inputFolder.value = picked;
        }
      }
    });
  }

  // Open Folder
  if (btnOpenFolder) {
    btnOpenFolder.addEventListener('click', async () => {
      if (window.api && window.api.openFolder && inputFolder && inputFolder.value) {
        await window.api.openFolder(inputFolder.value.trim());
      }
    });
  }

  // Save Settings Function
  const saveAllSettings = async () => {
    if (!window.api) return;
    try {
      if (inputChrome && inputChrome.value.trim()) {
        await window.api.setSetting('chrome_path', inputChrome.value.trim());
      }
      if (inputFolder && inputFolder.value.trim()) {
        await window.api.setSetting('download_folder', inputFolder.value.trim());
      }
      if (inputDelay && inputDelay.value) {
        const delayVal = parseInt(inputDelay.value, 10) || 45;
        await window.api.setSetting('prompt_delay', delayVal);
        currentPromptDelaySec = delayVal;
      }
      if (selectConcurrency && selectConcurrency.value) {
        const concVal = parseInt(selectConcurrency.value, 10) || 1;
        await window.api.setSetting('concurrency', concVal);
        currentConcurrency = concVal;
      }
      if (toggleHeadless) {
        await window.api.setSetting('headless', String(toggleHeadless.checked));
        isHeadlessMode = toggleHeadless.checked;
      }
      if (selectQuality && selectQuality.value) {
        await window.api.setSetting('default_quality', selectQuality.value);
        currentSelectedQuality = selectQuality.value;
      }
      if (selectDuration && selectDuration.value) {
        await window.api.setSetting('default_duration', selectDuration.value);
        currentSelectedDuration = selectDuration.value;
      }

      if (saveStatusText) {
        saveStatusText.textContent = '✓ Settings successfully saved and applied to automation engine!';
        saveStatusText.style.color = '#34d399';
        setTimeout(() => {
          saveStatusText.textContent = '';
        }, 4000);
      }
    } catch (err) {
      console.error('Save settings error:', err);
      if (saveStatusText) {
        saveStatusText.textContent = `Error: ${err.message}`;
        saveStatusText.style.color = '#f87171';
      }
    }
  };

  if (btnSaveTop) btnSaveTop.addEventListener('click', saveAllSettings);
  if (btnSaveBottom) btnSaveBottom.addEventListener('click', saveAllSettings);

  loadDedicatedSettings();
}

// ⚡ IMPORT DIRECTLY FROM LOCAL GOOGLE CHROME PROFILES
let currentImportTargetAccountId = null;

async function openChromeProfilesModal(targetAccountId = null) {
  currentImportTargetAccountId = targetAccountId;
  const modal = document.getElementById('chromeProfilesModalBackdrop');
  const listContainer = document.getElementById('chromeProfilesListContainer');
  if (!modal || !listContainer) return;

  modal.style.display = 'flex';
  modal.classList.add('open');
  listContainer.innerHTML = `
    <div style="text-align: center; padding: 28px 16px; color: #94a3b8;">
      <span class="spinner-small" style="width: 20px; height: 20px; border: 2px solid #38bdf8; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; margin-bottom: 10px;"></span>
      <p style="margin: 0; font-size: 13px; color: #cbd5e1;">Scanning signed-in Google accounts from Chrome...</p>
    </div>
  `;

  if (!window.api) return;

  try {
    if (window.api) {
      accounts = await window.api.getAccounts();
    }
    const profiles = await window.api.getInstalledChromeProfiles();
    if (!profiles || profiles.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; color: #94a3b8;">
          <p style="font-size: 14px; font-weight: 600; color: #f1f5f9; margin-bottom: 4px;">No Google Chrome Profiles Found</p>
          <p style="font-size: 12px; margin: 0;">Make sure Google Chrome is installed on your computer and has logged-in accounts.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = `
      <div style="display: flex; gap: 14px; align-items: center; margin-bottom: 8px; padding: 8px 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; font-size: 11px;">
        <span style="display: inline-flex; align-items: center; gap: 6px; color: #34d399; font-weight: 600;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #34d399; display: inline-block;"></span>
          ✓ Added to Studio
        </span>
        <span style="display: inline-flex; align-items: center; gap: 6px; color: #38bdf8; font-weight: 600;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; display: inline-block;"></span>
          + Available to Import
        </span>
      </div>
      <div style="font-size: 11px; color: #fbbf24; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; line-height: 1.4;">
        💡 <strong>Pro Tip:</strong> Agar Google Chrome abhi open hai, to Windows cookie files lock rakhta hai. Instant 100% session sync ke liye Chrome ko band karke Import dabayein, ya add karne ke baad card par "Sign In" dabayein!
      </div>
    `;

    profiles.forEach(prof => {
      const existingAcc = accounts.find(a => 
        (a.chromeProfileDir && a.chromeProfileDir === prof.dirName) ||
        (a.email && prof.email && a.email.toLowerCase().trim() === prof.email.toLowerCase().trim())
      );

      const item = document.createElement('div');
      item.style.cssText = existingAcc 
        ? 'display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; margin-bottom: 8px; transition: all 0.2s ease;'
        : 'display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 8px; transition: all 0.2s ease;';
      
      const hasEmail = !!prof.email;
      const initial = (prof.gaiaName || prof.name || prof.email || 'G').charAt(0).toUpperCase();

      const creditsLabel = typeof existingAcc?.credits === 'number'
        ? `${existingAcc.credits.toLocaleString()} Credits`
        : (existingAcc?.status === 'Need Login' ? 'Needs Login' : 'Added to Studio');
      const statusBadgeHtml = existingAcc
        ? `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); font-weight: 700;">✓ Added (${creditsLabel})</span>`
        : `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); font-weight: 600;">Available in Chrome</span>`;

      const buttonHtml = existingAcc
        ? `<button class="btn btn-sm btn-outline-secondary btn-do-import" style="flex-shrink: 0; gap: 6px; padding: 6px 14px; font-size: 11px; font-weight: 600; margin-left: 12px; border-color: rgba(52, 211, 153, 0.4); color: #34d399;">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
             Re-Sync Session
           </button>`
        : `<button class="btn btn-sm btn-primary btn-do-import" style="flex-shrink: 0; gap: 6px; padding: 6px 14px; font-size: 11px; font-weight: 600; margin-left: 12px; background: linear-gradient(135deg, #2563eb, #7c3aed); border: none; color: #fff;">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             + Add Account
           </button>`;

      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: ${existingAcc ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #0284c7, #6366f1)'}; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #fff; font-size: 14px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);">
            ${initial}
          </div>
          <div style="min-width: 0; flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 13px; font-weight: 600; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(prof.gaiaName || prof.name)}
              </span>
              ${statusBadgeHtml}
            </div>
            <div style="font-size: 11px; color: ${hasEmail ? '#38bdf8' : '#94a3b8'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 3px;">
              ${hasEmail ? `📧 ${escapeHtml(prof.email)}` : `📁 ${escapeHtml(prof.dirName)}`}
            </div>
          </div>
        </div>
        ${buttonHtml}
      `;

      const btnImport = item.querySelector('.btn-do-import');
      btnImport.addEventListener('click', async () => {
        btnImport.disabled = true;
        btnImport.innerHTML = `<span class="spinner-small" style="width: 10px; height: 10px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span> Syncing...`;

        try {
          const res = await window.api.importInstalledChromeProfile({
            profileDirName: prof.dirName,
            targetAccountId: currentImportTargetAccountId || (existingAcc && existingAcc.id)
          });

          if (res && res.success) {
            accounts = res.accounts || await window.api.getAccounts();
            renderAccounts();
            updateTotalCreditsHeader();
            modal.style.display = 'none';
            modal.classList.remove('open');
            const importedName = prof.email || prof.gaiaName || prof.name;
            if (typeof res.account?.credits === 'number') {
              appendLog({ message: `🎉 Successfully connected [${importedName}] with ${res.account.credits.toLocaleString()} live credits!`, type: 'success' });
            } else {
              appendLog({ message: `🎉 Successfully connected [${importedName}] to Studio! Click "Sync" to check credits.`, type: 'success' });
            }
            if (res.cookiesLocked) {
              appendLog({ message: `💡 Tip: Google Chrome was open during import so Windows locked cookies. If Flow prompts for sign-in, close Chrome and click "Re-Sync Session", or click "Sign In" on card.`, type: 'warn' });
            }

            const accId = (res.account && res.account.id) || (existingAcc && existingAcc.id);
            if (accId && res.account?.status === 'Need Login' && window.api.openLoginWindow) {
              appendLog({ message: `🔑 Opening Chrome for [${importedName}] to connect to Google Flow. Google will prompt to choose your account with 1 click!`, type: 'info' });
              window.api.openLoginWindow(accId);
            } else if (accId && window.api.refreshAccountCredits) {
              // Automatically refresh real-time balance in background
              window.api.refreshAccountCredits(accId).then(refRes => {
                if (refRes && refRes.accounts) {
                  accounts = refRes.accounts;
                  renderAccounts();
                  updateTotalCreditsHeader();
                }
              }).catch(() => {});
            }
          } else {
            alert('Import failed: ' + ((res && res.error) || 'Unknown error'));
            btnImport.disabled = false;
            btnImport.innerText = existingAcc ? 'Re-Sync Session' : '+ Add Account';
          }
        } catch (err) {
          alert('Import error: ' + err.message);
          btnImport.disabled = false;
          btnImport.innerText = existingAcc ? 'Re-Sync Session' : '+ Add Account';
        }
      });

      listContainer.appendChild(item);
    });
  } catch (err) {
    listContainer.innerHTML = `<div style="color: #ef4444; padding: 16px; font-size: 12px;">Error reading Chrome profiles: ${escapeHtml(err.message)}</div>`;
  }
}

async function handleImportAllChromeProfiles(sourceButton = null) {
  if (!window.api || !window.api.importAllInstalledChromeProfiles) return;
  const originalHtml = sourceButton ? sourceButton.innerHTML : '';
  if (sourceButton) {
    sourceButton.disabled = true;
    sourceButton.innerHTML = '<span class="spinner-small" style="width: 12px; height: 12px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span> Importing All Profiles...';
  }

  try {
    appendLog({ message: '⏳ Scanning and importing all signed-in Chrome profiles on this computer...', type: 'info' });
    const res = await window.api.importAllInstalledChromeProfiles();
    if (res && res.success) {
      accounts = res.accounts || await window.api.getAccounts();
      renderAccounts();
      updateTotalCreditsHeader();
      const modal = document.getElementById('chromeProfilesModalBackdrop');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
      }

      appendLog({
        message: `🎉 1-Click Import Complete! Successfully synced ${res.importedCount} of ${res.totalFound} Chrome accounts into Studio!`,
        type: 'success'
      });

      const lockedProfiles = res.results?.filter(r => r.cookiesLocked) || [];
      if (lockedProfiles.length > 0) {
        appendLog({
          message: `💡 Tip: ${lockedProfiles.length} profile(s) had cookies locked by an open Chrome browser. If Flow asks to login, close Chrome and re-sync or click "Sign In" on the card.`,
          type: 'warn'
        });
      }
    } else {
      appendLog({ message: `❌ Bulk profile import failed: ${res?.error || 'No profiles imported'}`, type: 'error' });
      alert('Bulk import failed: ' + (res?.error || 'Unknown error'));
    }
  } catch (err) {
    appendLog({ message: `❌ Bulk profile import error: ${err.message}`, type: 'error' });
    alert('Import error: ' + err.message);
  } finally {
    if (sourceButton) {
      sourceButton.disabled = false;
      sourceButton.innerHTML = originalHtml;
    }
  }
}

function setupChromeProfilesModal() {
  const modal = document.getElementById('chromeProfilesModalBackdrop');
  const btnClose1 = document.getElementById('btnCloseChromeProfilesModal');
  const btnClose2 = document.getElementById('btnCloseChromeProfilesModal2');
  const btnImportHeader = document.getElementById('btnImportFromChrome');
  const btnImportAllModal = document.getElementById('btnImportAllChromeProfilesModal');

  const closeModal = () => {
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('open');
    }
    currentImportTargetAccountId = null;
  };

  if (btnClose1) btnClose1.addEventListener('click', closeModal);
  if (btnClose2) btnClose2.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (btnImportHeader) {
    btnImportHeader.addEventListener('click', () => {
      openChromeProfilesModal(null);
    });
  }

  if (btnImportAllModal) {
    btnImportAllModal.addEventListener('click', () => {
      handleImportAllChromeProfiles(btnImportAllModal);
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
        const chips = quickDurationGroup.querySelectorAll('.param-chip, .quick-chip');
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
    const chips = quickDurationGroup.querySelectorAll('.param-chip, .quick-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentSelectedDuration = chip.dataset.val;
      });
    });
  }

  // 3. Aspect Ratio Selector Buttons (16:9 | 9:16)
  if (quickRatioGroup) {
    const chips = quickRatioGroup.querySelectorAll('.param-chip, .quick-chip');
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
    const chips = quickOutputsGroup.querySelectorAll('.param-chip, .quick-chip');
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

  // 8. Download Strategy & Canvas Strategy
  const quickSelectDownloadStrategy = document.getElementById('quickSelectDownloadStrategy');
  if (quickSelectDownloadStrategy) {
    quickSelectDownloadStrategy.addEventListener('change', () => {
      currentDownloadStrategy = quickSelectDownloadStrategy.value;
    });
  }

  const quickSelectCanvasStrategy = document.getElementById('quickSelectCanvasStrategy');
  if (quickSelectCanvasStrategy) {
    quickSelectCanvasStrategy.addEventListener('change', () => {
      currentCanvasStrategy = quickSelectCanvasStrategy.value;
    });
  }

  // Diagnostic Banner Controls
  function showDiagnosticBanner(title, message, icon = '🛡️') {
    const banner = document.getElementById('systemDiagnosticBanner');
    const tEl = document.getElementById('diagnosticTitle');
    const mEl = document.getElementById('diagnosticMessage');
    const iEl = document.getElementById('diagnosticIcon');
    if (banner && tEl && mEl) {
      tEl.innerText = title;
      mEl.innerText = message;
      if (iEl) iEl.innerText = icon;
      banner.style.display = 'flex';
    }
  }

  const btnDismissDiagnostic = document.getElementById('btnDismissDiagnostic');
  if (btnDismissDiagnostic) {
    btnDismissDiagnostic.addEventListener('click', () => {
      const banner = document.getElementById('systemDiagnosticBanner');
      if (banner) banner.style.display = 'none';
    });
  }

  // 9. V2 Workers Concurrency
  const quickSelectConcurrency = document.getElementById('quickSelectConcurrency');
  if (quickSelectConcurrency) {
    quickSelectConcurrency.addEventListener('change', () => {
      currentConcurrency = Number(quickSelectConcurrency.value) || 1;
      const b = document.getElementById('activeWorkersBadge');
      if (b) b.innerText = `${currentConcurrency} Worker${currentConcurrency > 1 ? 's' : ''} Ready`;
    });
  }

  // 10. V2 Headless Mode
  const btnHeadlessOn = document.getElementById('btnHeadlessOn');
  const btnHeadlessOff = document.getElementById('btnHeadlessOff');
  if (btnHeadlessOn && btnHeadlessOff) {
    btnHeadlessOn.addEventListener('click', () => {
      isHeadlessMode = true;
      btnHeadlessOn.classList.add('active');
      btnHeadlessOff.classList.remove('active');
    });
    btnHeadlessOff.addEventListener('click', () => {
      isHeadlessMode = false;
      btnHeadlessOff.classList.add('active');
      btnHeadlessOn.classList.remove('active');
    });
  }

  // 11. Collapsible Quick Options Bar (Hide/Open)
  const btnToggleQuickOptions = document.getElementById('btnToggleQuickOptions');
  const interactiveQuickBar = document.getElementById('interactiveQuickBar');
  const toggleOptionsIcon = document.getElementById('toggleOptionsIcon');
  const toggleOptionsText = document.getElementById('toggleOptionsText');

  if (btnToggleQuickOptions && interactiveQuickBar) {
    const isInitiallyCollapsed = localStorage.getItem('flow_quick_bar_collapsed') === 'true';
    if (isInitiallyCollapsed) {
      interactiveQuickBar.classList.add('collapsed');
      if (toggleOptionsIcon) toggleOptionsIcon.innerText = '▼';
      if (toggleOptionsText) toggleOptionsText.innerText = 'Show Options';
    }

    btnToggleQuickOptions.addEventListener('click', () => {
      const isCollapsed = interactiveQuickBar.classList.toggle('collapsed');
      if (isCollapsed) {
        if (toggleOptionsIcon) toggleOptionsIcon.innerText = '▼';
        if (toggleOptionsText) toggleOptionsText.innerText = 'Show Options';
        localStorage.setItem('flow_quick_bar_collapsed', 'true');
      } else {
        if (toggleOptionsIcon) toggleOptionsIcon.innerText = '▲';
        if (toggleOptionsText) toggleOptionsText.innerText = 'Hide Options';
        localStorage.setItem('flow_quick_bar_collapsed', 'false');
      }
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
    accountsListContainer.innerHTML = `<div style="color: var(--danger); font-size: 12px; padding: 10px;">Error: ${escapeHtml(err.message)}</div>`;
  }
}

function updateTotalCreditsHeader() {
  const headerBadge = document.getElementById('headerTotalCreditsText');
  const activeProfileIndicator = document.getElementById('activeProfileIndicator');

  if (!accounts || accounts.length === 0) {
    if (headerBadge) headerBadge.innerText = '0 Live Credits';
    if (activeProfileIndicator) {
      activeProfileIndicator.innerText = 'No Profiles Added';
      activeProfileIndicator.style.background = 'rgba(239, 68, 68, 0.15)';
      activeProfileIndicator.style.color = '#f87171';
    }
    return;
  }

  // Only accounts that are genuinely Ready and have positive real credits count as active connected accounts:
  const connectedAccounts = accounts.filter(a => a.status === 'Ready' && typeof a.credits === 'number' && a.credits > 0);
  const totalCredits = connectedAccounts.reduce((sum, a) => sum + (Number(a.credits) || 0), 0);

  if (headerBadge) {
    headerBadge.innerText = `${totalCredits.toLocaleString()} Live Credits`;
  }

  if (activeProfileIndicator) {
    if (connectedAccounts.length === 0) {
      activeProfileIndicator.innerText = '⚠️ 0 Connected Accounts (Sign In to Connect)';
      activeProfileIndicator.style.background = 'rgba(239, 68, 68, 0.15)';
      activeProfileIndicator.style.color = '#f87171';
    } else if (connectedAccounts.length === 1) {
      const single = connectedAccounts[0];
      const name = single.googleName || single.name;
      activeProfileIndicator.innerText = `🟢 ${name} (${single.credits.toLocaleString()} Credits)`;
      activeProfileIndicator.style.background = 'rgba(34, 197, 94, 0.15)';
      activeProfileIndicator.style.color = '#4ade80';
    } else {
      activeProfileIndicator.innerText = `🟢 Multi-Account Pool Active (${connectedAccounts.length} Connected • ${totalCredits.toLocaleString()} Credits)`;
      activeProfileIndicator.style.background = 'rgba(34, 197, 94, 0.15)';
      activeProfileIndicator.style.color = '#4ade80';
    }
  }

  // Update Fleet Health metric pill in Accounts view
  const summaryFleetHealth = document.getElementById('summaryFleetHealth');
  if (summaryFleetHealth) {
    if (accounts.length === 0) {
      summaryFleetHealth.innerText = '0%';
    } else {
      const readyPct = Math.round((connectedAccounts.length / accounts.length) * 100);
      summaryFleetHealth.innerText = `${readyPct}%`;
    }
  }

  // Refresh dynamic credit cost estimator in Studio Cockpit
  if (typeof updatePromptCount === 'function') {
    updatePromptCount();
  }
}

let accountsViewMode = localStorage.getItem('flow_accounts_view_mode') || 'cards';
let currentEditingProxyAccount = null;

function parseProxyStringUI(proxyStr) {
  if (!proxyStr || typeof proxyStr !== 'string') return null;
  let str = proxyStr.trim();
  if (!str) return null;

  let protocol = 'http';
  let host = '';
  let port = '';
  let username = '';
  let password = '';

  if (/^https?:\/\//i.test(str)) {
    protocol = 'http';
    str = str.replace(/^https?:\/\//i, '');
  } else if (/^socks5:\/\//i.test(str)) {
    protocol = 'socks5';
    str = str.replace(/^socks5:\/\//i, '');
  } else if (/^socks4:\/\//i.test(str)) {
    protocol = 'socks4';
    str = str.replace(/^socks4:\/\//i, '');
  }

  if (str.includes('@')) {
    const [authPart, hostPart] = str.split('@');
    if (authPart.includes(':')) {
      const parts = authPart.split(':');
      username = decodeURIComponent(parts[0]);
      password = decodeURIComponent(parts.slice(1).join(':'));
    }
    const [h, prt] = hostPart.split(':');
    host = h;
    port = prt;
  } else {
    const parts = str.split(':');
    if (parts.length === 4) {
      host = parts[0];
      port = parts[1];
      username = parts[2];
      password = parts[3];
    } else if (parts.length === 2) {
      host = parts[0];
      port = parts[1];
    } else {
      host = str;
    }
  }

  if (!host) return null;
  const serverUrl = port ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
  return {
    protocol,
    host,
    port,
    username,
    password,
    serverUrl,
    displayUrl: port ? `${host}:${port}` : host
  };
}

function openProxyModal(account) {
  currentEditingProxyAccount = account;
  const modal = document.getElementById('proxyModalBackdrop');
  const accountTitle = document.getElementById('proxyModalAccountTitle');
  const accountIdInput = document.getElementById('proxyModalAccountId');
  const proxyInput = document.getElementById('inputProxyString');

  if (!modal) return;

  if (accountTitle) {
    accountTitle.innerText = `Configure dedicated IP / proxy for [${account.name}]`;
  }
  if (accountIdInput) {
    accountIdInput.value = account.id;
  }
  if (proxyInput) {
    proxyInput.value = account.proxyUrl || '';
    updateProxyPreviewBadge(account.proxyUrl || '');
  }

  modal.style.display = 'flex';
  setTimeout(() => {
    if (proxyInput) proxyInput.focus();
  }, 80);
}

function updateProxyPreviewBadge(val) {
  const previewBadge = document.getElementById('proxyParsedBadge');
  if (!previewBadge) return;

  const parsed = parseProxyStringUI(val);
  if (!parsed) {
    previewBadge.innerText = 'Direct IP (No Proxy)';
    previewBadge.style.color = '#34d399';
  } else {
    const authText = parsed.username ? ` (Auth: ${parsed.username})` : '';
    previewBadge.innerText = `${parsed.protocol.toUpperCase()}: ${parsed.displayUrl}${authText}`;
    previewBadge.style.color = '#38bdf8';
  }
}

function setupProxyModal() {
  const modal = document.getElementById('proxyModalBackdrop');
  const btnClose = document.getElementById('btnCloseProxyModal');
  const btnCancel = document.getElementById('btnCancelProxyModal');
  const btnSave = document.getElementById('btnSaveProxyModal');
  const btnClear = document.getElementById('btnClearProxyModal');
  const proxyInput = document.getElementById('inputProxyString');

  const closeModal = () => {
    if (modal) modal.style.display = 'none';
    currentEditingProxyAccount = null;
  };

  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (proxyInput) {
    proxyInput.addEventListener('input', () => {
      updateProxyPreviewBadge(proxyInput.value);
    });
    proxyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (btnSave) btnSave.click();
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', async () => {
      if (!currentEditingProxyAccount) return;
      currentEditingProxyAccount.proxyUrl = '';
      if (window.api && window.api.updateAccountProxy) {
        await window.api.updateAccountProxy({ id: currentEditingProxyAccount.id, proxyUrl: '' });
      }
      appendLog({ message: `✓ [${currentEditingProxyAccount.name}] set to Direct IP`, type: 'info' });
      renderAccounts();
      saveAccountsState();
      closeModal();
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (!currentEditingProxyAccount) return;
      const rawVal = proxyInput ? proxyInput.value.trim() : '';
      currentEditingProxyAccount.proxyUrl = rawVal;
      if (window.api && window.api.updateAccountProxy) {
        await window.api.updateAccountProxy({ id: currentEditingProxyAccount.id, proxyUrl: rawVal });
      }
      const parsed = parseProxyStringUI(rawVal);
      const display = parsed ? parsed.displayUrl : 'Direct IP';
      appendLog({ message: `✓ Proxy saved for [${currentEditingProxyAccount.name}]: ${display}`, type: 'success' });
      renderAccounts();
      saveAccountsState();
      closeModal();
    });
  }
}

function setupAccountsViewSwitcher() {
  const btnCards = document.getElementById('btnAccountsViewCards');
  const btnTable = document.getElementById('btnAccountsViewTable');

  const updateToggleUI = () => {
    if (btnCards && btnTable) {
      if (accountsViewMode === 'table') {
        btnTable.classList.add('active');
        btnCards.classList.remove('active');
      } else {
        btnCards.classList.add('active');
        btnTable.classList.remove('active');
      }
    }
  };

  if (btnCards) {
    btnCards.addEventListener('click', () => {
      accountsViewMode = 'cards';
      localStorage.setItem('flow_accounts_view_mode', 'cards');
      updateToggleUI();
      renderAccounts();
    });
  }

  if (btnTable) {
    btnTable.addEventListener('click', () => {
      accountsViewMode = 'table';
      localStorage.setItem('flow_accounts_view_mode', 'table');
      updateToggleUI();
      renderAccounts();
    });
  }

  updateToggleUI();
}

// =========================================================================
// CUSTOM SLEEK PROMPT MODAL (RENAME / ADJUST CREDITS - ZERO WINDOW.PROMPT)
// =========================================================================
let currentPromptConfirmCallback = null;

function showPromptModal({ title, subtitle, label, defaultValue = '', type = 'text', hint = '', onConfirm }) {
  const modal = document.getElementById('inputPromptModalBackdrop');
  const titleEl = document.getElementById('inputPromptModalTitle');
  const subtitleEl = document.getElementById('inputPromptModalSubtitle');
  const labelEl = document.getElementById('inputPromptModalLabel');
  const inputEl = document.getElementById('inputPromptModalValue');
  const hintEl = document.getElementById('inputPromptModalHint');
  const btnClose = document.getElementById('btnCloseInputPromptModal');
  const btnCancel = document.getElementById('btnCancelInputPromptModal');
  const btnConfirm = document.getElementById('btnConfirmInputPromptModal');

  if (!modal || !inputEl) return;

  if (titleEl) titleEl.innerText = title || 'Edit';
  if (subtitleEl) subtitleEl.innerText = subtitle || '';
  if (labelEl) labelEl.innerText = label || 'Value:';
  inputEl.type = type;
  inputEl.value = defaultValue;

  if (hintEl) {
    if (hint) {
      hintEl.innerText = hint;
      hintEl.style.display = 'block';
    } else {
      hintEl.style.display = 'none';
    }
  }

  currentPromptConfirmCallback = onConfirm;

  const closeModal = () => {
    modal.classList.remove('open');
    modal.style.display = 'none';
    currentPromptConfirmCallback = null;
  };

  const doConfirm = () => {
    const val = inputEl.value;
    if (typeof currentPromptConfirmCallback === 'function') {
      currentPromptConfirmCallback(val);
    }
    closeModal();
  };

  if (btnClose) btnClose.onclick = closeModal;
  if (btnCancel) btnCancel.onclick = closeModal;
  if (btnConfirm) btnConfirm.onclick = doConfirm;

  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };

  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  };

  modal.classList.add('open');
  modal.style.display = 'flex';
  setTimeout(() => {
    inputEl.focus();
    inputEl.select();
  }, 60);
}

// Dynamically updates Master Checkbox state & Selection Pill
function updateAccountsSelectionState() {
  const total = accounts ? accounts.length : 0;
  const selectedCount = (accounts || []).filter(a => a.selected !== false).length;

  // 1. Update selection pill in header
  const pill = document.getElementById('accountsSelectedPill');
  const pillText = document.getElementById('accountsSelectedText');
  if (pill && pillText) {
    pillText.innerText = `${selectedCount} / ${total} Selected`;
    if (selectedCount === 0) {
      pill.classList.add('none-selected');
    } else {
      pill.classList.remove('none-selected');
    }
  }

  // 2. Update Table master checkbox
  const chkSelectAll = document.getElementById('chkSelectAllAccountsTable');
  if (chkSelectAll) {
    if (total === 0) {
      chkSelectAll.checked = false;
      chkSelectAll.indeterminate = false;
    } else if (selectedCount === total) {
      chkSelectAll.checked = true;
      chkSelectAll.indeterminate = false;
    } else if (selectedCount === 0) {
      chkSelectAll.checked = false;
      chkSelectAll.indeterminate = false;
    } else {
      chkSelectAll.checked = false;
      chkSelectAll.indeterminate = true;
    }
  }
}

function renderAccounts() {
  updateTotalCreditsHeader();

  const dedicatedAccountsGrid = document.getElementById('dedicatedAccountsGrid');
  const dedicatedAccountsTableWrap = document.getElementById('dedicatedAccountsTableWrap');
  const summaryTotalAccounts = document.getElementById('summaryTotalAccounts');
  const summaryReadyAccounts = document.getElementById('summaryReadyAccounts');
  const summaryTotalCredits = document.getElementById('summaryTotalCredits');
  const navAccountsBadge = document.getElementById('navAccountsBadge');

  const btnCards = document.getElementById('btnAccountsViewCards');
  const btnTable = document.getElementById('btnAccountsViewTable');
  if (btnCards && btnTable) {
    if (accountsViewMode === 'table') {
      btnTable.classList.add('active');
      btnCards.classList.remove('active');
    } else {
      btnCards.classList.add('active');
      btnTable.classList.remove('active');
    }
  }

  if (!accounts || accounts.length === 0) {
    if (dedicatedAccountsGrid) {
      dedicatedAccountsGrid.style.display = 'grid';
      dedicatedAccountsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: rgba(14,20,34,0.6); border-radius: 16px; border: 1px dashed rgba(255,255,255,0.15);">
          <div style="font-size: 36px; margin-bottom: 12px; color: #38bdf8;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </div>
          <h3 style="margin-bottom: 8px; color: var(--text-main);">No Google Accounts Added Yet</h3>
          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">Connect multiple Google accounts to rotate generation pools, bypass credit limits, and accelerate parallel AI video output.</p>
          <button class="btn btn-primary" id="btnEmptyAddAccountDedicated">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            + Add First Google Account
          </button>
        </div>
      `;
      const btnEmptyDed = document.getElementById('btnEmptyAddAccountDedicated');
      if (btnEmptyDed) btnEmptyDed.addEventListener('click', handleAddNewAccount);
    }
    if (dedicatedAccountsTableWrap) dedicatedAccountsTableWrap.style.display = 'none';

    if (summaryTotalAccounts) summaryTotalAccounts.innerText = '0';
    if (summaryReadyAccounts) summaryReadyAccounts.innerText = '0';
    if (summaryTotalCredits) summaryTotalCredits.innerText = '0 Credits';
    if (navAccountsBadge) navAccountsBadge.innerText = '0';
    updateAccountsSelectionState();
    return;
  }

  const totalAccounts = accounts.length;
  const connectedAccounts = accounts.filter(a => !!a.email || a.status === 'Ready' || (typeof a.credits === 'number' && a.credits > 0));
  const totalCredits = accounts.reduce((sum, a) => sum + (Number(a.credits) || 0), 0);

  if (summaryTotalAccounts) summaryTotalAccounts.innerText = totalAccounts;
  if (summaryReadyAccounts) summaryReadyAccounts.innerText = connectedAccounts.length;
  if (summaryTotalCredits) summaryTotalCredits.innerText = `${totalCredits.toLocaleString()} Credits`;
  if (navAccountsBadge) navAccountsBadge.innerText = totalAccounts;

  // Helper to attach event listeners to an account container (card or row)
  const attachAccountItemListeners = (container, account) => {
    // 0. Click to copy Gmail directly
    const emailEls = container.querySelectorAll('.btn-copy-account-email');
    emailEls.forEach(el => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (el.dataset.copying === 'true') return;
        const emailToCopy = el.getAttribute('data-email') || account.email;
        if (!emailToCopy || !emailToCopy.includes('@')) return;

        let success = false;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(emailToCopy);
            success = true;
          } catch (err) {
            console.warn('navigator.clipboard failed, attempting fallback', err);
          }
        }
        if (!success) {
          try {
            const ta = document.createElement('textarea');
            ta.value = emailToCopy;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.top = '-9999px';
            ta.setAttribute('readonly', '');
            document.body.appendChild(ta);
            ta.select();
            success = document.execCommand('copy');
            document.body.removeChild(ta);
          } catch (err2) {
            console.error('execCommand copy failed', err2);
          }
        }

        if (success) {
          el.dataset.copying = 'true';
          const originalContent = el.innerHTML;
          el.innerHTML = `<span style="color: #34d399; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;">✓ Copied!</span>`;
          el.classList.add('copied');
          el.title = `Copied: ${emailToCopy}`;

          if (typeof appendLog === 'function') {
            appendLog({ message: `✓ Copied email: ${emailToCopy}`, type: 'success' });
          }

          setTimeout(() => {
            el.innerHTML = originalContent;
            el.classList.remove('copied');
            el.title = `Click to copy: ${emailToCopy}`;
            delete el.dataset.copying;
          }, 1400);
        }
      });
    });

    // 1. Rename on title click (Modal popup - zero window.prompt)
    const nameEl = container.querySelector('.btn-rename-account');
    if (nameEl) {
      nameEl.addEventListener('click', () => {
        showPromptModal({
          title: 'Rename Account',
          subtitle: `Update display label for account [${account.id}]`,
          label: 'Account Name:',
          defaultValue: account.name,
          onConfirm: async (newName) => {
            if (newName && newName.trim().length > 0) {
              account.name = newName.trim();
              renderAccounts();
              saveAccountsState();
            }
          }
        });
      });
    }

    // 2. Credits are strictly synced from Google Flow (Manual edit disabled)

    // 3. Click to configure proxy via dedicated modal
    const btnEditProxy = container.querySelector('.btn-edit-proxy');
    if (btnEditProxy) {
      btnEditProxy.addEventListener('click', () => {
        openProxyModal(account);
      });
    }

    // 4. Sync live credits
    const btnSync = container.querySelector('.btn-sync-credits');
    if (btnSync) {
      btnSync.addEventListener('click', async () => {
        btnSync.disabled = true;
        const originalHtml = btnSync.innerHTML;
        btnSync.innerHTML = `<span class="spinner-small" style="width: 10px; height: 10px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span>`;
        appendLog({ message: `Fetching real Google Flow credits for [${account.name}]...`, type: 'info' });
        if (window.api) {
          try {
            const res = await window.api.refreshAccountCredits(account.id);
            if (res && res.accounts) {
              accounts = res.accounts;
              renderAccounts();
              updateTotalCreditsHeader();
            }
            if (res && res.success && res.account) {
              appendLog({ message: `✓ [${account.name}] has ${Number(res.account.credits || 0).toLocaleString()} live remaining credits!`, type: 'success' });
            } else {
              const errMsg = (res && res.error) || 'Please click Sign In first to connect Google Flow.';
              appendLog({ message: `[${account.name}]: ${errMsg}`, type: 'warn' });
            }
          } catch (e) {
            appendLog({ message: `Sync error for [${account.name}]: ${e.message}`, type: 'error' });
          } finally {
            btnSync.disabled = false;
            btnSync.innerHTML = originalHtml;
          }
        }
      });
    }

    // 5. Sign in / Verify button
    const btnLogin = container.querySelector('.btn-login');
    if (btnLogin) {
      btnLogin.addEventListener('click', async () => {
        if (btnLogin.dataset.state === 'verifying') {
          btnLogin.disabled = true;
          btnLogin.innerHTML = `<span class="spinner-small" style="width: 10px; height: 10px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span> Verifying...`;
          appendLog({ message: `Checking login for [${account.name}]...`, type: 'info' });
          if (window.api && window.api.refreshAccountCredits) {
            const res = await window.api.refreshAccountCredits(account.id);
            if (res && res.success && res.account) {
              appendLog({ message: `✓ [${account.name}] verified successfully! Credits: ${(res.account.credits ?? 0).toLocaleString()}`, type: 'success' });
              accounts = res.accounts || await window.api.getAccounts();
              renderAccounts();
            } else {
              appendLog({ message: `Verification check: ${(res && res.error) || 'Please finish signing in in Chrome, then click Verify again.'}`, type: 'warn' });
              btnLogin.disabled = false;
              btnLogin.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Check / Verify`;
            }
          }
          return;
        }

        btnLogin.disabled = true;
        btnLogin.innerHTML = `<span class="spinner-small" style="width: 10px; height: 10px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span> Opening...`;
        appendLog({ message: `Opening Chrome for [${account.name}]. Sign in, then click "Check / Verify" once done!`, type: 'info' });
        if (window.api) {
          const res = await window.api.openLoginWindow(account.id);
          if (res && res.success) {
            btnLogin.disabled = false;
            btnLogin.dataset.state = 'verifying';
            btnLogin.className = 'btn btn-sm btn-success btn-login';
            btnLogin.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Check / Verify`;
          } else {
            appendLog({ message: `Could not open Chrome for [${account.name}]: ${(res && res.error) || 'Check Chrome Path in Settings'}`, type: 'error' });
            btnLogin.disabled = false;
            const isNeed = account.status === 'Need Login' || (account.lastChecked && account.lastChecked.includes('Sign In needed'));
            btnLogin.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> <span>${isNeed ? 'Sign In' : 'Re-Login'}</span>`;
          }
        }
      });
    }

    // 6. Delete button
    const btnDelete = container.querySelector('.btn-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to remove "${account.name}"?`)) {
          if (window.api) {
            accounts = await window.api.deleteAccount(account.id);
            renderAccounts();
            appendLog({ message: `✓ Account [${account.name}] removed.`, type: 'info' });
          }
        }
      });
    }

    // 7. Row Checkbox for selection (Independent toggle, instantly synchronized)
    const chkRow = container.querySelector('.chk-account-row');
    if (chkRow) {
      chkRow.addEventListener('change', (e) => {
        e.stopPropagation();
        account.selected = chkRow.checked;
        const tr = chkRow.closest('tr');
        if (tr) tr.classList.toggle('row-selected', chkRow.checked);
        updateAccountsSelectionState();
        saveAccountsState();
      });
    }

    // 8. Make the entire checkbox TD cell clickable
    const tdCheckbox = container.querySelector('.td-checkbox');
    if (tdCheckbox && chkRow) {
      tdCheckbox.addEventListener('click', (e) => {
        if (e.target !== chkRow) {
          chkRow.checked = !chkRow.checked;
          chkRow.dispatchEvent(new Event('change'));
        }
      });
    }

    // 9. Bento Card Checkbox
    const chkCard = container.querySelector('.chk-account-card');
    if (chkCard) {
      chkCard.addEventListener('change', (e) => {
        e.stopPropagation();
        account.selected = chkCard.checked;
        container.classList.toggle('card-selected', chkCard.checked);
        updateAccountsSelectionState();
        saveAccountsState();
      });
    }
  };

  // ==========================================
  // MODE 1: BALANCED BENTO CARDS VIEW
  // ==========================================
  if (accountsViewMode === 'cards') {
    if (dedicatedAccountsTableWrap) dedicatedAccountsTableWrap.style.display = 'none';
    if (dedicatedAccountsGrid) {
      dedicatedAccountsGrid.style.display = 'grid';
      dedicatedAccountsGrid.innerHTML = '';

      accounts.forEach((account) => {
        const hasValidEmail = !!account.email && account.email.includes('@');
        const hasCredits = typeof account.credits === 'number' && account.credits > 0;
        const isNeedLogin = account.status === 'Need Login' || (account.lastChecked && account.lastChecked.includes('Sign In needed'));
        const isExplicitExhausted = account.status === 'Exhausted';
        const isLogged = !isNeedLogin && (account.status === 'Ready' || hasCredits);
        const isSelected = account.selected !== false;

        let statusClass = 'not-logged';
        let statusBadgeText = 'Need Login';

        if (isLogged) {
          if (isExplicitExhausted) {
            statusClass = 'exhausted';
            statusBadgeText = '0 Credits';
          } else {
            statusClass = 'ready';
            statusBadgeText = 'Ready';
          }
        }

        const initialLetter = ((account.googleName || account.name || 'G')[0] || 'G').toUpperCase();
        let creditsBadgeInner = '';
        if (isLogged && typeof account.credits === 'number') {
          creditsBadgeInner = `<strong style="font-size: 13.5px; font-weight: 800;">${account.credits.toLocaleString()}</strong>`;
        } else if (isLogged) {
          creditsBadgeInner = `<strong style="font-size: 12px; font-weight: 700; color: #38bdf8;">Unsynced</strong>`;
        } else {
          creditsBadgeInner = `<strong style="font-size: 13px; font-weight: 700; color: #94a3b8;">0</strong>`;
        }

        const dCard = document.createElement('div');
        dCard.className = `dedicated-account-card ${statusClass} ${isSelected ? 'card-selected' : ''}`;
        dCard.dataset.accountId = account.id;
        dCard.innerHTML = `
          <div class="card-top-row">
            <label class="card-checkbox-label" title="Select account for batch queue" style="cursor: pointer; display: flex; align-items: center;" onclick="event.stopPropagation();">
              <input type="checkbox" class="chk-account-card" data-id="${account.id}" ${isSelected ? 'checked' : ''}>
            </label>
            <span class="account-status-tag ${statusClass}">
              <span class="status-dot-tiny ${statusClass}"></span>
              <span>${escapeHtml(statusBadgeText)}</span>
            </span>
          </div>

          <div class="account-identity-center">
            <div class="account-avatar-wrapper">
              <div class="account-avatar-circle">${initialLetter}</div>
              <div class="account-avatar-status-dot"></div>
            </div>
            <div class="account-name-block">
              <span class="account-title-text btn-rename-account" title="${escapeHtml(account.name)} (Click to rename)">
                <span>${escapeHtml(account.name)}</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.5; flex-shrink: 0;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </span>
              <span class="account-email-sub ${hasValidEmail ? 'btn-copy-account-email' : ''}" data-email="${hasValidEmail ? escapeHtml(account.email) : ''}" title="${hasValidEmail ? 'Click to copy: ' + escapeHtml(account.email) : 'Click Sign In'}">
                <span class="email-text-label">${hasValidEmail ? escapeHtml(account.email) : 'Click Sign In'}</span>
                ${hasValidEmail ? `
                  <svg class="copy-email-icon" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" title="Copy Gmail">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>` : ''}
              </span>
            </div>
          </div>

          <div class="card-credits-row" title="Live Flow credits (Sync to update)">
            <div class="card-credits-left">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style="color: ${isExplicitExhausted ? '#ef4444' : (isLogged && typeof account.credits === 'number' && account.credits > 0 ? '#38bdf8' : '#94a3b8')}; flex-shrink: 0;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              <span class="card-credits-num">${creditsBadgeInner}</span>
            </div>
            <button type="button" class="btn-inline-sync btn-sync-credits" title="Sync live Flow credits">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
          </div>

          <div class="card-proxy-row">
            <button type="button" class="proxy-bar-btn btn-edit-proxy ${account.proxyUrl ? 'has-proxy' : ''}" title="${account.proxyUrl ? 'Proxy: ' + escapeHtml(sanitizeProxyUrl(account.proxyUrl)) + ' (Click to change)' : 'Direct IP (Click to configure proxy)'}">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              <span class="proxy-bar-text">${account.proxyUrl ? escapeHtml(sanitizeProxyUrl(account.proxyUrl)) : 'Direct IP'}</span>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: auto; opacity: 0.45; flex-shrink: 0;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
          </div>

          <div class="card-bottom-actions">
            <button class="btn btn-sm ${isNeedLogin ? 'btn-primary' : 'btn-secondary'} btn-login" style="flex: 1; min-width: 0; justify-content: center; padding: 4.5px 2px; font-size: 10px; font-weight: 600;" title="${isNeedLogin ? 'Sign into Google account' : 'Re-open session and re-verify login'}">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              <span>${isNeedLogin ? 'Sign In' : 'Re-Login'}</span>
            </button>
            <button class="btn-delete-card btn-delete" title="Delete Account">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        `;

        attachAccountItemListeners(dCard, account);
        dedicatedAccountsGrid.appendChild(dCard);
      });
    }
  }

  // ==========================================
  // MODE 2: ENTERPRISE DATA TABLE VIEW
  // ==========================================
  else if (accountsViewMode === 'table') {
    if (dedicatedAccountsGrid) dedicatedAccountsGrid.style.display = 'none';
    if (dedicatedAccountsTableWrap) {
      dedicatedAccountsTableWrap.style.display = 'block';

      dedicatedAccountsTableWrap.innerHTML = `
        <table class="dedicated-accounts-table">
          <thead>
            <tr>
              <th class="th-checkbox" style="width: 36px; text-align: center; padding: 10px 4px;">
                <input type="checkbox" id="chkSelectAllAccountsTable" class="chk-account-master" title="Select / Deselect All Accounts">
              </th>
              <th style="width: 18%;">Account Name</th>
              <th style="width: 16%;">Email</th>
              <th style="width: 12%;">Status</th>
              <th style="width: 10%;">Credits</th>
              <th style="width: 12%;">Proxy</th>
              <th style="width: 11%;">Last Checked</th>
              <th style="width: 21%; text-align: right; padding-right: 14px;">Actions</th>
            </tr>
          </thead>
          <tbody id="dedicatedAccountsTableBody"></tbody>
        </table>
      `;

      const tBody = dedicatedAccountsTableWrap.querySelector('#dedicatedAccountsTableBody');
      const chkSelectAll = dedicatedAccountsTableWrap.querySelector('#chkSelectAllAccountsTable');
      if (chkSelectAll) {
        chkSelectAll.addEventListener('change', () => {
          const isChecked = chkSelectAll.checked;
          // Set selection state for all accounts
          accounts.forEach(a => { a.selected = isChecked; });

          // Update all row checkboxes directly without destroying DOM
          const rowCheckboxes = dedicatedAccountsTableWrap.querySelectorAll('.chk-account-row');
          rowCheckboxes.forEach(chk => {
            chk.checked = isChecked;
            const tr = chk.closest('tr');
            if (tr) tr.classList.toggle('row-selected', isChecked);
          });

          // Update all card checkboxes directly if rendered
          const cardCheckboxes = document.querySelectorAll('.chk-account-card');
          cardCheckboxes.forEach(chk => {
            chk.checked = isChecked;
            const card = chk.closest('.dedicated-account-card');
            if (card) card.classList.toggle('card-selected', isChecked);
          });

          // Update selection badge and state
          updateAccountsSelectionState();

          // Persist to store
          saveAccountsState();
        });
      }

      accounts.forEach((account) => {
        const hasValidEmail = !!account.email && account.email.includes('@');
        const hasCredits = typeof account.credits === 'number' && account.credits > 0;
        const isNeedLogin = account.status === 'Need Login' || (account.lastChecked && account.lastChecked.includes('Sign In needed'));
        const isExplicitExhausted = account.status === 'Exhausted';
        const isLogged = !isNeedLogin && (account.status === 'Ready' || hasCredits);
        const isSelected = account.selected !== false;

        let statusClass = 'not-logged';
        let statusBadgeText = 'Need Login';

        if (isLogged) {
          if (isExplicitExhausted) {
            statusClass = 'exhausted';
            statusBadgeText = '0 Credits';
          } else {
            statusClass = 'ready';
            statusBadgeText = 'Ready';
          }
        }

        const initialLetter = ((account.googleName || account.name || 'G')[0] || 'G').toUpperCase();
        let creditsBadgeInner = '';
        if (isLogged && typeof account.credits === 'number') {
          creditsBadgeInner = `<strong>${account.credits.toLocaleString()}</strong>`;
        } else if (isLogged) {
          creditsBadgeInner = `<strong style="color: #38bdf8;">Unsynced</strong>`;
        } else {
          creditsBadgeInner = `<strong style="color: #94a3b8;">0</strong>`;
        }

        const tr = document.createElement('tr');
        tr.className = `${statusClass} ${isSelected ? 'row-selected' : ''}`;
        tr.dataset.accountId = account.id;
        tr.innerHTML = `
          <td class="td-checkbox" style="text-align: center; padding-left: 6px; padding-right: 2px;">
            <input type="checkbox" class="chk-account-row" data-id="${account.id}" ${isSelected ? 'checked' : ''} title="Select account">
          </td>
          <td>
            <div class="table-account-cell">
              <div class="table-avatar-badge ${statusClass}">${initialLetter}</div>
              <div class="table-name-group">
                <span class="table-name-title btn-rename-account" title="Click to rename">
                  <span class="table-name-text">${escapeHtml(account.name)}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.5; flex-shrink: 0;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </span>
              </div>
            </div>
          </td>
          <td>
            <span class="table-email-sub ${hasValidEmail ? 'btn-copy-account-email' : ''}" data-email="${hasValidEmail ? escapeHtml(account.email) : ''}" title="${hasValidEmail ? 'Click to copy: ' + escapeHtml(account.email) : ''}">
              <span class="email-text-label">${hasValidEmail ? escapeHtml(account.email) : '<span style="color: #f59e0b;">No Email</span>'}</span>
              ${hasValidEmail ? `
                <svg class="copy-email-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>` : ''}
            </span>
          </td>
          <td>
            <span class="account-status-tag ${statusClass}">
              <span class="status-dot-tiny ${statusClass}"></span>
              <span>${escapeHtml(statusBadgeText)}</span>
            </span>
          </td>
          <td>
            <div class="table-credits-cell">
              <span class="live-credits-display" style="cursor: default; color: ${isExplicitExhausted ? '#ef4444' : (isLogged && typeof account.credits === 'number' && account.credits > 0 ? '#00f5ff' : '#94a3b8')}; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="Live remaining credits (Sync to update)">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" style="color: ${isLogged && typeof account.credits === 'number' && account.credits > 0 ? '#38bdf8' : '#94a3b8'}; flex-shrink: 0;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                ${creditsBadgeInner}
              </span>
              <button type="button" class="btn-inline-sync btn-sync-credits" title="Sync live Flow credits">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              </button>
            </div>
          </td>
          <td>
            <button type="button" class="proxy-pill-btn btn-edit-proxy ${account.proxyUrl ? 'has-proxy' : ''}" title="${account.proxyUrl ? 'Proxy: ' + escapeHtml(sanitizeProxyUrl(account.proxyUrl)) : 'Click to configure proxy / dedicated IP'}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              <span>${account.proxyUrl ? escapeHtml(sanitizeProxyUrl(account.proxyUrl)) : 'Direct IP'}</span>
            </button>
          </td>
          <td>
            <span class="table-last-checked-cell" title="${account.lastChecked ? escapeHtml(account.lastChecked) : '-'}">${account.lastChecked ? escapeHtml(account.lastChecked) : '-'}</span>
          </td>
          <td style="text-align: right; padding-right: 14px;">
            <div class="table-actions-cell">
              <button class="btn btn-sm ${isNeedLogin ? 'btn-primary' : 'btn-secondary'} btn-login" style="padding: 3.5px 8px; font-size: 11px; font-weight: 600; white-space: nowrap;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                <span>${isNeedLogin ? 'Sign In' : 'Re-Login'}</span>
              </button>
              <button class="btn-delete-card btn-delete" title="Delete Account" style="width: 26px; height: 26px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        `;

        attachAccountItemListeners(tr, account);
        tBody.appendChild(tr);
      });
    }
  }

  // Initial update for selection pills & indeterminate states
  updateAccountsSelectionState();

  // Update summary stats
  if (summaryTotalAccounts) summaryTotalAccounts.innerText = accounts.length;
  if (summaryReadyAccounts) {
    const readyCount = accounts.filter(a => a.status === 'Ready' && typeof a.credits === 'number' && a.credits > 0).length;
    summaryReadyAccounts.innerText = readyCount;
  }
  if (summaryTotalCredits) {
    const total = accounts.reduce((acc, a) => acc + ((a.status === 'Ready' && typeof a.credits === 'number' && a.credits > 0) ? a.credits : 0), 0);
    summaryTotalCredits.innerText = `${total.toLocaleString()} Credits`;
  }
  if (navAccountsBadge) {
    navAccountsBadge.innerText = accounts.length;
  }
}

let isAddingAccount = false;
async function handleAddNewAccount() {
  if (!window.api || isAddingAccount) return;
  isAddingAccount = true;
  const btnDedicated = document.getElementById('btnAddAccountDedicated');
  if (btnDedicated) btnDedicated.disabled = true;
  try {
    const nextNum = (accounts ? accounts.length : 0) + 1;
    const defaultName = `Google Account ${nextNum}`;
    accounts = await window.api.addAccount(defaultName);
    renderAccounts();
    appendLog({ message: `✓ Added new profile [${defaultName}]. Click "⚡ Chrome" or "Sign In" on it to connect your account.`, type: 'success' });
  } catch (err) {
    appendLog({ message: `Failed to add account: ${err.message}`, type: 'error' });
  } finally {
    isAddingAccount = false;
    if (btnDedicated) btnDedicated.disabled = false;
  }
}

async function saveAccountsState() {
  if (window.api) {
    await window.api.saveAccountsState(accounts);
  }
}


function appendLog(logData) {
  const time = logData.timestamp || new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry log-${logData.type || 'info'}`;
  entry.innerText = `[${time}] ${logData.message}`;
  
  terminalLogs.appendChild(entry);
  while (terminalLogs.children.length > 300) {
    terminalLogs.removeChild(terminalLogs.firstChild);
  }
  terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

// 🌟 CREATE LIVE RENDERING CARD IN GALLERY
function createRenderingVideoCard(data) {
  // 1️⃣ Reset & Show Live Active Card on Studio Dashboard in GENERATING mode
  const liveActiveCard = document.getElementById('liveActiveVideoCard');
  if (liveActiveCard) {
    liveActiveCard.style.display = 'block';
    const statusHeader = document.getElementById('liveActiveStatusHeader');
    const pulseDot = document.getElementById('liveActivePulseDot');
    const titleEl = document.getElementById('liveActivePromptTitle');
    const accEl = document.getElementById('liveActiveAccountTag');
    const pctBadge = document.getElementById('liveActivePercentageBadge');
    const timerEl = document.getElementById('liveActiveElapsedTimer');
    const miniBar = document.getElementById('liveActiveMiniProgress');
    const previewBox = document.getElementById('liveActiveVideoPreviewBox');
    const videoEl = document.getElementById('liveActiveVideoElement');
    const progressContainer = document.getElementById('liveActiveProgressContainer');
    const actionsBox = document.getElementById('liveActiveCardActions');

    if (statusHeader) statusHeader.innerText = 'Now Generating on Google Flow';
    if (pulseDot) pulseDot.style.background = '#00f5ff';
    if (titleEl) titleEl.innerText = data.prompt || 'Generating Video...';
    if (accEl) accEl.innerText = '👤 ' + (data.accountName || 'Google Account');
    if (pctBadge) {
      pctBadge.innerText = '⚡ 0%';
      pctBadge.style.background = 'rgba(0, 245, 255, 0.2)';
      pctBadge.style.color = 'var(--primary)';
      pctBadge.style.borderColor = 'rgba(0, 245, 255, 0.4)';
    }
    if (timerEl) timerEl.innerText = '⏱️ Elapsed: 0s';
    if (miniBar) miniBar.style.width = '5%';
    if (progressContainer) progressContainer.style.display = 'block';
    if (previewBox) {
      previewBox.style.display = 'none';
      if (videoEl) { videoEl.pause(); videoEl.src = ''; }
    }
    if (actionsBox) actionsBox.style.display = 'none';
  }

  // 2️⃣ Create Live Video Card in Gallery View
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
  if (galleryCountBadge) galleryCountBadge.innerText = countStr;
  if (navGalleryBadge) navGalleryBadge.innerText = videoCardsMap.size;
  if (videoGalleryContainer) videoGalleryContainer.insertBefore(card, videoGalleryContainer.firstChild);
}

// 🌟 2-STAGE LIVE PROGRESS (GENERATION % -> EXPORT & DOWNLOAD)
function updateRenderingTick(progressData) {
  // 1️⃣ Update Live Active Card on Studio Dashboard
  const liveActiveCard = document.getElementById('liveActiveVideoCard');
  if (liveActiveCard && liveActiveCard.style.display !== 'none') {
    const titleEl = document.getElementById('liveActivePromptTitle');
    const accEl = document.getElementById('liveActiveAccountTag');
    const pctBadge = document.getElementById('liveActivePercentageBadge');
    const timerEl = document.getElementById('liveActiveElapsedTimer');
    const miniBar = document.getElementById('liveActiveMiniProgress');

    if (progressData.prompt && titleEl) titleEl.innerText = progressData.prompt;
    if (progressData.accountName && accEl) accEl.innerText = progressData.accountName;
    if (progressData.elapsed && timerEl) timerEl.innerText = `⏱️ Elapsed: ${progressData.elapsed}s`;
    if (progressData.elapsedSec && timerEl) timerEl.innerText = `⏱️ Elapsed: ${progressData.elapsedSec}s`;

    if (progressData.percentage) {
      if (pctBadge) pctBadge.innerText = `⚡ ${progressData.percentage}`;
      if (miniBar) {
        const num = parseInt(progressData.percentage, 10);
        if (!isNaN(num)) miniBar.style.width = `${Math.max(10, Math.min(100, num))}%`;
      }
    } else if (progressData.statusText) {
      if (pctBadge) pctBadge.innerText = progressData.statusText;
      if (miniBar) miniBar.style.width = '90%';
    }
  }

  // 2️⃣ Update Gallery Card
  const statusEl = document.getElementById(`status_${progressData.id}`);
  const tagEl = document.getElementById(`tag_${progressData.id}`);

  if (progressData.stage === 'download' || progressData.statusText) {
    if (statusEl) {
      statusEl.innerHTML = `<span style="color: #38bdf8; font-weight: 700;">${escapeHtml(progressData.statusText || '📥 Saving Original File...')}</span> (${escapeHtml(String(progressData.elapsed || progressData.elapsedSec || ''))}s)`;
    }
    if (tagEl) {
      tagEl.innerText = `📥 Saving...`;
      tagEl.style.background = 'rgba(56, 189, 248, 0.15)';
      tagEl.style.borderColor = 'rgba(56, 189, 248, 0.4)';
      tagEl.style.color = '#38bdf8';
    }
  } else {
    if (statusEl) {
      statusEl.innerHTML = `⚡ Rendering with Veo... <span style="color: var(--primary); font-weight: 700;">${escapeHtml(String(progressData.percentage || ''))}</span> (${escapeHtml(String(progressData.elapsed || progressData.elapsedSec || ''))}s)`;
    }
    if (tagEl) {
      tagEl.innerText = `Rendering ${progressData.percentage || ''}`;
    }
  }
}

function normalizeMediaSrc(filePath, fallbackUrl = '') {
  if (filePath && typeof filePath === 'string') {
    const normalized = filePath.replace(/\\/g, '/');
    const pathWithLeadingSlash = normalized.startsWith('/') ? normalized : '/' + normalized;
    return `local-video://${encodeURI(pathWithLeadingSlash)}`;
  }
  return /^https?:\/\//i.test(fallbackUrl) ? fallbackUrl : '';
}

async function resolveMediaBlobUrl(filePath, fallbackUrl = '') {
  if (window.api && filePath) {
    try {
      const buffer = await window.api.readVideoBinary(filePath);
      if (buffer && buffer.length > 500) {
        const isImg = isImageFile(filePath);
        const mime = isImg ? 'image/png' : 'video/mp4';
        const blob = new Blob([buffer], { type: mime });
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.warn('resolveMediaBlobUrl error:', err);
    }
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
  if (imageGalleryContainer) imageGalleryContainer.insertBefore(card, imageGalleryContainer.firstChild);

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
      <video preload="none" muted loop playsinline style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px; background: #000;" src="${vidSrc}"></video>
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
      vidEl.preload = 'auto';
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
  if (videoGalleryContainer) videoGalleryContainer.insertBefore(card, videoGalleryContainer.firstChild);

  if (galleryCountBadge) galleryCountBadge.innerText = `${videoCardsMap.size} Videos`;
  if (navGalleryBadge) navGalleryBadge.innerText = videoCardsMap.size;
}

// 🌟 TRANSITION TO PLAYABLE VIDEO / IMAGE
async function completeVideoCard(videoData) {
  console.log('[completeVideoCard] Received completion:', videoData);

  // A policy rejection or failed local download must never be displayed as a
  // playable, successfully saved item.
  const vStatus = String((videoData && videoData.status) || '');
  if (vStatus === 'Filtered by Safety Policy' || 
      vStatus === 'Download failed' || 
      vStatus.includes('Violation') || 
      vStatus.includes('Policy') ||
      vStatus.includes('Safety') ||
      vStatus.includes('Failed')) {
    const card = videoCardsMap.get(videoData.id) || document.getElementById(videoData.id);
    if (card) {
      card.classList.remove('rendering');
      card.classList.add('failed');
      const preview = card.querySelector('.video-card-preview');
      if (preview) {
        preview.innerHTML = `
          <div class="rendering-placeholder" role="status">
            <div style="font-size: 26px; margin-bottom: 8px;">⚠️</div>
            <div class="rendering-status-text">${escapeHtml(videoData.status)}</div>
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
        const mediaSrc = normalizeMediaSrc(videoData.filePath, videoData.videoUrl);
        previewContainer.replaceChildren();
        const vEl = document.createElement('video');
        vEl.controls = true;
        vEl.loop = true;
        vEl.muted = true;
        vEl.playsInline = true;
        vEl.preload = 'metadata';
        vEl.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 8px; background: #000;';
        vEl.src = mediaSrc;
        previewContainer.appendChild(vEl);
        vEl.play().catch(() => {});

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

  // 2️⃣ Update Live Studio Dashboard: Show real embedded video & quick controls!
  const liveActiveCard = document.getElementById('liveActiveVideoCard');
  if (liveActiveCard) {
    liveActiveCard.style.display = 'block';
    const statusHeader = document.getElementById('liveActiveStatusHeader');
    const pulseDot = document.getElementById('liveActivePulseDot');
    const pctBadge = document.getElementById('liveActivePercentageBadge');
    const progressContainer = document.getElementById('liveActiveProgressContainer');
    const previewBox = document.getElementById('liveActiveVideoPreviewBox');
    const videoEl = document.getElementById('liveActiveVideoElement');
    const actionsBox = document.getElementById('liveActiveCardActions');
    const btnPlayCinema = document.getElementById('btnLiveActivePlayCinema');
    const btnOpenFold = document.getElementById('btnLiveActiveOpenFolder');
    const btnCopyPrompt = document.getElementById('btnLiveActiveCopyPrompt');

    if (statusHeader) statusHeader.innerText = 'Latest Generation';
    if (pulseDot) pulseDot.style.background = '#10b981';
    if (pctBadge) {
      pctBadge.innerText = '✓ 100% Ready';
      pctBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      pctBadge.style.color = '#10b981';
      pctBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    }
    if (progressContainer) progressContainer.style.display = 'none';

    if (previewBox && videoEl && videoData.filePath) {
      previewBox.style.display = 'block';
      const mediaSrc = normalizeMediaSrc(videoData.filePath, videoData.videoUrl);
      videoEl.src = mediaSrc;
      videoEl.play().catch(() => {});
      videoEl.onerror = () => {
        resolveMediaBlobUrl(videoData.filePath, videoData.videoUrl).then(blobUrl => {
          if (blobUrl && videoEl) videoEl.src = blobUrl;
        }).catch(() => {});
      };
    }

    if (actionsBox) {
      actionsBox.style.display = 'flex';
      if (btnPlayCinema) {
        btnPlayCinema.onclick = () => openVideoPreviewModal(videoData);
      }
      if (btnOpenFold) {
        btnOpenFold.onclick = () => {
          if (window.api && videoData.filePath) {
            window.api.openFolder(videoData.filePath);
          } else if (window.api && inputDownloadFolder && inputDownloadFolder.value) {
            window.api.openFolder(inputDownloadFolder.value);
          }
        };
      }
      if (btnCopyPrompt) {
        btnCopyPrompt.onclick = (e) => {
          navigator.clipboard.writeText(videoData.prompt || '');
          e.currentTarget.title = '✓ Copied!';
        };
      }
    }
  }

  // 3️⃣ Real-time Gallery Sync: Updates the Videos menu immediately without waiting for entire batch!
  if (typeof syncVideosFromFolder === 'function') {
    syncVideosFromFolder();
  }

  // 4️⃣ Save to persistent generation history & update Recent Generations
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
  renderRecentGenerations();
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
    cinemaStage.replaceChildren();
    if (isImageFile(item.filePath) || item.type === 'Image') {
      const img = document.createElement('img');
      img.src = mediaSrc;
      img.alt = 'Preview';
      img.style.maxHeight = '450px';
      img.style.maxWidth = '100%';
      img.style.borderRadius = '12px';
      img.style.objectFit = 'contain';
      cinemaStage.appendChild(img);
    } else {
      const vidEl = document.createElement('video');
      vidEl.id = 'modalVideoPlayer';
      vidEl.controls = true;
      vidEl.autoplay = true;
      vidEl.loop = true;
      vidEl.playsInline = true;
      vidEl.preload = 'auto';
      vidEl.src = mediaSrc;
      vidEl.style.maxHeight = '450px';
      vidEl.style.maxWidth = '100%';
      vidEl.style.borderRadius = '12px';
      vidEl.style.outline = 'none';
      vidEl.style.background = '#000';
      cinemaStage.appendChild(vidEl);
      vidEl.play().catch(() => {});
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
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        <span>Sync</span>
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
        renderRecentGenerations();
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
    renderRecentGenerations();
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
  renderRecentGenerations();
}

// 🎬 REAL RECENT GENERATIONS SIDEBAR RENDERER (Filters out any fake/placeholder videos)
function renderRecentGenerations() {
  const container = document.getElementById('recentVideosList');
  if (!container) return;

  const list = Array.isArray(generationHistory) ? generationHistory : [];

  if (list.length === 0) {
    container.innerHTML = `
      <div class="recent-empty-state">
        <div class="recent-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        </div>
        <p class="recent-empty-title">No Generations Yet</p>
        <p class="recent-empty-sub">Generated videos will automatically appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  // Show up to 6 real generated items
  const recentItems = list.slice(0, 6);

  recentItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'recent-video-item';

    const safePrompt = escapeHtml(item.prompt || item.fileName || 'Generated Video');
    const safeDuration = escapeHtml(item.duration || '6s');
    const safeRatio = escapeHtml(item.aspectRatio || '16:9');
    const mediaSrc = normalizeMediaSrc(item.filePath, item.videoUrl);
    const isImg = isImageFile(item.filePath) || item.type === 'Image';

    const thumbHtml = isImg
      ? `<img class="recent-thumb" src="${mediaSrc}" alt="${safePrompt}" onerror="this.src='assets/placeholder.jpg'">`
      : `
        <div class="recent-thumb-wrapper">
          <video class="recent-thumb" src="${mediaSrc}" preload="metadata" muted playsinline></video>
          <div class="recent-thumb-play-overlay">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
        </div>
      `;

    card.innerHTML = `
      <div class="recent-thumb-btn" title="Click to play cinema preview">
        ${thumbHtml}
      </div>
      <div class="recent-meta" title="${safePrompt}">
        <h5 class="recent-item-title">${safePrompt}</h5>
        <div class="recent-sub-row">
          <span class="recent-specs">${safeDuration} · ${safeRatio}</span>
          <span class="status-pill-completed">Ready</span>
        </div>
      </div>
      <div class="recent-actions">
        <button type="button" class="btn-recent-icon btn-recent-play" title="Play Cinema Preview">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
        <button type="button" class="btn-recent-icon btn-recent-folder" title="Open in File Explorer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        </button>
      </div>
    `;

    const triggerPlay = () => openVideoPreviewModal(item);
    const thumbBtn = card.querySelector('.recent-thumb-btn');
    if (thumbBtn) thumbBtn.addEventListener('click', triggerPlay);
    const btnPlay = card.querySelector('.btn-recent-play');
    if (btnPlay) btnPlay.addEventListener('click', triggerPlay);

    const btnFolder = card.querySelector('.btn-recent-folder');
    if (btnFolder) {
      btnFolder.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.api && item.filePath) {
          window.api.openFolder(item.filePath);
        } else if (window.api && inputDownloadFolder && inputDownloadFolder.value) {
          window.api.openFolder(inputDownloadFolder.value);
        }
      });
    }

    container.appendChild(card);
  });
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
    const s = (searchTerm || '').toLowerCase();
    return !s || (
      (item.prompt && item.prompt.toLowerCase().includes(s)) ||
      (item.fileName && item.fileName.toLowerCase().includes(s)) ||
      (item.accountName && item.accountName.toLowerCase().includes(s))
    );
  });

  if (navHistoryBadge) navHistoryBadge.innerText = generationHistory.length;
  if (historyTotalVideosCount) historyTotalVideosCount.innerText = generationHistory.length;

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

    // Performance Optimization: Render first 36 items with lightweight on-demand streaming to eliminate lag and hang
    const itemsToRender = filtered.slice(0, 36);

    itemsToRender.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'history-card';
      const ratioBadgeText = escapeHtml(item.aspectRatio || '9:16');
      const isImg = isImageFile(item.filePath);
      const mediaSrc = normalizeMediaSrc(item.filePath, item.videoUrl);
      card.innerHTML = `
        <div class="video-card-preview" style="cursor: pointer;" title="Click to open Cinema Preview">
          <span class="history-ratio-overlay-badge">${ratioBadgeText}</span>
          ${isImg ? `<img src="${mediaSrc}" loading="lazy" alt="${escapeHtml(item.prompt || 'Generated')}">` : `<video loop muted playsinline preload="metadata" src="${mediaSrc}"></video><div class="history-play-overlay"><div class="history-play-icon-circle"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div></div>`}
        </div>
        <div class="history-card-body">
          <div class="history-card-prompt" title="${escapeHtml(item.prompt || '')}">
            ${escapeHtml(item.prompt || 'Untitled Prompt')}
          </div>
          <div class="history-card-meta-row">
            <span class="history-specs-pill">${escapeHtml(item.duration || '6s')}</span>
            <div class="history-card-quick-actions">
              <button type="button" class="btn-history-mini btn-history-rerun" title="Re-Run in Studio">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              </button>
              <button type="button" class="btn-history-mini btn-history-folder" title="Open Folder">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              </button>
              <button type="button" class="btn-history-mini btn-history-copy" title="Copy Prompt">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              </button>
              <button type="button" class="btn-history-mini btn-history-delete" title="Delete">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;

      const vidEl = card.querySelector('video');
      if (vidEl) {
        card.addEventListener('mouseenter', () => vidEl.play().catch(() => {}));
        card.addEventListener('mouseleave', () => vidEl.pause());
      }

      const previewCont = card.querySelector('.video-card-preview');
      if (previewCont) {
        previewCont.addEventListener('click', () => openVideoPreviewModal(item));
      }

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

function cleanPromptText(text) {
  if (!text) return '';
  let s = text.trim();
  // 1. Remove leading scene/shot/timestamp headers:
  // e.g. #0-00, #0:00, #1-03, #1, [Scene 1], Scene 1:, scene 1, Shot 1:, Prompt 1:, 1., etc.
  s = s.replace(/^(?:\[\s*(?:scene|shot|prompt|cut|\d+[-:]\d+|\d+)\s*\]|\((?:scene|shot|prompt|cut|\d+[-:]\d+|\d+)\)|#\s*\d+(?:[-:]\d+)*|(?:scene|shot|prompt|cut)\s*\d+|^\d+[\.\)])\s*[:\-\.]?\s*/i, '');
  // 2. Collapse internal multiple whitespace/newlines within a single prompt into single clean spaces
  s = s.replace(/\r?\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return s;
}

function detectPromptFormat(raw) {
  if (!raw || !raw.trim()) return 'None';
  const text = raw.trim();
  if (/\n\s*[-=*]{3,}\s*\n/.test(text)) return 'Dividers (---)';
  if (/(?:^|\n)\s*#\s*\d+(?:[-:]\d+)*\b/im.test(text)) return 'Timestamp / Shot (#0-00)';
  if (/(?:^|\n)\s*(?:\[\s*(?:scene|shot|prompt|cut)\s*\d+\s*\]|(?:scene|shot|prompt|cut)\s+\d+)\b/im.test(text)) return 'Scene format (scene 1, 2...)';
  if (/^\s*\d+[\.\)]\s+/m.test(text)) return 'Numbered list (1., 2.)';
  if (/\r?\n\s*\r?\n/.test(text)) return 'Paragraph / Blank lines';
  return '1 prompt per line';
}

function getPromptsList() {
  const raw = (promptInput && promptInput.value) ? promptInput.value.trim() : '';
  if (!raw) return [];

  // Strategy 1: Explicit Dividers (--- or === or ***)
  if (/\n\s*[-=*]{3,}\s*\n/.test(raw)) {
    return raw
      .split(/\n\s*[-=*]{3,}\s*\n/)
      .map(cleanPromptText)
      .filter(p => p.length > 0 && !p.startsWith('//'));
  }

  // Strategy 2: Hash / Timestamp headers like #0-00, #0:00, #1-03, #1, #01
  if (/(?:^|\n)\s*#\s*\d+(?:[-:]\d+)*\b/im.test(raw)) {
    const parts = raw.split(/(?=^\s*#\s*\d+(?:[-:]\d+)*\b)/im);
    if (parts.length > 1 || /^\s*#\s*\d+(?:[-:]\d+)*\b/i.test(raw)) {
      const result = parts
        .map(cleanPromptText)
        .filter(p => p.length > 0 && !p.startsWith('//'));
      if (result.length > 0) return result;
    }
  }

  // Strategy 3: Scene / Shot / Cut / Prompt headers like "scene 1", "Scene 02:", "Shot 1 -", "Prompt 1:"
  if (/(?:^|\n)\s*(?:\[\s*(?:scene|shot|prompt|cut)\s*\d+\s*\]|(?:scene|shot|prompt|cut)\s+\d+)\b/im.test(raw)) {
    const parts = raw.split(/(?=^\s*(?:\[\s*(?:scene|shot|prompt|cut)\s*\d+\s*\]|(?:scene|shot|prompt|cut)\s+\d+)\b)/im);
    if (parts.length > 1 || /^\s*(?:\[\s*(?:scene|shot|prompt|cut)\s*\d+\s*\]|(?:scene|shot|prompt|cut)\s+\d+)\b/i.test(raw)) {
      const result = parts
        .map(cleanPromptText)
        .filter(p => p.length > 0 && !p.startsWith('//'));
      if (result.length > 0) return result;
    }
  }

  // Strategy 4: Numbered list format (e.g. 1. prompt... 2. prompt...)
  if (/^\s*\d+[\.\)]\s+/m.test(raw)) {
    const parts = raw.split(/(?=^\s*\d+[\.\)]\s+)/m);
    if (parts.length > 1) {
      const result = parts
        .map(cleanPromptText)
        .filter(p => p.length > 0 && !p.startsWith('//'));
      if (result.length > 0) return result;
    }
  }

  // Strategy 5: Paragraph / Blank-line separation (Multi-line prompts separated by an empty line)
  if (/\r?\n\s*\r?\n/.test(raw)) {
    return raw
      .split(/\r?\n\s*\r?\n+/)
      .map(cleanPromptText)
      .filter(p => p.length > 0 && !p.startsWith('//'));
  }

  // Strategy 6: Standard line-by-line separation (each non-empty line = 1 prompt)
  return raw
    .split(/\r?\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.startsWith('//'));
}

function getShortFormatLabel(raw) {
  const text = (raw || '').trim();
  if (!text) return '';
  if (/\n\s*[-=*]{3,}\s*\n/.test(text)) return 'Dividers';
  if (/(?:^|\n)\s*#\s*\d+(?:[-:]\d+)*\b/im.test(text)) return '#0-00';
  if (/(?:^|\n)\s*(?:\[\s*(?:scene|shot|prompt|cut)\s*\d+\s*\]|(?:scene|shot|prompt|cut)\s+\d+)\b/im.test(text)) return 'Scenes';
  if (/^\s*\d+[\.\)]\s+/m.test(text)) return 'Numbered';
  if (/\r?\n\s*\r?\n/.test(text)) return 'Paragraphs';
  return 'Lines';
}

function updatePromptCount() {
  const raw = (promptInput && promptInput.value) ? promptInput.value : '';
  const list = getPromptsList();
  const el = promptCountBadge || document.getElementById('promptCountBadge');
  const charCounter = document.getElementById('promptCharCounter');
  const formatHint = document.getElementById('promptFormatHint');

  if (charCounter) {
    charCounter.innerText = raw.length > 0 ? `${raw.length.toLocaleString()} chars` : '0 chars';
  }

  if (el) {
    if (list.length > 0) {
      const shortFmt = getShortFormatLabel(raw);
      el.style.display = 'inline-flex';
      el.innerText = `⚡ ${list.length.toLocaleString()} Prompts • ${shortFmt}`;
      if (formatHint) formatHint.style.display = 'none';
    } else {
      el.style.display = 'none';
      if (formatHint) {
        formatHint.style.display = 'inline-block';
        formatHint.innerText = 'Auto-detects: #0-00, scenes, paragraphs, or lines';
      }
    }
  }

  // Also update pairing banner if reference images are loaded
  if (typeof updateRefPairingBanner === 'function') {
    updateRefPairingBanner();
  }
}



// ⚠️ FAILED PROMPTS & RECOVERY QUEUE (V2)
async function syncFailedTasks() {
  if (!window.api) return;
  const failedTasksList = document.getElementById('failedTasksList');
  const failedEmptyState = document.getElementById('failedEmptyState');
  const navFailedBadge = document.getElementById('navFailedBadge');
  const failedQueueCountBadge = document.getElementById('failedQueueCountBadge');
  try {
    const failedTasks = await window.api.getFailedTasks();
    const count = failedTasks ? failedTasks.length : 0;
    if (navFailedBadge) {
      navFailedBadge.innerText = count;
    }
    if (failedQueueCountBadge) {
      failedQueueCountBadge.innerText = `${count} Failed`;
      failedQueueCountBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    if (!failedTasksList) return;
    failedTasksList.innerHTML = '';
    if (!failedTasks || failedTasks.length === 0) {
      if (failedEmptyState) failedEmptyState.style.display = 'block';
      return;
    }
    if (failedEmptyState) failedEmptyState.style.display = 'none';

    failedTasks.forEach(task => {
      const card = document.createElement('div');
      card.className = 'failed-task-card';

      card.innerHTML = `
        <div class="failed-card-topbar">
          <div class="failed-card-meta">
            <span class="failed-badge-pill">Failed</span>
            <span class="failed-time">${new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            ${task.account_id ? `<span class="failed-acc-tag">Account: ${escapeHtml(task.account_id)}</span>` : ''}
          </div>
          <div class="failed-card-actions">
            <button class="btn-failed-action btn-copy-failed-task" title="Copy exact error">
              📋 Copy Error
            </button>
            <button class="btn-failed-action btn-send-studio btn-retry-single" data-id="${task.id}" title="Send prompt back to Studio">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
              Send to Studio
            </button>
          </div>
        </div>
        <div class="failed-prompt-box">
          <div class="failed-prompt-label">Prompt</div>
          <div class="failed-prompt-text">${escapeHtml(task.prompt_text)}</div>
        </div>
        <div class="failed-error-banner">
          <svg class="error-banner-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span class="failed-error-text">${escapeHtml(task.error_message || 'Unknown generation failure')}</span>
        </div>
      `;

      const btnCopyFail = card.querySelector('.btn-copy-failed-task');
      if (btnCopyFail) {
        btnCopyFail.addEventListener('click', () => {
          const errText = `[FAILED PROMPT ERROR]
Time: ${new Date(task.created_at).toLocaleString()}
Prompt: ${task.prompt_text}
Error: ${task.error_message || 'Unknown generation failure'}
Account ID: ${task.account_id || 'N/A'}`;
          navigator.clipboard.writeText(errText).then(() => {
            btnCopyFail.innerText = '✓ Copied!';
            btnCopyFail.classList.add('copied');
            setTimeout(() => {
              btnCopyFail.innerText = '📋 Copy Error';
              btnCopyFail.classList.remove('copied');
            }, 1800);
          });
        });
      }

      card.querySelector('.btn-retry-single').addEventListener('click', () => {
        if (promptInput) {
          if (promptInput.value.trim().length > 0) {
            promptInput.value += '\n\n' + task.prompt_text;
          } else {
            promptInput.value = task.prompt_text;
          }
          updatePromptCount();
        }
        tabBtnStudio.click();
      });

      failedTasksList.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to sync failed tasks:', err);
  }
}

function setupFailedQueueView() {
  const btnRetryAllFailed = document.getElementById('btnRetryAllFailed');
  const btnClearFailedQueue = document.getElementById('btnClearFailedQueue');

  if (btnRetryAllFailed) {
    btnRetryAllFailed.addEventListener('click', async () => {
      if (!window.api) return;
      try {
        const failedTasks = await window.api.getFailedTasks();
        if (!failedTasks || failedTasks.length === 0) {
          alert('No failed tasks to retry.');
          return;
        }
        const failedPrompts = failedTasks.map(t => t.prompt_text).filter(Boolean);
        if (promptInput) {
          promptInput.value = failedPrompts.join('\n\n');
          updatePromptCount();
        }
        await window.api.clearFailedTasks();
        await syncFailedTasks();
        tabBtnStudio.click();
        alert(`Loaded ${failedPrompts.length} failed prompt(s) back into Studio!`);
      } catch (e) {
        alert('Error retrying failed tasks: ' + e.message);
      }
    });
  }

  if (btnClearFailedQueue) {
    btnClearFailedQueue.addEventListener('click', async () => {
      if (!window.api) return;
      if (!confirm('Are you sure you want to clear the failed tasks queue?')) return;
      await window.api.clearFailedTasks();
      await syncFailedTasks();
    });
  }
}

// 👷 WORKER POOL MONITOR CARDS
function updateWorkerCard(worker) {
  const container = document.getElementById('workersListContainer');
  const badge = document.getElementById('activeWorkersBadge');
  if (!container || !worker) return;

  const wKey = worker.workerId || (worker.workerIndex !== undefined ? `worker-${worker.workerIndex}` : (worker.id || 'worker-1'));
  const wNum = (worker.workerIndex !== undefined ? worker.workerIndex + 1 : (worker.workerId ? String(worker.workerId).replace(/\D/g, '') || '1' : (worker.id || '1')));

  let card = document.getElementById(`worker-card-${wKey}`);
  if (!card) {
    card = document.createElement('div');
    card.id = `worker-card-${wKey}`;
    card.className = 'worker-monitor-card';
    container.appendChild(card);
  }

  const statusColors = {
    'idle': '#94a3b8',
    'waiting': '#94a3b8',
    'busy': '#38bdf8',
    'generating': '#38bdf8',
    'completed': '#10b981',
    'error': '#ef4444'
  };
  const rawStatus = String(worker.status || 'Idle').toLowerCase();
  const color = statusColors[rawStatus] || '#38bdf8';
  const statusLabel = rawStatus === 'idle' ? 'Idle' : (rawStatus === 'busy' ? 'Generating' : escapeHtml(worker.status || 'Ready'));

  card.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${color}; box-shadow: 0 0 6px ${color};"></span>
      <span style="font-weight: 600; color: #f1f5f9;">Worker #${wNum}</span>
      <span style="color: #64748b; font-size: 11px;">(${escapeHtml(worker.accountName || 'Active')})</span>
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="status-pill" style="color: ${color}; font-size: 10px; font-weight: 600; text-transform: capitalize; background: rgba(255,255,255,0.04); padding: 2px 8px; border-radius: 4px; border: 1px solid ${color}40;">${statusLabel}</span>
      ${worker.taskText ? `<span style="color: #94a3b8; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px;" title="${escapeHtml(worker.taskText)}">"${escapeHtml(worker.taskText)}"</span>` : ''}
    </div>
  `;

  if (badge) {
    const totalWorkers = container.children.length;
    badge.innerText = `${totalWorkers} Worker${totalWorkers > 1 ? 's' : ''} Active`;
  }
}

function setupEventListeners() {
  const btnViewAllHistory = document.getElementById('btnViewAllHistory');
  if (btnViewAllHistory) {
    btnViewAllHistory.addEventListener('click', () => {
      const tabBtnHistory = document.getElementById('tabBtnHistory');
      if (tabBtnHistory) tabBtnHistory.click();
    });
  }

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

  // Attach sync all credits triggers
  if (btnRefreshAll) btnRefreshAll.addEventListener('click', handleSyncAllCredits);
  if (btnHeaderRefresh) btnHeaderRefresh.addEventListener('click', handleSyncAllCredits);
  if (btnHeaderBadge) btnHeaderBadge.addEventListener('click', handleSyncAllCredits);

  if (promptInput) {
    promptInput.addEventListener('input', updatePromptCount);
    promptInput.addEventListener('paste', () => setTimeout(updatePromptCount, 50));
    promptInput.addEventListener('change', updatePromptCount);
    promptInput.addEventListener('keyup', updatePromptCount);
  }

  const btnPromptFormat = document.getElementById('btnPromptFormat');
  if (btnPromptFormat && promptInput) {
    btnPromptFormat.addEventListener('click', () => {
      const list = getPromptsList();
      if (!list || list.length === 0) {
        alert('Please enter or paste some prompts first.');
        return;
      }
      // Neatly format prompts into clean scene blocks with #01, #02...
      promptInput.value = list.map((p, idx) => `#${String(idx + 1).padStart(2, '0')}\n${p}`).join('\n\n');
      updatePromptCount();
      appendLog({ message: `✓ Formatted ${list.length} prompts cleanly into scene blocks.`, type: 'info' });
    });
  }

  const btnPromptClear = document.getElementById('btnPromptClear');
  if (btnPromptClear && promptInput) {
    btnPromptClear.addEventListener('click', () => {
      promptInput.value = '';
      updatePromptCount();
    });
  }


  if (btnBrowseFolder) {
    btnBrowseFolder.addEventListener('click', async () => {
      if (window.api) {
        const selected = await window.api.selectFolder();
        if (selected) {
          inputDownloadFolder.value = selected;
          await window.api.setSetting('download_folder', selected);
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

  // Quick switch from Studio saved feed to open folder
  const btnQuickOpenFolder = document.getElementById('btnQuickOpenFolder') || document.getElementById('btnQuickGoToGallery');
  if (btnQuickOpenFolder) {
    btnQuickOpenFolder.addEventListener('click', () => {
      if (window.api && inputDownloadFolder && inputDownloadFolder.value) {
        window.api.openFolder(inputDownloadFolder.value);
      }
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

  const btnCopyLastErr = document.getElementById('btnCopyLastError');
  if (btnCopyLastErr) {
    btnCopyLastErr.addEventListener('click', async () => {
      let errorToCopy = null;
      if (window.api && window.api.getDiagnosticsErrors) {
        try {
          const errs = await window.api.getDiagnosticsErrors();
          if (errs && errs.length > 0) errorToCopy = errs[0];
        } catch (e) {}
      }

      let text = '';
      if (errorToCopy) {
        text = `[FLOW STUDIO ERROR REPORT]
Time: ${errorToCopy.displayTime || errorToCopy.timestamp}
Stage: ${errorToCopy.stage}
Error: ${errorToCopy.message}
Account: ${errorToCopy.accountName} (${errorToCopy.accountEmail})
Prompt: ${errorToCopy.promptText}
Remedy: ${errorToCopy.suggestion}
${errorToCopy.stack ? 'Stack:\n' + errorToCopy.stack : ''}`;
      } else {
        const errEls = Array.from(document.querySelectorAll('#terminalLogs .log-error'));
        if (errEls.length > 0) {
          text = errEls[errEls.length - 1].innerText;
        } else {
          text = 'No active errors found in session logs.';
        }
      }

      navigator.clipboard.writeText(text).then(() => {
        btnCopyLastErr.innerText = '✓ Copied!';
        btnCopyLastErr.classList.add('copied');
        setTimeout(() => {
          btnCopyLastErr.innerText = '📋 Copy Last Error';
          btnCopyLastErr.classList.remove('copied');
        }, 1800);
      });
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
      const isImageMode = (currentType === 'Image');

      let selectedAccounts = accounts.filter(a => {
        if (a.selected === false) return false;
        if (a.status === 'Need Login') return false;
        if (isImageMode) return true;
        return Number(a.credits) > 0 || a.status === 'Ready';
      });

      if (prompts.length === 0) {
        alert('Please enter at least one prompt in the text area.');
        return;
      }

      if (selectedAccounts.length === 0) {
        const loggedIn = accounts.filter(a => a.status !== 'Need Login');
        if (loggedIn.length > 0) {
          loggedIn.forEach(a => a.selected = true);
          selectedAccounts = isImageMode ? loggedIn : (loggedIn.filter(a => Number(a.credits) > 0) || [loggedIn[0]]);
          if (selectedAccounts.length === 0) selectedAccounts = [loggedIn[0]];
          renderAccounts();
        } else {
          alert('⚠️ No active Google accounts found in your pool.\n\nPlease open Settings and click Login on your Google account.');
          appendLog({ message: '⚠️ Cannot start queue: No logged-in Google accounts available.', type: 'warn' });
          return;
        }
      }

      let downloadFolder = inputDownloadFolder.value.trim();
      if (!downloadFolder && window.api) {
        downloadFolder = await window.api.getDefaultDownloadPath();
        inputDownloadFolder.value = downloadFolder;
      }

      const activeDurationChip = quickDurationGroup ? quickDurationGroup.querySelector('.param-chip.active, .quick-chip.active') : null;
      const activeRatioChip = quickRatioGroup ? quickRatioGroup.querySelector('.param-chip.active, .quick-chip.active') : null;

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
        canvasStrategy: currentCanvasStrategy || 'fresh',
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

      appendLog({ 
        message: `Initiating ${currentType} (${currentVideoMode}) Queue with ${prompts.length} prompts across ${selectedAccounts.length} Google accounts (${settings.duration} · ${settings.aspectRatio}) [Workers: ${currentConcurrency}x | Headless: ${isHeadlessMode ? 'ON' : 'OFF'}]...`, 
        type: 'info' 
      });

      if (window.api) {
        console.log('Sending startAutomation IPC to main process with direct backend download config...');
        await window.api.startAutomation({
          prompts,
          accounts: selectedAccounts,
          settings,
          downloadFolder,
          concurrency: currentConcurrency,
          headless: isHeadlessMode
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
        showDiagnosticBanner('Human Verification Detected', 'Google requires CAPTCHA or identity verification. Please solve it in the opened Chrome window.', '🚨');
      } else if (logData.message && logData.message.toLowerCase().includes('unusual activity')) {
        showDiagnosticBanner('Google Flow Unusual Activity Alert', 'Google flagged rapid submissions. Engine activated 10s cooldown and automatic tile retry.', '⚠️');
      } else if (logData.message && logData.message.toLowerCase().includes('cooldown')) {
        showDiagnosticBanner('Account Cooldown Active', 'Google Account temporarily throttled. Engine is rotating prompts to the next healthy account.', '⏳');
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
        syncFailedTasks();
        syncVideosFromFolder();
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
        syncFailedTasks();
      }
    });

    // Real-time Concurrent Worker Updates
    window.api.onWorkerUpdate((worker) => {
      updateWorkerCard(worker);
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
          appendLog({ message: `🎉 [${acc.name}] is successfully connected as ${acc.email || 'Google User'} (${acc.credits.toLocaleString()} live credits)!`, type: 'success' });
        } else {
          appendLog({ message: `Google account profile updated.`, type: 'info' });
        }
      }
    });

    // 💳 Real-Time Live Accounts & Credits Stream
    if (window.api.onAccountUpdated) {
      window.api.onAccountUpdated((data) => {
        if (data && Array.isArray(data.accounts)) {
          accounts = data.accounts;
          renderAccounts();
          updateTotalCreditsHeader();
        } else if (data && data.account) {
          const acc = data.account;
          const idx = accounts.findIndex(a => a.id === acc.id);
          if (idx !== -1) {
            accounts[idx] = { ...accounts[idx], ...acc };
          } else {
            accounts.push(acc);
          }
          renderAccounts();
          updateTotalCreditsHeader();
          if (acc.status === 'Exhausted' || acc.credits === 0) {
            appendLog({ message: `⚠️ [${acc.name}] has 0 credits remaining (Quota Exhausted)!`, type: 'warn' });
          }
        }
      });
    }

    if (window.api.onCreditsUpdated) {
      window.api.onCreditsUpdated((data) => {
        if (data && Array.isArray(data.accounts)) {
          accounts = data.accounts;
          renderAccounts();
          updateTotalCreditsHeader();
        }
      });
    }
  }
}

// 🩺 SYSTEM DIAGNOSTICS & LIVE HEALTH MONITOR
let latestDiagnosticsData = null;

function setupDiagnosticsView() {
  const btnRunHealthScan = document.getElementById('btnRunHealthScan');
  const btnReleaseLocks = document.getElementById('btnReleaseLocks');
  const btnAutoHeal = document.getElementById('btnAutoHeal');
  const btnCopyDiagReport = document.getElementById('btnCopyDiagReport');

  if (btnRunHealthScan) {
    btnRunHealthScan.addEventListener('click', () => {
      runLiveDiagnostics(false);
    });
  }

  if (btnReleaseLocks) {
    btnReleaseLocks.addEventListener('click', async () => {
      btnReleaseLocks.disabled = true;
      btnReleaseLocks.innerHTML = `<span class="spinner-small" style="width: 10px; height: 10px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span> Releasing...`;
      try {
        if (window.api && window.api.releaseLocks) {
          const res = await window.api.releaseLocks();
          appendLog({ message: `🧹 Released Chrome singleton locks across ${res.cleanedCount || 0} profiles.`, type: 'success' });
        }
        await runLiveDiagnostics(false);
      } catch (e) {
        appendLog({ message: `Error releasing locks: ${e.message}`, type: 'error' });
      } finally {
        btnReleaseLocks.disabled = false;
        btnReleaseLocks.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Release Chrome Locks`;
      }
    });
  }

  if (btnAutoHeal) {
    btnAutoHeal.addEventListener('click', async () => {
      btnAutoHeal.disabled = true;
      btnAutoHeal.innerHTML = `<span class="spinner-small" style="width: 10px; height: 10px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span> Healing...`;
      try {
        if (window.api && window.api.autoHeal) {
          const res = await window.api.autoHeal({ downloadFolder: inputDownloadFolder ? inputDownloadFolder.value : null });
          appendLog({ message: `🩺 [Auto-Doctor]: ${res.message || 'System auto-healed successfully!'}`, type: 'success' });
          if (res.health) {
            renderDiagnosticsUI(res.health);
          }
        }
        accounts = await window.api.getAccounts();
        renderAccounts();
        updateTotalCreditsHeader();
        syncFailedTasks();
      } catch (e) {
        appendLog({ message: `Auto-heal error: ${e.message}`, type: 'error' });
      } finally {
        btnAutoHeal.disabled = false;
        btnAutoHeal.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg> 🩺 1-Click Auto-Heal`;
      }
    });
  }

  if (btnCopyDiagReport) {
    btnCopyDiagReport.addEventListener('click', () => {
      if (!latestDiagnosticsData) {
        alert('Please click "Run Full Scan" first.');
        return;
      }
      const summaryText = `Flow Studio V2 Diagnostics Report:
Time: ${latestDiagnosticsData.timestamp}
Overall Status: ${latestDiagnosticsData.overallStatus}
Accounts: ${latestDiagnosticsData.pillars.accounts.ready} ready of ${latestDiagnosticsData.pillars.accounts.total} (${latestDiagnosticsData.pillars.accounts.totalCredits} credits)
Network: ${latestDiagnosticsData.pillars.network.reachable ? 'Online (' + latestDiagnosticsData.pillars.network.latencyMs + 'ms)' : 'Offline'}
Storage: ${latestDiagnosticsData.pillars.storage.folderPath} (Writable: ${latestDiagnosticsData.pillars.storage.writable})
FFmpeg: ${latestDiagnosticsData.pillars.ffmpeg.message}
Failed Tasks: ${latestDiagnosticsData.pillars.queue.totalFailed}
Active Alerts: ${JSON.stringify(latestDiagnosticsData.alerts, null, 2)}`;

      navigator.clipboard.writeText(summaryText).then(() => {
        btnCopyDiagReport.innerText = '✓ Copied!';
        setTimeout(() => {
          btnCopyDiagReport.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Report`;
        }, 1800);
      });
    });
  }

  const btnClearDiagErr = document.getElementById('btnClearDiagErrors');
  if (btnClearDiagErr) {
    btnClearDiagErr.addEventListener('click', async () => {
      if (window.api && window.api.clearDiagnosticsErrors) {
        await window.api.clearDiagnosticsErrors();
        await runLiveDiagnostics(false);
      }
    });
  }

  const btnCopyAllDiag = document.getElementById('btnCopyAllErrors');
  if (btnCopyAllDiag) {
    btnCopyAllDiag.addEventListener('click', () => {
      if (!latestDiagnosticsData) {
        alert('Please run a diagnostics scan first.');
        return;
      }
      const dumpText = formatAllDiagnosticsErrors(latestDiagnosticsData);
      navigator.clipboard.writeText(dumpText).then(() => {
        btnCopyAllDiag.innerText = '✓ Copied!';
        btnCopyAllDiag.classList.add('copied');
        setTimeout(() => {
          btnCopyAllDiag.innerText = '📋 Copy All Errors';
          btnCopyAllDiag.classList.remove('copied');
        }, 1800);
      });
    });
  }
}

function formatAllDiagnosticsErrors(data) {
  if (!data) return 'No diagnostics data available.';
  let out = `FLOW STUDIO V2 DIAGNOSTICS - ERROR DUMP\nTimestamp: ${data.timestamp || new Date().toISOString()}\nOverall Status: ${data.overallStatus}\n\n`;

  if (data.runtimeErrors && data.runtimeErrors.length > 0) {
    out += `--- LIVE RUNTIME ERRORS (${data.runtimeErrors.length}) ---\n`;
    data.runtimeErrors.forEach((e, idx) => {
      out += `[#${idx + 1}] Stage: ${e.stage} | Time: ${e.displayTime || e.timestamp}\n`;
      out += `Account: ${e.accountName} (${e.accountEmail})\n`;
      if (e.promptText && e.promptText !== 'N/A') out += `Prompt: "${e.promptText}"\n`;
      out += `Error: ${e.message}\n`;
      out += `Remedy: ${e.suggestion}\n`;
      if (e.stack) out += `Stack:\n${e.stack}\n`;
      out += '\n';
    });
  }

  if (data.pillars && data.pillars.queue && data.pillars.queue.issues && data.pillars.queue.issues.length > 0) {
    out += `--- QUEUE & PROMPT ISSUES (${data.pillars.queue.issues.length}) ---\n`;
    data.pillars.queue.issues.forEach((q, idx) => {
      out += `[#${idx + 1}] Category: ${q.category} | Prompt #${q.promptIndex + 1}\n`;
      out += `Prompt: "${q.promptText}"\n`;
      out += `Error: ${q.rawError}\n`;
      out += `Fix: ${q.suggestion}\n\n`;
    });
  }

  if (data.alerts && data.alerts.length > 0) {
    out += `--- SYSTEM ALERTS (${data.alerts.length}) ---\n`;
    data.alerts.forEach((a, idx) => {
      out += `[#${idx + 1}] ${a.title}: ${a.description} (Remedy: ${a.action})\n`;
    });
  }

  return out;
}

async function runLiveDiagnostics(isAuto = false) {
  if (!window.api || !window.api.runHealthCheck) return;
  const btnRun = document.getElementById('btnRunHealthScan');
  if (btnRun && !isAuto) {
    btnRun.disabled = true;
    btnRun.innerHTML = `<span class="spinner-small" style="width: 10px; height: 10px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite;"></span> Scanning...`;
  }

  try {
    const health = await window.api.runHealthCheck({
      downloadFolder: inputDownloadFolder ? inputDownloadFolder.value : null
    });
    latestDiagnosticsData = health;
    renderDiagnosticsUI(health);
  } catch (err) {
    console.error('Error running health check:', err);
  } finally {
    if (btnRun && !isAuto) {
      btnRun.disabled = false;
      btnRun.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg> Run Full Scan`;
    }
  }
}

function renderDiagnosticsUI(health) {
  if (!health) return;

  // 1. Hero Status
  const orb = document.getElementById('diagGlobalPulseOrb');
  const title = document.getElementById('diagGlobalStatusText');
  const badge = document.getElementById('diagGlobalStatusBadge');
  const lastScan = document.getElementById('diagLastScanText');
  const navBadge = document.getElementById('navDiagnosticsBadge');

  if (orb) {
    orb.className = `diag-pulse-orb status-${health.overallStatus || 'healthy'}`;
  }

  const runtimeErrors = health.runtimeErrors || [];
  const issuesCount = (health.alerts ? health.alerts.length : 0) + (health.pillars.queue ? health.pillars.queue.totalFailed : 0) + runtimeErrors.length;

  if (health.overallStatus === 'healthy' && issuesCount === 0) {
    if (title) title.innerText = 'All Systems Normal & Healthy';
    if (badge) {
      badge.innerText = '100% Operational';
      badge.style.background = 'rgba(16, 185, 129, 0.15)';
      badge.style.color = '#34d399';
      badge.style.borderColor = 'rgba(16, 185, 129, 0.35)';
    }
    if (navBadge) {
      navBadge.innerText = 'OK';
      navBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      navBadge.style.color = '#4ade80';
    }
  } else if (health.overallStatus === 'critical') {
    if (title) title.innerText = `Critical Problem: ${health.alerts[0]?.title || 'System Interrupted'}`;
    if (badge) {
      badge.innerText = `${issuesCount} Issue${issuesCount === 1 ? '' : 's'} Detected`;
      badge.style.background = 'rgba(239, 68, 68, 0.15)';
      badge.style.color = '#f87171';
      badge.style.borderColor = 'rgba(239, 68, 68, 0.35)';
    }
    if (navBadge) {
      navBadge.innerText = `${issuesCount}!`;
      navBadge.style.background = 'rgba(239, 68, 68, 0.2)';
      navBadge.style.color = '#f87171';
    }
  } else {
    if (title) title.innerText = `Attention Needed: ${issuesCount} Item${issuesCount === 1 ? '' : 's'}`;
    if (badge) {
      badge.innerText = `Warning (${issuesCount})`;
      badge.style.background = 'rgba(245, 158, 11, 0.15)';
      badge.style.color = '#fbbf24';
      badge.style.borderColor = 'rgba(245, 158, 11, 0.35)';
    }
    if (navBadge) {
      navBadge.innerText = `${issuesCount}`;
      navBadge.style.background = 'rgba(245, 158, 11, 0.2)';
      navBadge.style.color = '#fbbf24';
    }
  }

  if (lastScan) lastScan.innerText = `Last scanned: ${health.timestamp || 'Just now'}`;

  // 2. Pillar 1: Accounts & Sessions
  const acc = health.pillars.accounts;
  const pAccStatus = document.getElementById('pillarAccountsStatus');
  const pAccMetric = document.getElementById('pillarAccountsMetric');
  const pAccSub = document.getElementById('pillarAccountsSub');
  if (pAccStatus) {
    pAccStatus.innerText = acc.lockedCount > 0 ? '⚠️ Locked' : (acc.ready > 0 ? '✓ Ready' : '🔴 Needs Attention');
    pAccStatus.style.color = acc.lockedCount > 0 ? '#fbbf24' : (acc.ready > 0 ? '#34d399' : '#f87171');
  }
  if (pAccMetric) pAccMetric.innerText = `${acc.ready} / ${acc.total} Ready`;
  if (pAccSub) pAccSub.innerText = `${acc.totalCredits.toLocaleString()} Pool Credits (${acc.lockedCount} Locked Profile${acc.lockedCount === 1 ? '' : 's'})`;

  // 3. Pillar 2: Google Flow Reachability
  const net = health.pillars.network;
  const pNetStatus = document.getElementById('pillarNetworkStatus');
  const pNetMetric = document.getElementById('pillarNetworkMetric');
  const pNetSub = document.getElementById('pillarNetworkSub');
  if (pNetStatus) {
    pNetStatus.innerText = net.reachable ? '✓ Online' : '🔴 Unreachable';
    pNetStatus.style.color = net.reachable ? '#34d399' : '#f87171';
  }
  if (pNetMetric) pNetMetric.innerText = net.reachable ? `${net.latencyMs} ms` : 'Offline';
  if (pNetSub) pNetSub.innerText = net.message || 'https://flow.google.com';

  // 4. Pillar 3: Automation Pipeline Radar
  const pPipeStatus = document.getElementById('pillarPipelineStatus');
  const pPipeMetric = document.getElementById('pillarPipelineMetric');
  const pPipeSub = document.getElementById('pillarPipelineSub');
  if (window.api && window.api.getDiagnosticsTelemetry) {
    window.api.getDiagnosticsTelemetry().then(t => {
      if (pPipeStatus) pPipeStatus.innerText = t.isQueueRunning ? '⚡ Running' : 'Idle';
      if (pPipeMetric) pPipeMetric.innerText = t.isQueueRunning ? `${t.workers.length} Worker Active` : 'Queue Idle';
      if (pPipeSub) pPipeSub.innerText = t.isQueueRunning ? (t.workers[0]?.currentStage || 'Generating') : 'Ready for batch';
    }).catch(() => {});
  }

  // 5. Pillar 4: Storage & Permissions
  const st = health.pillars.storage;
  const pStStatus = document.getElementById('pillarStorageStatus');
  const pStMetric = document.getElementById('pillarStorageMetric');
  const pStSub = document.getElementById('pillarStorageSub');
  if (pStStatus) {
    pStStatus.innerText = st.writable ? '✓ Writable' : '🔴 Read-Only';
    pStStatus.style.color = st.writable ? '#34d399' : '#f87171';
  }
  if (pStMetric) pStMetric.innerText = st.writable ? 'Disk Ready' : 'Permission Error';
  if (pStSub) pStSub.innerText = st.folderPath ? st.folderPath.split('\\').pop() : 'Downloads';

  // 6. Pillar 5: FFmpeg Engine
  const ff = health.pillars.ffmpeg;
  const pFfStatus = document.getElementById('pillarFFmpegStatus');
  const pFfMetric = document.getElementById('pillarFFmpegMetric');
  const pFfSub = document.getElementById('pillarFFmpegSub');
  if (pFfStatus) {
    pFfStatus.innerText = ff.available ? '✓ Operational' : '⚠️ Missing';
    pFfStatus.style.color = ff.available ? '#34d399' : '#fbbf24';
  }
  if (pFfMetric) pFfMetric.innerText = ff.available ? 'Ready' : 'Not Detected';
  if (pFfSub) pFfSub.innerText = ff.version || 'FFmpeg media binary';

  // 7. Problem & Error Inspector
  const issuesCont = document.getElementById('diagIssuesListContainer');
  const issuesCountBadge = document.getElementById('diagActiveIssuesCount');
  if (issuesCountBadge) issuesCountBadge.innerText = `${issuesCount} Active Issue${issuesCount === 1 ? '' : 's'}`;

  if (issuesCont) {
    issuesCont.innerHTML = '';
    const allAlerts = [...(health.alerts || [])];
    const queueIssues = (health.pillars.queue && health.pillars.queue.issues) ? health.pillars.queue.issues : [];

    if (allAlerts.length === 0 && queueIssues.length === 0 && runtimeErrors.length === 0) {
      issuesCont.innerHTML = `
        <div style="text-align: center; padding: 28px 16px; background: rgba(16, 185, 129, 0.05); border: 1px dashed rgba(16, 185, 129, 0.2); border-radius: 10px;">
          <div style="font-size: 24px; margin-bottom: 6px;">🎉</div>
          <p style="font-size: 13px; font-weight: 700; color: #34d399; margin: 0 0 4px 0;">No Active Issues Detected</p>
          <span style="font-size: 11px; color: #94a3b8;">All accounts, Google Flow connection, and queue tasks are operating normally.</span>
        </div>
      `;
    } else {
      // 1. Render live runtime errors (highest priority with exact failing pipeline stage)
      runtimeErrors.forEach(err => {
        const item = document.createElement('div');
        item.className = 'diag-live-error-card';
        item.innerHTML = `
          <div class="diag-live-error-header">
            <span class="diag-live-error-stage">🚨 Stage: ${escapeHtml(err.stage)}</span>
            <span class="diag-live-error-time">${escapeHtml(err.displayTime || err.timestamp)}</span>
          </div>
          <div class="diag-live-error-msg">${escapeHtml(err.message)}</div>
          ${err.promptText && err.promptText !== 'N/A' ? `<div style="font-size: 11.5px; color: #94a3b8; margin: 2px 0;">Prompt: <span style="color: #e2e8f0; font-family: 'Inter', sans-serif;">"${escapeHtml(err.promptText)}"</span></div>` : ''}
          ${err.accountName && err.accountName !== 'N/A' ? `<div style="font-size: 11px; color: #64748b; margin: 2px 0;">Account: ${escapeHtml(err.accountName)} (${escapeHtml(err.accountEmail)})</div>` : ''}
          ${err.stack ? `<pre class="diag-live-error-details">${escapeHtml(err.stack.split('\\n').slice(0, 5).join('\\n'))}</pre>` : ''}
          <div class="diag-live-error-footer">
            <div class="diag-live-error-suggestion">
              <span>💡</span> <span>${escapeHtml(err.suggestion)}</span>
            </div>
            <button class="btn-copy-error btn-copy-single-err" title="Copy exact error to clipboard">📋 Copy Error</button>
          </div>
        `;
        const copyBtn = item.querySelector('.btn-copy-single-err');
        copyBtn.addEventListener('click', () => {
          const copyText = `[FLOW STUDIO ERROR REPORT]
Time: ${err.displayTime || err.timestamp}
Stage: ${err.stage}
Error: ${err.message}
Account: ${err.accountName} (${err.accountEmail})
Prompt: ${err.promptText}
Remedy: ${err.suggestion}
${err.stack ? 'Stack:\n' + err.stack : ''}`;
          navigator.clipboard.writeText(copyText).then(() => {
            copyBtn.innerText = '✓ Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
              copyBtn.innerText = '📋 Copy Error';
              copyBtn.classList.remove('copied');
            }, 1800);
          });
        });
        issuesCont.appendChild(item);
      });

      // 2. Render system alerts
      allAlerts.forEach(al => {
        const item = document.createElement('div');
        item.className = 'diag-issue-card error';
        item.innerHTML = `
          <div class="diag-issue-top">
            <span class="diag-issue-category">${escapeHtml(al.title)}</span>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn-copy-error btn-copy-alert-err" title="Copy alert details">📋 Copy Alert</button>
              <span class="diag-issue-meta" style="color: #f87171; font-weight: 700;">System Alert</span>
            </div>
          </div>
          <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">${escapeHtml(al.description)}</div>
          <div class="diag-issue-remedy" style="margin-top: 6px;">
            <span>💡 Suggested Remedy:</span> <strong>${escapeHtml(al.action)}</strong>
          </div>
        `;
        const copyBtn = item.querySelector('.btn-copy-alert-err');
        copyBtn.addEventListener('click', () => {
          const alertText = `[SYSTEM ALERT]: ${al.title}\nDescription: ${al.description}\nSuggested Remedy: ${al.action}`;
          navigator.clipboard.writeText(alertText).then(() => {
            copyBtn.innerText = '✓ Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
              copyBtn.innerText = '📋 Copy Alert';
              copyBtn.classList.remove('copied');
            }, 1800);
          });
        });
        issuesCont.appendChild(item);
      });

      // 3. Render queue / prompt issues
      queueIssues.forEach(qi => {
        const item = document.createElement('div');
        item.className = `diag-issue-card ${qi.severity === 'error' ? 'error' : ''}`;
        item.innerHTML = `
          <div class="diag-issue-top">
            <span class="diag-issue-category">${escapeHtml(qi.category)}</span>
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn-copy-error btn-copy-queue-err" title="Copy prompt error">📋 Copy Error</button>
              <span class="diag-issue-meta">Prompt #${qi.promptIndex + 1} • Account: ${escapeHtml(qi.assignedAccount)}</span>
            </div>
          </div>
          <div class="diag-issue-prompt">"${escapeHtml(qi.promptText)}"</div>
          <div style="font-size: 11px; color: #94a3b8; margin: 4px 0;">Raw error: <code style="color: #fca5a5;">${escapeHtml(qi.rawError || 'Unknown')}</code></div>
          <div class="diag-issue-remedy">
            <span>💡 Fix:</span> <span>${escapeHtml(qi.suggestion)}</span>
          </div>
        `;
        const copyBtn = item.querySelector('.btn-copy-queue-err');
        copyBtn.addEventListener('click', () => {
          const queueText = `[QUEUE ERROR]: ${qi.category}\nPrompt #${qi.promptIndex + 1}: ${qi.promptText}\nAccount: ${qi.assignedAccount}\nRaw Error: ${qi.rawError}\nFix: ${qi.suggestion}`;
          navigator.clipboard.writeText(queueText).then(() => {
            copyBtn.innerText = '✓ Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
              copyBtn.innerText = '📋 Copy Error';
              copyBtn.classList.remove('copied');
            }, 1800);
          });
        });
        issuesCont.appendChild(item);
      });
    }
  }

  // 8. Technical Environment Specs
  const specsCont = document.getElementById('diagSpecsGrid');
  if (specsCont) {
    specsCont.innerHTML = `
      <div class="diag-spec-item">
        <span class="diag-spec-name">Runtime Platform</span>
        <span class="diag-spec-val">${navigator.platform || 'Windows'}</span>
      </div>
      <div class="diag-spec-item">
        <span class="diag-spec-name">Google Accounts</span>
        <span class="diag-spec-val">${acc.total} Profiles (${acc.ready} Ready)</span>
      </div>
      <div class="diag-spec-item">
        <span class="diag-spec-name">Total Pool Credits</span>
        <span class="diag-spec-val">${acc.totalCredits.toLocaleString()} Credits</span>
      </div>
      <div class="diag-spec-item">
        <span class="diag-spec-name">Flow Server Latency</span>
        <span class="diag-spec-val">${net.latencyMs} ms (${net.statusCode || 'OK'})</span>
      </div>
      <div class="diag-spec-item">
        <span class="diag-spec-name">Storage Folder</span>
        <span class="diag-spec-val" title="${escapeHtml(st.folderPath || '')}">${escapeHtml(st.folderPath ? st.folderPath.split('\\').pop() : 'Downloads')}</span>
      </div>
      <div class="diag-spec-item">
        <span class="diag-spec-name">Database Engine</span>
        <span class="diag-spec-val">SQLite WASM (flow_studio_v2.db)</span>
      </div>
    `;
  }
}

async function init() {
  setupNavigation();
  setupSettingsModal();
  setupDedicatedSettings();
  setupChromeProfilesModal();
  setupProxyModal();
  setupAccountsViewSwitcher();
  setupFailedQueueView();
  setupDiagnosticsView();
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
    updateTotalCreditsHeader();

    // Credits are loaded immediately from local store; user can refresh live anytime via header sync button

    // Load saved download directory or fallback to default
    const savedFolder = await window.api.getSetting('download_folder');
    if (savedFolder && inputDownloadFolder) {
      inputDownloadFolder.value = savedFolder;
    } else {
      const defFolder = await window.api.getDefaultDownloadPath();
      if (defFolder && inputDownloadFolder) {
        inputDownloadFolder.value = defFolder;
      }
    }

    // Load saved Chrome executable path or auto-detect
    const inputChrome = document.getElementById('inputChromePath');
    if (inputChrome) {
      const savedChrome = await window.api.getSetting('chrome_path');
      if (savedChrome) {
        inputChrome.value = savedChrome;
      } else {
        const detectedChrome = await window.api.getChromePath();
        if (detectedChrome) inputChrome.value = detectedChrome;
      }
    }

    if (typeof syncVideosFromFolder === 'function') syncVideosFromFolder();
    if (typeof syncImagesFromFolder === 'function') syncImagesFromFolder();
    if (typeof syncHistoryFromFolder === 'function') syncHistoryFromFolder();
    syncFailedTasks();
    runLiveDiagnostics(true);
  }

  renderRecentGenerations();
  updatePromptCount();
}

// Start
init();
