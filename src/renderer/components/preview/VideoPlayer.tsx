import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Button } from '../common/Button';
import { Tooltip } from '../common/Tooltip';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  aspectRatio?: string;
  autoPlay?: boolean;
  onDownload?: () => void;
  onOpenFlow?: () => void;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  aspectRatio = '16:9',
  autoPlay = false,
  onDownload,
  onOpenFlow,
  className
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load safe media Data URL if src is a local path
  useEffect(() => {
    let isMounted = true;
    if (src.startsWith('data:') || src.startsWith('http:') || src.startsWith('https:') || src.startsWith('blob:')) {
      setMediaDataUrl(src);
    } else {
      window.flowWorkspace.preview.getMediaDataUrl(src).then((dataUrl) => {
        if (isMounted) {
          setMediaDataUrl(dataUrl || src);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [src]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const formatTime = (timeInSec: number) => {
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-w-[280px] mx-auto';
      case '1:1':
        return 'aspect-square max-w-[400px] mx-auto';
      case '4:3':
        return 'aspect-[4/3]';
      case '3:4':
        return 'aspect-[3/4] max-w-[320px] mx-auto';
      case '16:9':
      default:
        return 'aspect-video';
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`w-full ${getAspectClass()} rounded-2xl bg-black border border-white/[0.08] relative overflow-hidden flex items-center justify-center group shadow-xl ${className || ''}`}
    >
      {mediaDataUrl ? (
        <video
          ref={videoRef}
          src={mediaDataUrl}
          poster={poster}
          playsInline
          muted={isMuted}
          autoPlay={autoPlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />
      ) : (
        <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
          <RotateCcw className="w-4 h-4 animate-spin" />
          Loading video stream...
        </div>
      )}

      {/* Play/Pause Center Overlay Flash Button */}
      {!isPlaying && (
        <button
          onClick={togglePlay}
          className="absolute z-20 w-14 h-14 rounded-2xl bg-indigo-600/80 hover:bg-indigo-600 text-white backdrop-blur-md flex items-center justify-center shadow-2xl transition-all scale-100 hover:scale-105"
        >
          <Play className="w-6 h-6 fill-current ml-0.5" />
        </button>
      )}

      {/* Sleek Video Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-200 z-20 space-y-2 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Range Input */}
        <div className="relative flex items-center group/scrubber">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/20 hover:bg-white/40 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-all"
          />
        </div>

        {/* Control Buttons Row */}
        <div className="flex items-center justify-between text-xs text-white">
          <div className="flex items-center gap-2.5">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <span className="font-mono text-[11px] text-slate-300">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenFlow && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onOpenFlow}
                icon={<ExternalLink className="w-3.5 h-3.5 text-slate-300" />}
                tooltip="Open in Google Flow"
              />
            )}

            {onDownload && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDownload}
                icon={<Download className="w-3.5 h-3.5 text-slate-300" />}
                tooltip="Download Video File"
              />
            )}

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/15 text-slate-200 hover:text-white transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
