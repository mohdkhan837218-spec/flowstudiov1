import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  RotateCcw,
  ExternalLink,
  Minimize2,
  X
} from 'lucide-react';
import { Button } from '../common/Button';

interface ImageViewerProps {
  src: string;
  alt?: string;
  aspectRatio?: string;
  onDownload?: () => void;
  onOpenFlow?: () => void;
  className?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  src,
  alt = 'Generated Output',
  aspectRatio = '1:1',
  onDownload,
  onOpenFlow,
  className
}) => {
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);

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

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

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
    <>
      <div
        className={`w-full ${getAspectClass()} rounded-2xl bg-[#0b0e18] border border-white/[0.08] relative overflow-hidden flex items-center justify-center group shadow-xl ${className || ''}`}
      >
        {mediaDataUrl ? (
          <div className="w-full h-full flex items-center justify-center overflow-hidden p-2">
            <img
              src={mediaDataUrl}
              alt={alt}
              style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out' }}
              className="max-w-full max-h-full object-contain rounded-xl select-none"
            />
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
            <RotateCcw className="w-4 h-4 animate-spin" />
            Loading image asset...
          </div>
        )}

        {/* Floating Toolbar on Hover */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/[0.1] flex items-center gap-2 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleZoomIn}
            icon={<ZoomIn className="w-3.5 h-3.5 text-slate-300" />}
            tooltip="Zoom In"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleZoomOut}
            icon={<ZoomOut className="w-3.5 h-3.5 text-slate-300" />}
            tooltip="Zoom Out"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetZoom}
            className="text-[11px] font-mono text-slate-300 px-2"
          >
            {Math.round(zoom * 100)}%
          </Button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

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
              tooltip="Download Image"
            />
          )}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsFullscreen(true)}
            icon={<Maximize2 className="w-3.5 h-3.5 text-slate-300" />}
            tooltip="Fullscreen Lightbox"
          />
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && mediaDataUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 select-none animate-in fade-in">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 z-50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="max-w-6xl max-h-[85vh] flex items-center justify-center">
            <img
              src={mediaDataUrl}
              alt={alt}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
            {onDownload && (
              <Button
                variant="primary"
                size="md"
                onClick={onDownload}
                icon={<Download className="w-4 h-4" />}
              >
                Download Image
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
