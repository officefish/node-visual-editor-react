import { create } from 'zustand';
import type { EditorState, EditorActions, Rect, Vector2, PortHit, NodeType, Link } from '../types';
import { NodeRegistry } from '../core/NodeRegistry';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 90;
const PORT_RADIUS = 7;
const PORT_TOP_OFFSET = 30;
const PORT_SPACING = 22;

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
  // State
  nodes: [],
  links: [],
  nextNodeId: 1,
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  selectedNodeIds: new Set<number>(),

  // Actions
  addNode: (type: string, x: number, y: number) => {
    const definition = NodeRegistry.get(type);
    if (!definition) return;

    const node: NodeType = {
      id: get().nextNodeId,
      type,
      title: definition.title,
      x,
      y,
      inputs: definition.inputs.map((name: string) => ({ name, type: name === 'flow' ? 'flow' : 'data' })),
      outputs: definition.outputs.map((name: string) => ({ name, type: name === 'flow' ? 'flow' : 'data' })),
      config: definition.config || {},
      color: definition.color,
    };

    set(state => ({
      nodes: [...state.nodes, node],
      nextNodeId: state.nextNodeId + 1,
    }));
  },

  deleteNode: (nodeId: number) => {
    set(state => ({
      nodes: state.nodes.filter(n => n.id !== nodeId),
      links: state.links.filter(l => l.fromNode !== nodeId && l.toNode !== nodeId),
      selectedNodeIds: new Set([...state.selectedNodeIds].filter(id => id !== nodeId)),
    }));
  },

  deleteSelectedNodes: () => {
    const selectedIds = get().selectedNodeIds;
    set(state => ({
      nodes: state.nodes.filter(n => !selectedIds.has(n.id)),
      links: state.links.filter(l => !selectedIds.has(l.fromNode) && !selectedIds.has(l.toNode)),
      selectedNodeIds: new Set(),
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
    
    // Remove existing link to the same input port
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
      // Input ports
      for (let i = 0; i < node.inputs.length; i++) {
        const portWorldX = node.x;
        const portWorldY = node.y + PORT_TOP_OFFSET + i * PORT_SPACING;
        if (Math.hypot(worldPos.x - portWorldX, worldPos.y - portWorldY) < PORT_RADIUS) {
          return { 
            nodeId: node.id, 
            portIndex: i, 
            isOutput: false, 
            portName: node.inputs[i].name 
          };
        }
      }
      
      // Output ports
      for (let i = 0; i < node.outputs.length; i++) {
        const portWorldX = node.x + NODE_WIDTH;
        const portWorldY = node.y + PORT_TOP_OFFSET + i * PORT_SPACING;
        if (Math.hypot(worldPos.x - portWorldX, worldPos.y - portWorldY) < PORT_RADIUS) {
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
}));