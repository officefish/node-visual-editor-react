import { create } from 'zustand';
import type { EditorState, EditorActions, Rect, Vector2, PortHit, NodeType, Link, EditorMode } from '../types';
import { NodeRegistry } from '../core/NodeRegistry';
import type { NodeExecutor } from '../core/NodeExecutor';
import { NodeFactory } from '../core/NodeFactory';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 90;
const PORT_RADIUS = 7;
const PORT_TOP_OFFSET = 30;
const PORT_SPACING = 22;

// Глобальная переменная для executor
let globalExecutor: NodeExecutor | null = null;

export const setGlobalExecutor = (executor: NodeExecutor) => {
  globalExecutor = executor;
};

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
  // State
  nodes: [],
  links: [],
  nextNodeId: 1,
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  selectedNodeIds: new Set<number>(),
  editingNodeId: null,
  mode: 'edit', // 'edit' или 'run'
  selectedLinkIndex: null,
  draggedLink: null,


  // Actions
    addNode: (type: string, x: number, y: number) => {
    // Сначала проверяем в старом реестре
    const definition = NodeRegistry.get(type);
    if (definition) {
        const initialConfig = definition.config ? { ...definition.config } : {};
        
        const node: NodeType = {
        id: get().nextNodeId,
        type,
        title: definition.title,
        x,
        y,
        inputs: definition.inputs.map(name => ({ name, type: name === 'flow' ? 'flow' : 'data' })),
        outputs: definition.outputs.map(name => ({ name, type: name === 'flow' ? 'flow' : 'data' })),
        config: initialConfig,
        color: definition.color,
        isGetter: false,
        };

        set(state => ({
        nodes: [...state.nodes, node],
        nextNodeId: state.nextNodeId + 1,
        }));
        return;
    }
    
    // Если не нашли в старом реестре, пробуем создать кастомный узел
    const customNode = NodeFactory.create(type);
    if (customNode) {
        const nodeColor = customNode.getColor ? customNode.getColor() : '#6b7280';
        
        const node: NodeType = {
        id: get().nextNodeId,
        type,
        title: customNode.title,
        x,
        y,
        inputs: customNode.getInputs().map(p => ({ name: p.name, type: p.type === 'flow' ? 'flow' : 'data' })),
        outputs: customNode.getOutputs().map(p => ({ name: p.name, type: p.type === 'flow' ? 'flow' : 'data' })),
        config: customNode.getDefaultConfig(),
        color: nodeColor,
        isGetter: false,
        };
        set(state => ({
        nodes: [...state.nodes, node],
        nextNodeId: state.nextNodeId + 1,
        }));
        return;
    }
    
    console.warn(`Node type "${type}" not found in any registry`);
    },

  deleteNode: (nodeId: number) => {
    set(state => ({
      nodes: state.nodes.filter(n => n.id !== nodeId),
      links: state.links.filter(l => l.fromNode !== nodeId && l.toNode !== nodeId),
      selectedNodeIds: new Set([...state.selectedNodeIds].filter(id => id !== nodeId)),
      editingNodeId: state.editingNodeId === nodeId ? null : state.editingNodeId,
    }));
  },

  deleteSelectedNodes: () => {
    const selectedIds = get().selectedNodeIds;
    set(state => ({
      nodes: state.nodes.filter(n => !selectedIds.has(n.id)),
      links: state.links.filter(l => !selectedIds.has(l.fromNode) && !selectedIds.has(l.toNode)),
      selectedNodeIds: new Set(),
      editingNodeId: state.editingNodeId && selectedIds.has(state.editingNodeId) ? null : state.editingNodeId,
    }));
  },

  selectNode: (nodeId: number, addToSelection: boolean = false) => {
    set(state => ({
      selectedNodeIds: addToSelection
        ? new Set([...state.selectedNodeIds, nodeId])
        : new Set([nodeId]),
    }));
  },

  deselectNode: (nodeId: number) => {
    set(state => {
      const newSet = new Set(state.selectedNodeIds);
      newSet.delete(nodeId);
      return { selectedNodeIds: newSet };
    });
  },

  clearSelection: () => {
    set({ selectedNodeIds: new Set() });
  },

  selectNodesInRect: (rect: Rect) => {
    const nodes = get().nodes;
    const selectedIds = new Set<number>();
    
    for (const node of nodes) {
      if (node.x < rect.x + rect.w &&
          node.x + NODE_WIDTH > rect.x &&
          node.y < rect.y + rect.h &&
          node.y + NODE_HEIGHT > rect.y) {
        selectedIds.add(node.id);
      }
    }
    
    set({ selectedNodeIds: selectedIds });
  },

  addLink: (fromNode: number, fromPort: number, toNode: number, toPort: number) => {
    const nodes = get().nodes;
    const fromNodeObj = nodes.find(n => n.id === fromNode);
    const toNodeObj = nodes.find(n => n.id === toNode);
    
    if (!fromNodeObj || !toNodeObj) return false;
    
    const existingIndex = get().links.findIndex(l => l.toNode === toNode && l.toPort === toPort);
    let newLinks = [...get().links];
    if (existingIndex !== -1) {
      newLinks.splice(existingIndex, 1);
    }
    
    newLinks.push({ fromNode, fromPort, toNode, toPort });
    set({ links: newLinks });
    return true;
  },

  removeLink: (linkIndex: number) => {
    set(state => ({
      links: state.links.filter((_, i) => i !== linkIndex),
    }));
  },

  removeLinkAtPosition: (worldPos: Vector2, zoom: number) => {
    const links = get().links;
    const nodes = get().nodes;
    const threshold = 10;
    
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const fromNode = nodes.find(n => n.id === link.fromNode);
      const toNode = nodes.find(n => n.id === link.toNode);
      if (!fromNode || !toNode) continue;
      
      const start = { 
        x: fromNode.x + NODE_WIDTH, 
        y: fromNode.y + PORT_TOP_OFFSET + link.fromPort * PORT_SPACING 
      };
      const end = { 
        x: toNode.x, 
        y: toNode.y + PORT_TOP_OFFSET + link.toPort * PORT_SPACING 
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
      
      if (minDist < threshold / zoom) {
        set(state => ({
          links: state.links.filter((_, idx) => idx !== i),
        }));
        return true;
      }
    }
    return false;
  },

  updateNodePosition: (nodeId: number, x: number, y: number) => {
    set(state => ({
      nodes: state.nodes.map(node =>
        node.id === nodeId ? { ...node, x, y } : node
      ),
    }));
  },

  updateNodeConfig: (nodeId: number, config: Record<string, any>) => {
    set(state => ({
        nodes: state.nodes.map(node =>
        node.id === nodeId ? { ...node, config: { ...node.config, ...config } } : node
        ),
    }));
    },

   updateNodeGetter: (nodeId: number, isGetter: boolean) => {
    set(state => {
        const node = state.nodes.find(n => n.id === nodeId);
        if (!node) return state;
        
        let newInputs = [...node.inputs];
        let newOutputs = [...node.outputs];
        
        if (isGetter) {
        // Удаляем flow порты (оставляем только data порты)
        newInputs = node.inputs.filter(p => p.type !== 'flow');
        newOutputs = node.outputs.filter(p => p.type !== 'flow');
        } else {
        // Восстанавливаем исходные порты из registry
        const definition = NodeRegistry.get(node.type);
        if (definition) {
            newInputs = definition.inputs.map(name => ({ name, type: name === 'flow' ? 'flow' : 'data' }));
            newOutputs = definition.outputs.map(name => ({ name, type: name === 'flow' ? 'flow' : 'data' }));
        }
        }
        
        // Удаляем все связи, связанные с удалёнными flow портами
        let newLinks = [...state.links];
        if (isGetter) {
        // Удаляем связи, где этот узел участвует через flow порты
        newLinks = state.links.filter(link => {
            const fromNode = state.nodes.find(n => n.id === link.fromNode);
            const toNode = state.nodes.find(n => n.id === link.toNode);
            
            // Проверяем связь от этого узла через flow порт
            if (link.fromNode === nodeId) {
            const fromPort = node.outputs[link.fromPort];
            if (fromPort && fromPort.type === 'flow') return false;
            }
            // Проверяем связь к этому узлу через flow порт
            if (link.toNode === nodeId) {
            const toPort = node.inputs[link.toPort];
            if (toPort && toPort.type === 'flow') return false;
            }
            return true;
        });
        }
        
        return {
        nodes: state.nodes.map(n =>
            n.id === nodeId ? { ...n, inputs: newInputs, outputs: newOutputs, isGetter } : n
        ),
        links: newLinks,
        };
    });
  },

  setPan: (offsetX: number, offsetY: number) => {
    set({ offsetX, offsetY });
  },

  setZoom: (zoom: number) => {
    set({ zoom: Math.min(3, Math.max(0.2, zoom)) });
  },

  loadData: (data: any) => {
    set({
      nodes: data.nodes,
      links: data.links,
      nextNodeId: data.nextNodeId,
      selectedNodeIds: new Set(),
      editingNodeId: null,
    });
  },

  getData: () => {
    const { nodes, links, nextNodeId } = get();
    return { nodes, links, nextNodeId };
  },

  getSelectionCount: () => {
    return get().selectedNodeIds.size;
  },

  screenToWorld: (screenX: number, screenY: number, offsetX: number, offsetY: number, zoom: number) => {
    return {
      x: (screenX - offsetX) / zoom,
      y: (screenY - offsetY) / zoom,
    };
  },

  worldToScreen: (worldX: number, worldY: number, offsetX: number, offsetY: number, zoom: number) => {
    return {
      x: worldX * zoom + offsetX,
      y: worldY * zoom + offsetY,
    };
  },

  getPortAtPosition: (worldPos: Vector2) => {
    const nodes = get().nodes;
    
    for (const node of nodes) {
      for (let i = 0; i < node.inputs.length; i++) {
        const portWorldX = node.x;
        const portWorldY = node.y + PORT_TOP_OFFSET + i * PORT_SPACING;
        const dx = worldPos.x - portWorldX;
        const dy = worldPos.y - portWorldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < PORT_RADIUS) {
          return { 
            nodeId: node.id, 
            portIndex: i, 
            isOutput: false, 
            portName: node.inputs[i].name 
          };
        }
      }
      
      for (let i = 0; i < node.outputs.length; i++) {
        const portWorldX = node.x + NODE_WIDTH;
        const portWorldY = node.y + PORT_TOP_OFFSET + i * PORT_SPACING;
        const dx = worldPos.x - portWorldX;
        const dy = worldPos.y - portWorldY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < PORT_RADIUS) {
          return { 
            nodeId: node.id, 
            portIndex: i, 
            isOutput: true, 
            portName: node.outputs[i].name 
          };
        }
      }
    }
    return null;
  },

  getNodeAtPosition: (worldPos: Vector2) => {
    const nodes = get().nodes;
    for (const node of nodes) {
      if (worldPos.x >= node.x && worldPos.x <= node.x + NODE_WIDTH &&
          worldPos.y >= node.y && worldPos.y <= node.y + NODE_HEIGHT) {
        return node;
      }
    }
    return null;
  },

  openEditor: (nodeId: number) => {
    set({ editingNodeId: nodeId });
  },

  closeEditor: () => {
    set({ editingNodeId: null });
  },

  setMode: (mode: EditorMode) => {
    set({ mode });
  },

 executeButtonTrigger: async (buttonNodeId: number) => {
    const { nodes, links, mode } = get();
    
    if (mode !== 'run') {
        console.log('[Button] Режим редактирования - триггер не активен');
        return;
    }
    
    const buttonNode = nodes.find(n => n.id === buttonNodeId);
    if (!buttonNode || buttonNode.type !== 'button') {
        console.log('[Button] Узел не является кнопкой');
        return;
    }
    
    console.log(`[Button] Запуск выполнения от триггера: ${buttonNode.config.text || buttonNode.title}`);
    
    if (!globalExecutor) {
        console.error('[Button] Executor не инициализирован');
        return;
    }
    
    // Выводим информацию о связях перед выполнением
    console.log('[Button] Текущие связи:', links.map(l => ({
        from: nodes.find(n => n.id === l.fromNode)?.title,
        fromPort: l.fromPort,
        to: nodes.find(n => n.id === l.toNode)?.title,
        toPort: l.toPort
    })));
    
    await globalExecutor.executeFromNode(buttonNodeId, nodes, links);
    },

      selectLink: (linkIndex: number) => {
    set({ selectedLinkIndex: linkIndex });
  },

  clearSelectedLink: () => {
    set({ selectedLinkIndex: null });
  },

  deleteSelectedLink: () => {
    const { selectedLinkIndex, links } = get();
    if (selectedLinkIndex !== null) {
      const newLinks = [...links];
      newLinks.splice(selectedLinkIndex, 1);
      set({ links: newLinks, selectedLinkIndex: null });
    }
  },

  canConnect: (fromNodeId: number, fromPortIndex: number, toNodeId: number, toPortIndex: number) => {
    const { nodes, links } = get();
    
    const fromNode = nodes.find(n => n.id === fromNodeId);
    const toNode = nodes.find(n => n.id === toNodeId);
    
    if (!fromNode || !toNode) return false;
    if (fromNodeId === toNodeId) return false;
    
    const fromPort = fromNode.outputs[fromPortIndex];
    const toPort = toNode.inputs[toPortIndex];
    
    if (!fromPort || !toPort) return false;
    
    // Проверяем типы портов (flow или data)
    if (fromPort.type !== toPort.type) return false;
    
    // Проверяем, занят ли входной порт
    const isInputOccupied = links.some(l => l.toNode === toNodeId && l.toPort === toPortIndex);
    if (isInputOccupied) return false;
    
    return true;
  },

  startDraggingLink: (fromNodeId: number, fromPortIndex: number, startX: number, startY: number) => {
    set({
      draggedLink: {
        fromNodeId,
        fromPortIndex,
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        isValid: false,
      }
    });
  },

  updateDraggedLink: (currentX: number, currentY: number, targetPort?: PortHit) => {
    const { draggedLink, canConnect } = get();
    if (!draggedLink) return;
    
    let isValid = false;
    let targetNodeId: number | undefined;
    let targetPortIndex: number | undefined;
    
    if (targetPort) {
      isValid = canConnect(draggedLink.fromNodeId, draggedLink.fromPortIndex, targetPort.nodeId, targetPort.portIndex);
      if (isValid) {
        targetNodeId = targetPort.nodeId;
        targetPortIndex = targetPort.portIndex;
      }
    }
    
    set({
      draggedLink: {
        ...draggedLink,
        currentX,
        currentY,
        isValid,
        targetNodeId,
        targetPortIndex,
      }
    });
  },

  endDraggingLink: () => {
    const { draggedLink, addLink, canConnect, nodes } = get();
    if (!draggedLink) return;
    
    if (draggedLink.isValid && draggedLink.targetNodeId !== undefined && draggedLink.targetPortIndex !== undefined) {
      const success = addLink(
        draggedLink.fromNodeId,
        draggedLink.fromPortIndex,
        draggedLink.targetNodeId,
        draggedLink.targetPortIndex
      );
      if (success) {
        console.log('[Store] Link created successfully');
      }
    }
    
    set({ draggedLink: null });
  },
  
}));