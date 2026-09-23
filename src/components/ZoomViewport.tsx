'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface ZoomViewportProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Intrinsic size of the canvas content in pixels */
  contentWidth: number;
  contentHeight: number;
  /** 1 = whole image fits inside the viewport; >1 zooms in (drag to pan) */
  zoom: number;
  /** Content point (0..1) to centre on; re-applied whenever it changes */
  focusX?: number;
  focusY?: number;
  /** Sizing/border classes for the outer box (must give it a definite height) */
  className?: string;
  backgroundClassName?: string;
  padding?: number;
  /** Rendered on top of the canvas, sized exactly like the displayed canvas */
  canvasOverlay?: React.ReactNode;
  canvasClassName?: string;
  onCanvasClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  /** Rendered on top of the viewport (toolbars, badges) */
  children?: React.ReactNode;
}

export const ZoomViewport: React.FC<ZoomViewportProps> = ({
  canvasRef,
  contentWidth,
  contentHeight,
  zoom,
  focusX,
  focusY,
  className = '',
  backgroundClassName = 'bg-transparency-grid',
  padding = 16,
  canvasOverlay,
  canvasClassName = '',
  onCanvasClick,
  children,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  // Point of the canvas (0..1) kept at the viewport centre across zoom changes
  const centerRef = useRef({ x: 0.5, y: 0.5 });
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasSize = contentWidth > 0 && contentHeight > 0 && box.width > 0 && box.height > 0;
  const fitScale = hasSize
    ? Math.max(
        0.01,
        Math.min(
          (box.width - padding * 2) / contentWidth,
          (box.height - padding * 2) / contentHeight
        )
      )
    : 0;
  const scale = fitScale * zoom;
  const displayWidth = Math.max(1, Math.round(contentWidth * scale));
  const displayHeight = Math.max(1, Math.round(contentHeight * scale));
  const canPan =
    displayWidth + padding * 2 > box.width || displayHeight + padding * 2 > box.height;

  // The canvas sits centred inside the scrollable area; convert between its
  // fractional coordinates and scroll offsets.
  const scrollToCenter = () => {
    const el = scrollRef.current;
    if (!el) return;
    const canvasLeft = (el.scrollWidth - displayWidth) / 2;
    const canvasTop = (el.scrollHeight - displayHeight) / 2;
    el.scrollLeft = canvasLeft + centerRef.current.x * displayWidth - el.clientWidth / 2;
    el.scrollTop = canvasTop + centerRef.current.y * displayHeight - el.clientHeight / 2;
  };

  useLayoutEffect(() => {
    if (focusX === undefined || focusY === undefined) return;
    centerRef.current = { x: focusX, y: focusY };
    scrollToCenter();
  }, [focusX, focusY]);

  useLayoutEffect(scrollToCenter, [displayWidth, displayHeight]);

  const handleScroll = () => {
    const el = scrollRef.current;
    // Ignore the clamp-to-zero scroll when zooming back out, so the focus survives
    if (!el || !canPan) return;
    const canvasLeft = (el.scrollWidth - displayWidth) / 2;
    const canvasTop = (el.scrollHeight - displayHeight) / 2;
    centerRef.current = {
      x: (el.scrollLeft + el.clientWidth / 2 - canvasLeft) / displayWidth,
      y: (el.scrollTop + el.clientHeight / 2 - canvasTop) / displayHeight,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !canPan || e.button !== 0) return;
    dragRef.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
    el.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!el || !drag) return;
    el.scrollLeft = drag.left - (e.clientX - drag.x);
    el.scrollTop = drag.top - (e.clientY - drag.y);
  };

  const endDrag = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  return (
    <div ref={boxRef} className={`relative overflow-hidden ${className}`}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`absolute inset-0 overflow-auto ${
          canPan ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
      >
        <div
          className={`flex items-center justify-center ${backgroundClassName}`}
          style={{
            minWidth: '100%',
            minHeight: '100%',
            width: displayWidth + padding * 2,
            height: displayHeight + padding * 2,
          }}
        >
          <div
            className="relative shrink-0"
            style={{
              width: displayWidth,
              height: displayHeight,
              visibility: hasSize ? 'visible' : 'hidden',
            }}
          >
            <canvas
              ref={canvasRef}
              onClick={onCanvasClick}
              // Nearest-neighbour when enlarging (crisp pixel art), smooth when shrinking
              className={`block w-full h-full ${scale >= 1 ? 'pixelated' : ''} ${canvasClassName}`}
            />
            {canvasOverlay}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};
