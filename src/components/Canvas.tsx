import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useEditor } from '../hooks/useEditor';
import { useKeyboard } from '../hooks/useKeyboard';
import { NodeRenderer } from '../core/NodeRenderer';
import type { PortHit } from '../types';

interface CanvasProps {
  onStatusUpdate: (message: string) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ onStatusUpdate }) => {
  const { canvasRef, offsetX, offsetY, zoom } = useEditor();
  const {
    nodes,
    links,
    selectedNodeIds,
    addLink,
    removeLinkAtPosition,
    selectNode,
    clearSelection,
    selectNodesInRect,
    updateNodePosition,
    getNodeAtPosition,
    getPortAtPosition,
    screenToWorld,
    worldToScreen,
    openEditor,
  } = useEditorStore();

  useKeyboard();

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [startOffset, setStartOffset] = useState({ x: 0, y: 0 });
  const [draggedNode, setDraggedNode] = useState<{ id: number; offsetX: number; offsetY: number } | null>(null);
  const [selectedPort, setSelectedPort] = useState<PortHit | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [highlightedNodeId, setHighlightedNodeId] = useState<number | null>(null);

  const rendererRef = useRef<NodeRenderer | null>(null);
  const animationRef = useRef<number>();

  // Initialize renderer
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        rendererRef.current = new NodeRenderer(ctx, nodes, links, selectedNodeIds, highlightedNodeId);
      }
    }
  }, [canvasRef.current]);

  // Animation loop for continuous rendering
  useEffect(() => {
    const render = () => {
      if (rendererRef.current) {
        rendererRef.current.updateData(nodes, links, selectedNodeIds, highlightedNodeId);
        rendererRef.current.draw(offsetX, offsetY, zoom);
      }
      animationRef.current = requestAnimationFrame(render);
    };
    
    animationRef.current = requestAnimationFrame(render);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes, links, selectedNodeIds, highlightedNodeId, offsetX, offsetY, zoom]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);

    const node = getNodeAtPosition(worldPos);
    if (node) {
      openEditor(node.id);
      onStatusUpdate(`✏️ Редактирование узла: ${node.title}`);
    }
  }, [offsetX, offsetY, zoom, screenToWorld, getNodeAtPosition, openEditor, onStatusUpdate]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);

    // Right click - panning
    if (e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart(mouseScreen);
      setStartOffset({ x: offsetX, y: offsetY });
      return;
    }

    // Left click
    if (e.button === 0) {
      // Check port click
      const portHit = getPortAtPosition(worldPos);
      if (portHit) {
        if (selectedPort === null) {
          setSelectedPort(portHit);
          onStatusUpdate(`Выбран порт: ${portHit.portName}`);
        } else {
          const success = addLink(
            selectedPort.nodeId,
            selectedPort.portIndex,
            portHit.nodeId,
            portHit.portIndex
          );
          if (success) {
            onStatusUpdate('🔗 Соединение создано');
          } else {
            onStatusUpdate('❌ Не удалось создать соединение');
          }
          setSelectedPort(null);
        }
        return;
      }

      // Check node click
      const node = getNodeAtPosition(worldPos);
      if (node) {
        setDraggedNode({
          id: node.id,
          offsetX: node.x - worldPos.x,
          offsetY: node.y - worldPos.y,
        });

        if (e.ctrlKey) {
          selectNode(node.id, true);
          onStatusUpdate(`➕ Добавлен узел ${node.id} к выделению`);
        } else {
          selectNode(node.id, false);
          onStatusUpdate(`🎯 Выделен узел: ${node.title}`);
        }
        return;
      }

      // Start rectangle selection
      if (!selectedPort && !draggedNode) {
        setIsSelecting(true);
        setSelectionStart(worldPos);
        setSelectionEnd(worldPos);
        if (!e.ctrlKey) {
          clearSelection();
        }
      }
    }
  }, [offsetX, offsetY, zoom, screenToWorld, getPortAtPosition, selectedPort, addLink, onStatusUpdate, getNodeAtPosition, selectNode, clearSelection]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (isPanning) {
      const newOffsetX = startOffset.x + (mouseScreen.x - panStart.x);
      const newOffsetY = startOffset.y + (mouseScreen.y - panStart.y);
      useEditorStore.getState().setPan(newOffsetX, newOffsetY);
    } else if (draggedNode) {
      const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);
      updateNodePosition(
        draggedNode.id,
        worldPos.x + draggedNode.offsetX,
        worldPos.y + draggedNode.offsetY
      );
    } else if (isSelecting) {
      const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);
      setSelectionEnd(worldPos);
      
      // Draw selection rectangle in real-time
      if (rendererRef.current) {
        const startScreen = worldToScreen(selectionStart.x, selectionStart.y, offsetX, offsetY, zoom);
        const endScreen = worldToScreen(worldPos.x, worldPos.y, offsetX, offsetY, zoom);
        rendererRef.current.drawSelectionRect(startScreen, endScreen);
      }
    }
  }, [isPanning, startOffset, panStart, draggedNode, isSelecting, offsetX, offsetY, zoom, screenToWorld, updateNodePosition, worldToScreen, selectionStart]);

  const handleMouseUp = useCallback(() => {
    if (isSelecting) {
      const rect = {
        x: Math.min(selectionStart.x, selectionEnd.x),
        y: Math.min(selectionStart.y, selectionEnd.y),
        w: Math.abs(selectionEnd.x - selectionStart.x),
        h: Math.abs(selectionEnd.y - selectionStart.y),
      };
      if (rect.w > 5 && rect.h > 5) {
        selectNodesInRect(rect);
        const count = useEditorStore.getState().getSelectionCount();
        onStatusUpdate(`🔲 Выделено ${count} узлов`);
      }
      setIsSelecting(false);
    }

    setIsPanning(false);
    setDraggedNode(null);
  }, [isSelecting, selectionStart, selectionEnd, selectNodesInRect, onStatusUpdate]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);

    if (e.ctrlKey) {
      const removed = removeLinkAtPosition(worldPos, zoom);
      if (removed) {
        onStatusUpdate('🗑️ Соединение удалено');
      }
    }
  }, [offsetX, offsetY, zoom, screenToWorld, removeLinkAtPosition, onStatusUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{ display: 'block' }}
    />
  );
};