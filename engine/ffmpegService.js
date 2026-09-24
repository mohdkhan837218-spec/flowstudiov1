const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class FFmpegService {
  /**
   * Stitches multiple video files into a single master video file.
   * Uses ultra-fast stream copying (-c copy) by default for zero quality loss.
   * Falls back to re-encoding if video parameters differ.
   */
  static async stitchVideos(videoPaths, outputPath, onProgress = () => {}) {
    if (!videoPaths || videoPaths.length === 0) {
      throw new Error('No video files provided for stitching.');
    }

    const validPaths = videoPaths.filter(p => fs.existsSync(p));
    if (validPaths.length === 0) {
      throw new Error('None of the provided video files exist on disk.');
    }

    if (validPaths.length === 1) {
      // Single video: just copy or strip
      fs.copyFileSync(validPaths[0], outputPath);
      return outputPath;
    }

    const tempDir = os.tmpdir();
    const concatListPath = path.join(tempDir, `flow_stitch_${Date.now()}.txt`);

    // Create FFmpeg concat list
    // Each line: file 'C:\\path\\to\\file.mp4' (escaping single quotes)
    const fileLines = validPaths.map(p => {
      const escaped = p.replace(/\\/g, '/').replace(/'/g, "'\\''");
      return `file '${escaped}'`;
    }).join('\n');

    fs.writeFileSync(concatListPath, fileLines, 'utf8');

    try {
      // First attempt: Fast lossless stream copy (-c copy)
      const copyArgs = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-c', 'copy',
        '-movflags', '+faststart',
        '-y',
        outputPath
      ];

      try {
        await this._runFFmpeg(copyArgs, onProgress);
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          return outputPath;
        }
      } catch (copyErr) {
        console.warn('[FFmpeg Copy failed, falling back to clean re-encode]:', copyErr.message);
      }

      // Fallback attempt: Clean re-encode with high quality preset
      const reencodeArgs = [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '18',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', '+faststart',
        '-y',
        outputPath
      ];

      await this._runFFmpeg(reencodeArgs, onProgress);

      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
        throw new Error('Stitching failed: Output file was not generated.');
      }

      return outputPath;
    } finally {
      if (fs.existsSync(concatListPath)) {
        try { fs.unlinkSync(concatListPath); } catch (e) {}
      }
    }
  }

  /**
   * Strips all AI generation tags, encoder signatures, and SynthID metadata
   * from an MP4 file so it appears completely organic to social media algorithms.
   */
  static async stripMetadata(inputPath, outputPath = null) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const targetOutput = outputPath || inputPath.replace(/\.mp4$/i, '_clean.mp4');
    const isSameFile = (targetOutput === inputPath);
    const actualOutput = isSameFile ? inputPath.replace(/\.mp4$/i, `_tmp_${Date.now()}.mp4`) : targetOutput;

    const args = [
      '-i', inputPath,
      '-map_metadata', '-1',
      '-c:v', 'copy',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      '-y',
      actualOutput
    ];

    try {
      await this._runFFmpeg(args);

      if (isSameFile) {
        fs.unlinkSync(inputPath);
        fs.renameSync(actualOutput, inputPath);
        return inputPath;
      }

      return targetOutput;
    } catch (err) {
      if (isSameFile && fs.existsSync(actualOutput)) {
        try { fs.unlinkSync(actualOutput); } catch (e) {}
      }
      throw err;
    }
  }


  /**
   * Removes Google Flow / Veo visual watermark overlay from an MP4 video using FFmpeg delogo inpainting
   */
  static async removeVideoWatermark(inputPath, outputPath = null, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const dims = await this.getVideoDimensions(inputPath);
    const width = dims.width;
    const height = dims.height;

    // Google Veo / Flow watermark is the 4-pointed Gemini/DeepMind Sparkle Star
    // Located at bottom-right, floating above the bottom margin
    const isPortrait = height > width;
    let centerX, centerY, boxSize;

    if (isPortrait) {
      centerX = width * 0.88;
      centerY = height * 0.90;
      boxSize = Math.max(54, Math.round(Math.max(width * 0.16, height * 0.09)));
    } else {
      // Landscape (16:9 / 640x360, 1280x720, 1920x1080)
      centerX = width * 0.906;
      centerY = height * 0.825;
      boxSize = Math.max(54, Math.round(Math.max(width * 0.095, height * 0.165)));
    }

    if (options.boxSize) boxSize = options.boxSize;

    let x = Math.max(0, Math.round(centerX - boxSize / 2));
    let y = Math.max(0, Math.round(centerY - boxSize / 2));
    let w = Math.min(boxSize, width - x);
    let h = Math.min(boxSize, height - y);

    // Delogo filter requires even coordinates and dimensions for yuv420p chroma subsampling
    x = x - (x % 2);
    y = y - (y % 2);
    w = w - (w % 2);
    h = h - (h % 2);

    const targetOutput = outputPath || inputPath;
    const isSameFile = (targetOutput === inputPath);
    const actualOutput = isSameFile ? inputPath.replace(/\.mp4$/i, `_wm_tmp_${Date.now()}.mp4`) : targetOutput;

    // Delogo filter smoothly interpolates pixels from surrounding region
    const delogoFilter = `delogo=x=${x}:y=${y}:w=${w}:h=${h}:show=0`;

    const args = [
      '-i', inputPath,
      '-vf', delogoFilter,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '18',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy',
      '-y',
      actualOutput
    ];

    try {
      await this._runFFmpeg(args);

      if (fs.existsSync(actualOutput) && fs.statSync(actualOutput).size > 1000) {
        if (isSameFile) {
          try {
            fs.unlinkSync(inputPath);
            fs.renameSync(actualOutput, inputPath);
          } catch (e) {
            try {
              fs.copyFileSync(actualOutput, inputPath);
              fs.unlinkSync(actualOutput);
            } catch (copyErr) {
              return actualOutput;
            }
          }
          return inputPath;
        }
        return targetOutput;
      }

      throw new Error('Watermark removal failed: Output file not created or invalid.');
    } catch (err) {
      if (isSameFile && fs.existsSync(actualOutput)) {
        try { fs.unlinkSync(actualOutput); } catch (e) {}
      }
      throw err;
    }
  }

  static getFFmpegPath() {
    if (this._cachedFFmpegPath && fs.existsSync(this._cachedFFmpegPath)) {
      return this._cachedFFmpegPath;
    }

    // 1. Check WinGet Gyan.FFmpeg or other WinGet installations
    const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '');
    if (localAppData) {
      const wingetBase = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
      if (fs.existsSync(wingetBase)) {
        try {
          const dirs = fs.readdirSync(wingetBase);
          for (const d of dirs) {
            if (d.toLowerCase().includes('ffmpeg')) {
              const dirPath = path.join(wingetBase, d);
              const subdirs = fs.readdirSync(dirPath);
              for (const sub of subdirs) {
                const bin = path.join(dirPath, sub, 'bin', 'ffmpeg.exe');
                if (fs.existsSync(bin)) {
                  this._cachedFFmpegPath = bin;
                  return bin;
                }
              }
            }
          }
        } catch (e) {}
      }
    }

    // 2. Check standard Windows installation paths
    const candidates = [
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'ffmpeg', 'bin', 'ffmpeg.exe'),
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      path.join(__dirname, '..', 'bin', 'ffmpeg.exe')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        this._cachedFFmpegPath = c;
        return c;
      }
    }

    // 3. Fallback to system PATH
    this._cachedFFmpegPath = 'ffmpeg';
    return 'ffmpeg';
  }

  static getFFprobePath() {
    if (this._cachedFFprobePath && fs.existsSync(this._cachedFFprobePath)) {
      return this._cachedFFprobePath;
    }

    const ffmpegPath = this.getFFmpegPath();
    if (ffmpegPath && ffmpegPath !== 'ffmpeg') {
      const probeCandidate = path.join(path.dirname(ffmpegPath), 'ffprobe.exe');
      if (fs.existsSync(probeCandidate)) {
        this._cachedFFprobePath = probeCandidate;
        return probeCandidate;
      }
    }

    this._cachedFFprobePath = 'ffprobe';
    return 'ffprobe';
  }

  static get ffmpegPath() {
    return this.getFFmpegPath();
  }

  get ffmpegPath() {
    return FFmpegService.getFFmpegPath();
  }

  /**
   * Probes video dimensions (width and height) via ffprobe
   */
  static async getVideoDimensions(inputPath) {
    const probeBin = this.getFFprobePath();
    return new Promise((resolve) => {
      execFile(probeBin, [
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=s=x:p=0',
        inputPath
      ], { windowsHide: true }, (err, stdout) => {
        if (!err && stdout) {
          const parts = stdout.trim().split('x');
          if (parts.length === 2) {
            const w = parseInt(parts[0], 10);
            const h = parseInt(parts[1], 10);
            if (!isNaN(w) && !isNaN(h)) {
              return resolve({ width: w, height: h });
            }
          }
        }
        resolve({ width: 1080, height: 1920 });
      });
    });
  }

  static async isAvailable() {
    const bin = this.getFFmpegPath();
    return new Promise((resolve) => {
      execFile(bin, ['-version'], { windowsHide: true }, (error) => {
        resolve(!error);
      });
    });
  }

  static _runFFmpeg(args, onProgress = () => {}) {
    const bin = this.getFFmpegPath();
    return new Promise((resolve, reject) => {
      const proc = spawn(bin, args, { windowsHide: true });
      let stderr = '';

      proc.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderr += text;
        if (stderr.length > 100 * 1024) {
          stderr = stderr.slice(-50 * 1024);
        }
        
        // Parse time=HH:MM:SS.ms for progress tracking
        const match = text.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (match) {
          onProgress({ time: match[1] });
        }
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-300)}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports = { FFmpegService };
