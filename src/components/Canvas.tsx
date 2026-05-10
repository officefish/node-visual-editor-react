import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useEditor } from '../hooks/useEditor';
import { useKeyboard } from '../hooks/useKeyboard';
import { NodeRenderer } from '../core/NodeRenderer';
import type { PortHit } from '../types';
import { ButtonNodeRenderer } from '../nodes/ButtonNode';

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
    mode,
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
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (mode === 'run') {
      onStatusUpdate('⚠️ В режиме выполнения редактирование недоступно');
      return;
    }
    
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);

    const node = getNodeAtPosition(worldPos);
    if (node && node.type !== 'button') {
      openEditor(node.id);
      onStatusUpdate(`✏️ Редактирование узла: ${node.title}`);
    } else if (node && node.type === 'button') {
      onStatusUpdate(`🔘 Узел-триггер не требует редактирования`);
    }
  }, [offsetX, offsetY, zoom, screenToWorld, getNodeAtPosition, openEditor, onStatusUpdate, mode]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'run') {
      return;
    }
    
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);

    if (e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart(mouseScreen);
      setStartOffset({ x: offsetX, y: offsetY });
      return;
    }

    if (e.button === 0) {
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

      if (!selectedPort && !draggedNode) {
        setIsSelecting(true);
        setSelectionStart(worldPos);
        setSelectionEnd(worldPos);
        if (!e.ctrlKey) {
          clearSelection();
        }
      }
    }
  }, [offsetX, offsetY, zoom, screenToWorld, getPortAtPosition, selectedPort, addLink, onStatusUpdate, getNodeAtPosition, selectNode, clearSelection, mode]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'run') return;
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
      
      if (rendererRef.current) {
        const startScreen = worldToScreen(selectionStart.x, selectionStart.y, offsetX, offsetY, zoom);
        const endScreen = worldToScreen(worldPos.x, worldPos.y, offsetX, offsetY, zoom);
        rendererRef.current.drawSelectionRect(startScreen, endScreen);
      }
    }
  }, [isPanning, startOffset, panStart, draggedNode, isSelecting, offsetX, offsetY, zoom, screenToWorld, updateNodePosition, worldToScreen, selectionStart, mode]);

  const handleMouseUp = useCallback(() => {
    if (mode === 'run') return;
    
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
  }, [isSelecting, selectionStart, selectionEnd, selectNodesInRect, onStatusUpdate, mode]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (mode === 'run') return;
    e.preventDefault();
  };

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'run') return;
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
  }, [offsetX, offsetY, zoom, screenToWorld, removeLinkAtPosition, onStatusUpdate, mode]);

  // Get button nodes for rendering
  const buttonNodes = nodes.filter(node => node.type === 'button');
  
  // Transform world coordinates to screen for button positioning
  const getButtonScreenPosition = (worldX: number, worldY: number) => {
    return worldToScreen(worldX, worldY, offsetX, offsetY, zoom);
  };

  // Проверяем, выделена ли кнопка
  const isButtonSelected = (nodeId: number) => {
    return selectedNodeIds.has(nodeId);
  };

  // Размер узла в мировых координатах
  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 90;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        style={{ display: 'block', cursor: mode === 'run' ? 'default' : 'grab' }}
      />
      
      {/* Render button nodes as interactive HTML elements */}
      {buttonNodes.map(node => {
        const screenPos = getButtonScreenPosition(node.x, node.y);
        const isSelected = isButtonSelected(node.id);
        
        // Размеры в экранных координатах с учетом масштаба
        const screenWidth = NODE_WIDTH * zoom;
        const screenHeight = NODE_HEIGHT * zoom;
        
        return (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: screenPos.x,
              top: screenPos.y,
              width: screenWidth,
              height: screenHeight,
              pointerEvents: mode === 'edit' ? 'none' : 'auto',
              zIndex: 20,
            }}
            className={isSelected && mode === 'edit' ? 'ring-2 ring-orange-500 rounded-lg' : ''}
          >
            <ButtonNodeRenderer node={node} isRunning={mode === 'run'} zoom={zoom} />
          </div>
        );
      })}
    </div>
  );
};