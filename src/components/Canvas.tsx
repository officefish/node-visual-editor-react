import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useEditor } from '../hooks/useEditor';
import { useKeyboard } from '../hooks/useKeyboard';
import { NodeRenderer } from '../core/NodeRenderer';
import type { PortHit, Link, Vector2, NodeType } from '../types';
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
    selectedLinkIndex,
    draggedLink,
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
    selectLink,
    clearSelectedLink,
    deleteSelectedLink,
    startDraggingLink,
    updateDraggedLink,
    endDraggingLink,
  } = useEditorStore();

  useKeyboard();

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [startOffset, setStartOffset] = useState({ x: 0, y: 0 });
  const [draggedNodeState, setDraggedNodeState] = useState<{ id: number; offsetX: number; offsetY: number } | null>(null);
  const [selectedPort, setSelectedPort] = useState<PortHit | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
  const [highlightedNodeId, setHighlightedNodeId] = useState<number | null>(null);
  const [hoveredPort, setHoveredPort] = useState<PortHit | null>(null);

  const rendererRef = useRef<NodeRenderer | null>(null);
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize renderer
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        rendererRef.current = new NodeRenderer(ctx, nodes, links, selectedNodeIds, highlightedNodeId, selectedLinkIndex, draggedLink, hoveredPort);
      }
    }
  }, [canvasRef.current]);

  // Animation loop for continuous rendering
  useEffect(() => {
    const render = () => {
      if (rendererRef.current) {
        rendererRef.current.updateData(nodes, links, selectedNodeIds, highlightedNodeId, selectedLinkIndex, draggedLink, hoveredPort);
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
  }, [nodes, links, selectedNodeIds, highlightedNodeId, selectedLinkIndex, draggedLink, hoveredPort, offsetX, offsetY, zoom]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);

    // Обновляем ховер над портом
    if (mode === 'edit') {
      const port = getPortAtPosition(worldPos);
      setHoveredPort(port);
    }

    if (isPanning) {
      const newOffsetX = startOffset.x + (mouseScreen.x - panStart.x);
      const newOffsetY = startOffset.y + (mouseScreen.y - panStart.y);
      useEditorStore.getState().setPan(newOffsetX, newOffsetY);
    } else if (draggedNodeState) {
      const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);
      updateNodePosition(
        draggedNodeState.id,
        worldPos.x + draggedNodeState.offsetX,
        worldPos.y + draggedNodeState.offsetY
      );
    } else if (draggedLink) {
      // Обновляем позицию рисуемой связи
      const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);
      const targetPort = getPortAtPosition(worldPos);
      updateDraggedLink(worldPos.x, worldPos.y, targetPort || undefined);
    } else if (isSelecting) {
      const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);
      setSelectionEnd(worldPos);
      
      if (rendererRef.current) {
        const startScreen = worldToScreen(selectionStart.x, selectionStart.y, offsetX, offsetY, zoom);
        const endScreen = worldToScreen(worldPos.x, worldPos.y, offsetX, offsetY, zoom);
        rendererRef.current.drawSelectionRect(startScreen, endScreen);
      }
    }
  }, [isPanning, startOffset, panStart, draggedNodeState, isSelecting, offsetX, offsetY, zoom, screenToWorld, updateNodePosition, worldToScreen, selectionStart, draggedLink, updateDraggedLink, getPortAtPosition, mode]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === 'run') return;
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);

    // ПКМ - панорамирование
    if (e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart(mouseScreen);
      setStartOffset({ x: offsetX, y: offsetY });
      return;
    }

    // ЛКМ
    if (e.button === 0) {
      // Сначала проверяем клик по порту для создания связи
      const portHit = getPortAtPosition(worldPos);
      if (portHit && portHit.isOutput) {
        // Начинаем рисование связи от output порта
        const startScreen = worldToScreen(worldPos.x, worldPos.y, offsetX, offsetY, zoom);
        startDraggingLink(portHit.nodeId, portHit.portIndex, startScreen.x, startScreen.y);
        onStatusUpdate(`🔌 Рисование связи от порта ${portHit.portName}`);
        return;
      }

      // Проверяем клик по линии (связи)
      const clickedLink = getLinkAtPosition(worldPos, links, nodes, zoom);
      if (clickedLink !== null) {
        selectLink(clickedLink);
        onStatusUpdate(`🔗 Выделена связь`);
        return;
      }

      // Снимаем выделение со связи, если клик не по ней
      if (selectedLinkIndex !== null) {
        clearSelectedLink();
      }

      // Проверяем клик по узлу
      const node = getNodeAtPosition(worldPos);
      if (node) {
        setDraggedNodeState({
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

      // Начало выделения рамкой
      if (!selectedPort && !draggedNodeState && !draggedLink) {
        setIsSelecting(true);
        setSelectionStart(worldPos);
        setSelectionEnd(worldPos);
        if (!e.ctrlKey) {
          clearSelection();
        }
      }
    }
  }, [offsetX, offsetY, zoom, screenToWorld, worldToScreen, getPortAtPosition, getNodeAtPosition, selectNode, clearSelection, mode, selectedLinkIndex, selectLink, clearSelectedLink, startDraggingLink, onStatusUpdate, links, nodes]);

  const handleMouseUp = useCallback(() => {
    if (mode === 'run') return;
    
    if (draggedLink) {
      endDraggingLink();
      onStatusUpdate('✅ Создание связи завершено');
    }
    
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
    setDraggedNodeState(null);
    setSelectedPort(null);
  }, [isSelecting, selectionStart, selectionEnd, selectNodesInRect, onStatusUpdate, mode, draggedLink, endDraggingLink]);

  // Функция поиска связи под курсором
  const getLinkAtPosition = (worldPos: Vector2, links: Link[], nodes: NodeType[], zoom: number): number | null => {
    const threshold = 10 / zoom;
    
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const fromNode = nodes.find(n => n.id === link.fromNode);
      const toNode = nodes.find(n => n.id === link.toNode);
      if (!fromNode || !toNode) continue;
      
      const start = { 
        x: fromNode.x + 200, 
        y: fromNode.y + 30 + link.fromPort * 22 
      };
      const end = { 
        x: toNode.x, 
        y: toNode.y + 30 + link.toPort * 22 
      };
      
      let minDist = Infinity;
      for (let t = 0; t <= 1; t += 0.05) {
        const cp1x = start.x + (end.x - start.x) * 0.5;
        const cp1y = start.y;
        const cp2x = start.x + (end.x - start.x) * 0.5;
        const cp2y = end.y;
        const x = Math.pow(1-t,3)*start.x + 3*Math.pow(1-t,2)*t*cp1x + 3*(1-t)*Math.pow(t,2)*cp2x + Math.pow(t,3)*end.x;
        const y = Math.pow(1-t,3)*start.y + 3*Math.pow(1-t,2)*t*cp1y + 3*(1-t)*Math.pow(t,2)*cp2y + Math.pow(t,3)*end.y;
        minDist = Math.min(minDist, Math.hypot(worldPos.x - x, worldPos.y - y));
      }
      
      if (minDist < threshold) {
        return i;
      }
    }
    return null;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (mode === 'edit') {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedLinkIndex !== null) {
          deleteSelectedLink();
          onStatusUpdate('🗑️ Связь удалена');
          e.preventDefault();
        }
      }
    }
  }, [mode, selectedLinkIndex, deleteSelectedLink, onStatusUpdate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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


  const buttonNodes = nodes.filter(node => node.type === 'button');
  const getButtonScreenPosition = (worldX: number, worldY: number) => {
    return worldToScreen(worldX, worldY, offsetX, offsetY, zoom);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
     if (mode === 'run') return;
      e.preventDefault();
   };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        style={{ display: 'block', cursor: mode === 'run' ? 'default' : 'grab' }}
      />
      
      {buttonNodes.map(node => {
        const screenPos = getButtonScreenPosition(node.x, node.y);
        return (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: screenPos.x,
              top: screenPos.y,
              width: 200,
              height: 90,
              pointerEvents: mode === 'edit' ? 'none' : 'auto',
              zIndex: 20,
            }}
          >
            <ButtonNodeRenderer node={node} isRunning={mode === 'run'} zoom={zoom} />
          </div>
        );
      })}
    </div>
  );
};

// import React, { useRef, useEffect, useCallback, useState } from 'react';
// import { useEditorStore } from '../store/editorStore';
// import { useEditor } from '../hooks/useEditor';
// import { useKeyboard } from '../hooks/useKeyboard';
// import { NodeRenderer } from '../core/NodeRenderer';
// import type { PortHit } from '../types';
// import { ButtonNodeRenderer } from '../nodes/ButtonNode';

// interface CanvasProps {
//   onStatusUpdate: (message: string) => void;
// }

// export const Canvas: React.FC<CanvasProps> = ({ onStatusUpdate }) => {
//   const { canvasRef, offsetX, offsetY, zoom } = useEditor();
//   const {
//     nodes,
//     links,
//     selectedNodeIds,
//     addLink,
//     removeLinkAtPosition,
//     selectNode,
//     clearSelection,
//     selectNodesInRect,
//     updateNodePosition,
//     getNodeAtPosition,
//     getPortAtPosition,
//     screenToWorld,
//     worldToScreen,
//     openEditor,
//     mode,
//   } = useEditorStore();

//   useKeyboard();

//   const [isPanning, setIsPanning] = useState(false);
//   const [panStart, setPanStart] = useState({ x: 0, y: 0 });
//   const [startOffset, setStartOffset] = useState({ x: 0, y: 0 });
//   const [draggedNode, setDraggedNode] = useState<{ id: number; offsetX: number; offsetY: number } | null>(null);
//   const [selectedPort, setSelectedPort] = useState<PortHit | null>(null);
//   const [isSelecting, setIsSelecting] = useState(false);
//   const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
//   const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });
//   const [highlightedNodeId, setHighlightedNodeId] = useState<number | null>(null);

//   const rendererRef = useRef<NodeRenderer | null>(null);
//   const animationRef = useRef<number>();
//   const containerRef = useRef<HTMLDivElement>(null);

//   // Initialize renderer
//   useEffect(() => {
//     if (canvasRef.current) {
//       const ctx = canvasRef.current.getContext('2d');
//       if (ctx) {
//         rendererRef.current = new NodeRenderer(ctx, nodes, links, selectedNodeIds, highlightedNodeId);
//       }
//     }
//   }, [canvasRef.current]);

//   // Animation loop for continuous rendering
//   useEffect(() => {
//     const render = () => {
//       if (rendererRef.current) {
//         rendererRef.current.updateData(nodes, links, selectedNodeIds, highlightedNodeId);
//         rendererRef.current.draw(offsetX, offsetY, zoom);
//       }
//       animationRef.current = requestAnimationFrame(render);
//     };
    
//     animationRef.current = requestAnimationFrame(render);
    
//     return () => {
//       if (animationRef.current) {
//         cancelAnimationFrame(animationRef.current);
//       }
//     };
//   }, [nodes, links, selectedNodeIds, highlightedNodeId, offsetX, offsetY, zoom]);

//   const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (mode === 'run') {
//       onStatusUpdate('⚠️ В режиме выполнения редактирование недоступно');
//       return;
//     }
    
//     if (!canvasRef.current) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
//     const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);

//     const node = getNodeAtPosition(worldPos);
//     if (node && node.type !== 'button') {
//       openEditor(node.id);
//       onStatusUpdate(`✏️ Редактирование узла: ${node.title}`);
//     } else if (node && node.type === 'button') {
//       onStatusUpdate(`🔘 Узел-триггер не требует редактирования`);
//     }
//   }, [offsetX, offsetY, zoom, screenToWorld, getNodeAtPosition, openEditor, onStatusUpdate, mode]);

//   const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (mode === 'run') {
//         return;
//     }
    
//     if (!canvasRef.current) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
//     const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);

//     if (e.button === 2) {
//         e.preventDefault();
//         setIsPanning(true);
//         setPanStart(mouseScreen);
//         setStartOffset({ x: offsetX, y: offsetY });
//         return;
//     }

//     if (e.button === 0) {
//         // Проверяем клик по порту
//         const portHit = getPortAtPosition(worldPos);
//         if (portHit) {
//         e.stopPropagation();
//         if (selectedPort === null) {
//             setSelectedPort(portHit);
//             onStatusUpdate(`Выбран порт: ${portHit.portName}`);
//         } else {
//             const success = addLink(
//             selectedPort.nodeId,
//             selectedPort.portIndex,
//             portHit.nodeId,
//             portHit.portIndex
//             );
//             if (success) {
//             onStatusUpdate('🔗 Соединение создано');
//             } else {
//             onStatusUpdate('❌ Не удалось создать соединение');
//             }
//             setSelectedPort(null);
//         }
//         return;
//         }

//         // Проверяем клик по узлу
//         const node = getNodeAtPosition(worldPos);
//         if (node) {
//         setDraggedNode({
//             id: node.id,
//             offsetX: node.x - worldPos.x,
//             offsetY: node.y - worldPos.y,
//         });

//         if (e.ctrlKey) {
//             selectNode(node.id, true);
//             onStatusUpdate(`➕ Добавлен узел ${node.id} к выделению`);
//         } else {
//             selectNode(node.id, false);
//             onStatusUpdate(`🎯 Выделен узел: ${node.title}`);
//         }
//         return;
//         }

//         // Начало выделения рамкой
//         if (!selectedPort && !draggedNode) {
//         setIsSelecting(true);
//         setSelectionStart(worldPos);
//         setSelectionEnd(worldPos);
//         if (!e.ctrlKey) {
//             clearSelection();
//         }
//         }
//     }
// }, [offsetX, offsetY, zoom, screenToWorld, getPortAtPosition, selectedPort, addLink, onStatusUpdate, getNodeAtPosition, selectNode, clearSelection, mode]);
  
// const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (mode === 'run') return;
//     if (!canvasRef.current) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };

//     if (isPanning) {
//       const newOffsetX = startOffset.x + (mouseScreen.x - panStart.x);
//       const newOffsetY = startOffset.y + (mouseScreen.y - panStart.y);
//       useEditorStore.getState().setPan(newOffsetX, newOffsetY);
//     } else if (draggedNode) {
//       const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);
//       updateNodePosition(
//         draggedNode.id,
//         worldPos.x + draggedNode.offsetX,
//         worldPos.y + draggedNode.offsetY
//       );
//     } else if (isSelecting) {
//       const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);
//       setSelectionEnd(worldPos);
      
//       if (rendererRef.current) {
//         const startScreen = worldToScreen(selectionStart.x, selectionStart.y, offsetX, offsetY, zoom);
//         const endScreen = worldToScreen(worldPos.x, worldPos.y, offsetX, offsetY, zoom);
//         rendererRef.current.drawSelectionRect(startScreen, endScreen);
//       }
//     }
//   }, [isPanning, startOffset, panStart, draggedNode, isSelecting, offsetX, offsetY, zoom, screenToWorld, updateNodePosition, worldToScreen, selectionStart, mode]);

//   const handleMouseUp = useCallback(() => {
//     if (mode === 'run') return;
    
//     if (isSelecting) {
//       const rect = {
//         x: Math.min(selectionStart.x, selectionEnd.x),
//         y: Math.min(selectionStart.y, selectionEnd.y),
//         w: Math.abs(selectionEnd.x - selectionStart.x),
//         h: Math.abs(selectionEnd.y - selectionStart.y),
//       };
//       if (rect.w > 5 && rect.h > 5) {
//         selectNodesInRect(rect);
//         const count = useEditorStore.getState().getSelectionCount();
//         onStatusUpdate(`🔲 Выделено ${count} узлов`);
//       }
//       setIsSelecting(false);
//     }

//     setIsPanning(false);
//     setDraggedNode(null);
//   }, [isSelecting, selectionStart, selectionEnd, selectNodesInRect, onStatusUpdate, mode]);

//   const handleContextMenu = (e: React.MouseEvent) => {
//     if (mode === 'run') return;
//     e.preventDefault();
//   };

//   const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (mode === 'run') return;
//     if (!canvasRef.current) return;

//     const rect = canvasRef.current.getBoundingClientRect();
//     const mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
//     const worldPos = screenToWorld(mouseScreen.x, mouseScreen.y, offsetX, offsetY, zoom);

//     if (e.ctrlKey) {
//       const removed = removeLinkAtPosition(worldPos, zoom);
//       if (removed) {
//         onStatusUpdate('🗑️ Соединение удалено');
//       }
//     }
//   }, [offsetX, offsetY, zoom, screenToWorld, removeLinkAtPosition, onStatusUpdate, mode]);

//   // Get button nodes for rendering
//   const buttonNodes = nodes.filter(node => node.type === 'button');
  
//   // Transform world coordinates to screen for button positioning
//   const getButtonScreenPosition = (worldX: number, worldY: number) => {
//     return worldToScreen(worldX, worldY, offsetX, offsetY, zoom);
//   };

//   // Проверяем, выделена ли кнопка
//   const isButtonSelected = (nodeId: number) => {
//     return selectedNodeIds.has(nodeId);
//   };

//   // Размер узла в мировых координатах
//   const NODE_WIDTH = 200;
//   const NODE_HEIGHT = 90;

//   return (
//     <div ref={containerRef} className="relative w-full h-full">
//       <canvas
//         ref={canvasRef}
//         className="absolute inset-0 w-full h-full"
//         onMouseDown={handleMouseDown}
//         onMouseMove={handleMouseMove}
//         onMouseUp={handleMouseUp}
//         onDoubleClick={handleDoubleClick}
//         onClick={handleClick}
//         onContextMenu={handleContextMenu}
//         style={{ display: 'block', cursor: mode === 'run' ? 'default' : 'grab' }}
//       />
      
//       {/* Render button nodes as interactive HTML elements */}
//       {buttonNodes.map(node => {
//         const screenPos = getButtonScreenPosition(node.x, node.y);
//         const isSelected = isButtonSelected(node.id);
        
//         // Размеры в экранных координатах с учетом масштаба
//         const screenWidth = NODE_WIDTH * zoom;
//         const screenHeight = NODE_HEIGHT * zoom;
        
//         return (
//           <div
//             key={node.id}
//             style={{
//               position: 'absolute',
//               left: screenPos.x,
//               top: screenPos.y,
//               width: screenWidth,
//               height: screenHeight,
//               pointerEvents: mode === 'edit' ? 'none' : 'auto',
//               zIndex: 20,
//             }}
//             className={isSelected && mode === 'edit' ? 'ring-2 ring-orange-500 rounded-lg' : ''}
//           >
//             <ButtonNodeRenderer node={node} isRunning={mode === 'run'} zoom={zoom} />
//           </div>
//         );
//       })}
//     </div>
//   );
// };