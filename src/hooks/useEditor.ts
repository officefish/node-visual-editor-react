import { useRef, useCallback, useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { Vector2 } from '../types';

export const useEditor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    offsetX,
    offsetY,
    zoom,
    setPan,
    setZoom,
    screenToWorld,
    worldToScreen,
  } = useEditorStore();

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldBefore = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(3, Math.max(0.2, zoom * delta));
    if (newZoom === zoom) return;

    setZoom(newZoom);
    const worldAfter = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, newZoom);
    setPan(
      offsetX + (worldAfter.x - worldBefore.x) * newZoom,
      offsetY + (worldAfter.y - worldBefore.y) * newZoom
    );
  }, [offsetX, offsetY, zoom, setPan, setZoom, screenToWorld]);

  const resizeCanvas = useCallback(() => {
    if (canvasRef.current && canvasRef.current.parentElement) {
      canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
      canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel, resizeCanvas]);

  return { canvasRef, offsetX, offsetY, zoom };
};