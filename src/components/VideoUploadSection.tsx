'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Upload, Play, Pause, Repeat, Film, Image as ImageIcon, Loader2 } from 'lucide-react';
import { VideoInfo, ExtractedFrame } from '../lib/sprite-processor/types';
import { loadVideoMetadata, extractVideoFrames, loadImagesAsFrames } from '../lib/sprite-processor/video-extractor';

interface VideoUploadSectionProps {
  onFramesExtracted: (frames: ExtractedFrame[], sourceName: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const VideoUploadSection: React.FC<VideoUploadSectionProps> = ({
  onFramesExtracted,
  isLoading,
  setIsLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoopingRange, setIsLoopingRange] = useState<boolean>(false);

  const [startFrame, setStartFrame] = useState<number>(0);
  const [endFrame, setEndFrame] = useState<number>(30);
  const [interval, setInterval] = useState<number>(1);
  const [fps, setFps] = useState<number>(30);

  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');

  // Handle video selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 1 || files[0].type.startsWith('image/')) {
      // Multiple images uploaded as frames
      setIsLoading(true);
      setProgressText('Loading batch images...');
      try {
        const frames = await loadImagesAsFrames(Array.from(files), (pct, cur, total) => {
          setProgress(pct);
          setProgressText(`Loading image ${cur}/${total}...`);
        });
        onFramesExtracted(frames, files[0].name.replace(/\.[^/.]+$/, ''));
      } catch (err: any) {
        alert('Error loading images: ' + err.message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const file = files[0];
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file (MP4, WebM, MOV) or PNG images.');
      return;
    }

    setVideoFile(file);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const newUrl = URL.createObjectURL(file);
    setVideoUrl(newUrl);

    try {
      const { info } = await loadVideoMetadata(file);
      setVideoInfo(info);
      setStartFrame(0);
      setEndFrame(Math.min(info.totalFrames, 30));
      setFps(info.estimatedFps || 30);
    } catch (err: any) {
      alert('Could not read video metadata: ' + err.message);
    }
  };

  // Video time update listener
  const handleTimeUpdate = () => {
    if (!videoRef.current || !videoInfo) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    if (isLoopingRange) {
      const startTime = startFrame / fps;
      const endTime = endFrame / fps;
      if (cur >= endTime || cur < startTime) {
        videoRef.current.currentTime = startTime;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (isLoopingRange && (videoRef.current.currentTime < startFrame / fps || videoRef.current.currentTime >= endFrame / fps)) {
        videoRef.current.currentTime = startFrame / fps;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleLoopRange = () => {
    const next = !isLoopingRange;
    setIsLoopingRange(next);
    if (next && videoRef.current) {
      videoRef.current.currentTime = startFrame / fps;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleExtract = async () => {
    if (!videoRef.current || !videoInfo || !videoFile) return;

    setIsLoading(true);
    setProgress(0);
    setProgressText('Extracting frames from video...');

    try {
      videoRef.current.pause();
      setIsPlaying(false);

      const frames = await extractVideoFrames(
        videoRef.current,
        startFrame,
        endFrame,
        interval,
        fps,
        (pct, cur, total) => {
          setProgress(pct);
          setProgressText(`Extracting frame ${cur} of ${total} (${pct}%)`);
        }
      );

      onFramesExtracted(frames, videoFile.name.replace(/\.[^/.]+$/, ''));
    } catch (err: any) {
      alert('Failed to extract frames: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalFrames = videoInfo?.totalFrames || 30;
  const estimatedExtracted = Math.max(0, Math.floor((endFrame - startFrame) / interval) + 1);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur shadow-xl">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Upload or Video Player */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {!videoUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-64 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-900/60 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3 transition-colors">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">
                Upload AI Video or Batch PNGs
              </h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Drag and drop MP4, WebM, MOV, or multiple PNG animation frames
              </p>
              <span className="mt-3 text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-medium">
                Supports green-screen, black/white, or solid backgrounds
              </span>
            </div>
          ) : (
            <div className="w-full space-y-3">
              <div className="relative aspect-video max-h-72 w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-contain"
                  playsInline
                />
              </div>

              {/* Scrubber Controls */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-sm"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <button
                    onClick={toggleLoopRange}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
                      isLoopingRange
                        ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                    title="Loop only between Start Frame and End Frame"
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    Loop Range
                  </button>

                  <div className="flex-1 text-right text-xs font-mono text-slate-400">
                    {currentTime.toFixed(2)}s / {(videoInfo?.duration || 0).toFixed(2)}s
                    <span className="ml-2 text-indigo-400 font-semibold">
                      Frame {Math.floor(currentTime * fps)}
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  min={0}
                  max={videoInfo?.duration || 1}
                  step={0.01}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Right: Frame Range & Extraction Settings */}
        <div className="w-full md:w-80 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" />
              Frame Range & Sampling
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Isolate the loop sequence and sample frame rate.
            </p>

            <div className="space-y-3.5">
              {/* Start Frame */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">Start Frame</span>
                  <span className="text-indigo-400 font-mono font-semibold">#{startFrame}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, endFrame - 1)}
                  value={startFrame}
                  disabled={!videoInfo || isLoading}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setStartFrame(val);
                    handleSeek(val / fps);
                  }}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* End Frame */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">End Frame</span>
                  <span className="text-indigo-400 font-mono font-semibold">#{endFrame}</span>
                </div>
                <input
                  type="range"
                  min={startFrame + 1}
                  max={totalFrames}
                  value={endFrame}
                  disabled={!videoInfo || isLoading}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setEndFrame(val);
                    handleSeek(val / fps);
                  }}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* Interval (Sample Rate) */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">Frame Interval</span>
                  <span className="text-indigo-400 font-mono font-semibold">
                    Every {interval} {interval === 1 ? 'frame' : 'frames'}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={interval}
                  disabled={!videoInfo || isLoading}
                  onChange={(e) => setInterval(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                />
              </div>

              {/* Summary Pill */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400">Frames to extract:</span>
                <span className="text-white font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/30">
                  {estimatedExtracted} frames
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div>
            {isLoading ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    {progressText}
                  </span>
                  <span className="font-mono font-bold text-indigo-400">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleExtract}
                disabled={!videoInfo || isLoading}
                className="w-full py-2.5 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Film className="w-4 h-4" />
                Extract {estimatedExtracted} Frames
              </button>
            )}

            {videoUrl && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full mt-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 text-center transition-colors"
              >
                Choose different file
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
