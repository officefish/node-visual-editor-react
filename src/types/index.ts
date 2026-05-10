export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Port {
  name: string;
  type: 'flow' | 'data';
}

export interface NodeType {
  id: number;
  type: string;
  title: string;
  x: number;
  y: number;
  inputs: Port[];
  outputs: Port[];
  config: Record<string, any>;
  color: string;
}

export interface Link {
  fromNode: number;
  fromPort: number;
  toNode: number;
  toPort: number;
}

export interface PortHit {
  nodeId: number;
  portIndex: number;
  isOutput: boolean;
  portName: string;
}

export interface NodeDefinition {
  title: string;
  inputs: string[];
  outputs: string[];
  color: string;
  config?: Record<string, any>;
  component?: React.ComponentType<{ node: NodeType; onUpdate: (config: Record<string, any>) => void; onClose: () => void }>;
  execute?: (
    node: NodeType,
    context: Map<string, any>,
    inputs: Record<string, any>
  ) => Promise<Record<string, any>>;
}

export type EditorState = {
  nodes: NodeType[];
  links: Link[];
  nextNodeId: number;
  offsetX: number;
  offsetY: number;
  zoom: number;
  selectedNodeIds: Set<number>;
  editingNodeId: number | null;
};

export type EditorActions = {
  addNode: (type: string, x: number, y: number) => void;
  deleteNode: (nodeId: number) => void;
  deleteSelectedNodes: () => void;
  selectNode: (nodeId: number, addToSelection?: boolean) => void;
  deselectNode: (nodeId: number) => void;
  clearSelection: () => void;
  selectNodesInRect: (rect: Rect) => void;
  addLink: (fromNode: number, fromPort: number, toNode: number, toPort: number) => boolean;
  removeLink: (linkIndex: number) => void;
  removeLinkAtPosition: (worldPos: Vector2, zoom: number) => boolean;
  updateNodePosition: (nodeId: number, x: number, y: number) => void;
  updateNodeConfig: (nodeId: number, config: Record<string, any>) => void;
  setPan: (offsetX: number, offsetY: number) => void;
  setZoom: (zoom: number) => void;
  loadData: (data: any) => void;
  getData: () => any;
  screenToWorld: (screenX: number, screenY: number, offsetX: number, offsetY: number, zoom: number) => Vector2;
  worldToScreen: (worldX: number, worldY: number, offsetX: number, offsetY: number, zoom: number) => Vector2;
  getPortAtPosition: (worldPos: Vector2) => PortHit | null;
  getNodeAtPosition: (worldPos: Vector2) => NodeType | null;
  getSelectionCount: () => number;
  openEditor: (nodeId: number) => void;
  closeEditor: () => void;
};