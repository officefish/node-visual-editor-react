import type { NodeType, Link, DraggedLink, PortHit } from '../types';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 90;
const PORT_RADIUS = 7;
const PORT_TOP_OFFSET = 30;
const PORT_SPACING = 22;

export class NodeRenderer {
  private ctx: CanvasRenderingContext2D;
  private nodes: NodeType[];
  private links: Link[];
  private selectedNodeIds: Set<number>;
  private highlightedNodeId: number | null;
  private selectedLinkIndex: number | null;
  private draggedLink: DraggedLink | null;
  private hoveredPort: PortHit | null;

  constructor(
    ctx: CanvasRenderingContext2D,
    nodes: NodeType[],
    links: Link[],
    selectedNodeIds: Set<number>,
    highlightedNodeId: number | null,
    selectedLinkIndex: number | null,
    draggedLink: DraggedLink | null,
    hoveredPort: PortHit | null
  ) {
    this.ctx = ctx;
    this.nodes = nodes;
    this.links = links;
    this.selectedNodeIds = selectedNodeIds;
    this.highlightedNodeId = highlightedNodeId;
    this.selectedLinkIndex = selectedLinkIndex;
    this.draggedLink = draggedLink;
    this.hoveredPort = hoveredPort;
  }

  updateData(
    nodes: NodeType[],
    links: Link[],
    selectedNodeIds: Set<number>,
    highlightedNodeId: number | null,
    selectedLinkIndex: number | null,
    draggedLink: DraggedLink | null,
    hoveredPort: PortHit | null
  ) {
    this.nodes = nodes;
    this.links = links;
    this.selectedNodeIds = selectedNodeIds;
    this.highlightedNodeId = highlightedNodeId;
    this.selectedLinkIndex = selectedLinkIndex;
    this.draggedLink = draggedLink;
    this.hoveredPort = hoveredPort;
  }

  draw(offsetX: number, offsetY: number, zoom: number) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(zoom, zoom);

    this.drawLinks();
    this.drawDraggedLink();
    this.drawNodes();
    this.drawPortHighlights();

    this.ctx.restore();
  }

  private drawLinks() {
    const currentZoom = this.ctx.getTransform().a;
    this.ctx.lineWidth = 2 / currentZoom;
    this.ctx.setLineDash([]);

    for (let i = 0; i < this.links.length; i++) {
      const link = this.links[i];
      const fromNode = this.nodes.find(n => n.id === link.fromNode);
      const toNode = this.nodes.find(n => n.id === link.toNode);
      if (!fromNode || !toNode) continue;

      const startX = fromNode.x + NODE_WIDTH;
      const startY = fromNode.y + PORT_TOP_OFFSET + link.fromPort * PORT_SPACING;
      const endX = toNode.x;
      const endY = toNode.y + PORT_TOP_OFFSET + link.toPort * PORT_SPACING;

      this.ctx.beginPath();
      const cp1x = startX + (endX - startX) * 0.5;
      const cp1y = startY;
      const cp2x = startX + (endX - startX) * 0.5;
      const cp2y = endY;
      this.ctx.moveTo(startX, startY);
      this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

      const isFlowLink = fromNode.outputs[link.fromPort]?.type === 'flow';
      
      // Выделенная связь - жёлтая, остальные - по типу
      if (this.selectedLinkIndex === i) {
        this.ctx.strokeStyle = '#fbbf24';
        this.ctx.lineWidth = 3 / currentZoom;
      } else {
        this.ctx.strokeStyle = isFlowLink ? '#f39c12' : '#7c7cf0';
        this.ctx.lineWidth = 2 / currentZoom;
      }
      this.ctx.stroke();
    }
  }

  private drawDraggedLink() {
    if (!this.draggedLink) return;
    
    const currentZoom = this.ctx.getTransform().a;
    this.ctx.beginPath();
    this.ctx.moveTo(this.draggedLink.startX, this.draggedLink.startY);
    this.ctx.lineTo(this.draggedLink.currentX, this.draggedLink.currentY);
    
    if (this.draggedLink.isValid) {
      this.ctx.strokeStyle = '#10b981'; // Зелёный - можно соединить
      this.ctx.lineWidth = 3 / currentZoom;
    } else {
      this.ctx.strokeStyle = '#ef4444'; // Красный - нельзя соединить
      this.ctx.lineWidth = 2 / currentZoom;
      this.ctx.setLineDash([5 / currentZoom, 5 / currentZoom]);
    }
    
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawPortHighlights() {
    if (!this.hoveredPort) return;
    
    const node = this.nodes.find(n => n.id === this.hoveredPort!.nodeId);
    if (!node) return;
    
    let portX: number, portY: number;
    if (this.hoveredPort.isOutput) {
      portX = node.x + NODE_WIDTH;
      portY = node.y + PORT_TOP_OFFSET + this.hoveredPort.portIndex * PORT_SPACING;
    } else {
      portX = node.x;
      portY = node.y + PORT_TOP_OFFSET + this.hoveredPort.portIndex * PORT_SPACING;
    }
    
    this.ctx.beginPath();
    this.ctx.arc(portX, portY, PORT_RADIUS + 4, 0, 2 * Math.PI);
    this.ctx.strokeStyle = '#fbbf24';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private drawNodes() {
    const currentZoom = this.ctx.getTransform().a;
    const fontSize = Math.max(9, Math.min(14, 12 / Math.min(1, currentZoom)));
    const titleFontSize = Math.max(11, Math.min(16, 14 / Math.min(1, currentZoom)));
    
    for (const node of this.nodes) {
      const isHighlighted = this.highlightedNodeId === node.id;
      const isSelected = this.selectedNodeIds.has(node.id);
      const isGetter = node.isGetter === true;

      // Shadow
      this.ctx.shadowBlur = isHighlighted ? 15 : 5;
      this.ctx.shadowColor = isHighlighted ? node.color : 'rgba(0,0,0,0.3)';

      // Node background
      this.ctx.fillStyle = node.color;
      this.ctx.fillRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
      
      // Header background
      this.ctx.fillStyle = isGetter ? '#7c3aed' : (isSelected ? '#3a3a5e' : '#2d2d44');
      this.ctx.fillRect(node.x, node.y, NODE_WIDTH, 28);
      this.ctx.shadowBlur = 0;

      // Border
      if (isSelected) {
        this.ctx.strokeStyle = '#ffa500';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([]);
        this.ctx.strokeRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
      } else if (isHighlighted) {
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([]);
        this.ctx.strokeRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
      } else if (isGetter) {
        this.ctx.strokeStyle = '#a855f7';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([6, 6]);
        this.ctx.strokeRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
        this.ctx.setLineDash([]);
      } else {
        this.ctx.strokeStyle = '#4a4ae6';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);
        this.ctx.strokeRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
      }

      // Title
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `bold ${titleFontSize}px monospace`;
      const titleText = isGetter ? `🔍 ${node.title}` : node.title;
      this.ctx.fillText(titleText, node.x + 8, node.y + 19);

      // Draw input ports (left side)
      for (let i = 0; i < node.inputs.length; i++) {
        const portX = node.x;
        const portY = node.y + PORT_TOP_OFFSET + i * PORT_SPACING;
        
        // Port circle
        this.ctx.beginPath();
        this.ctx.arc(portX, portY, PORT_RADIUS, 0, 2 * Math.PI);
        this.ctx.fillStyle = node.inputs[i].type === 'flow' ? '#f39c12' : '#10b981';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Port label
        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = `${fontSize}px monospace`;
        this.ctx.fillText(node.inputs[i].name, portX + 12, portY + 4);

        // Добавим отображение индексов портов для отладки (временно)
        // Draw port index for debugging
        //if (process.env.NODE_ENV === 'development') {
            this.ctx.fillStyle = '#ffffff80';
            this.ctx.font = `8px monospace`;
            this.ctx.fillText(`${i}`, portX + 5, portY - 5);
        //}
      }

      // Draw output ports (right side)
      for (let i = 0; i < node.outputs.length; i++) {
        const portX = node.x + NODE_WIDTH;
        const portY = node.y + PORT_TOP_OFFSET + i * PORT_SPACING;
        
        // Port circle
        this.ctx.beginPath();
        this.ctx.arc(portX, portY, PORT_RADIUS, 0, 2 * Math.PI);
        this.ctx.fillStyle = node.outputs[i].type === 'flow' ? '#f39c12' : '#f97316';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Port label
        this.ctx.fillStyle = '#cbd5e1';
        this.ctx.font = `${fontSize}px monospace`;
        this.ctx.fillText(node.outputs[i].name, portX - 35, portY + 4);
      }
    }
  }

  drawSelectionRect(start: { x: number; y: number }, end: { x: number; y: number }) {
    this.ctx.save();
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(start.x - end.x);
    const h = Math.abs(start.y - end.y);

    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.fillStyle = 'rgba(74, 74, 230, 0.1)';
    this.ctx.fill();
    this.ctx.strokeStyle = '#4a4ae6';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    this.ctx.restore();
  }

}

// import type { NodeType, Link } from '../types';

// const NODE_WIDTH = 200;
// const NODE_HEIGHT = 90;
// const PORT_RADIUS = 7;
// const PORT_TOP_OFFSET = 30;
// const PORT_SPACING = 22;

// export class NodeRenderer {
//   private ctx: CanvasRenderingContext2D;
//   private nodes: NodeType[];
//   private links: Link[];
//   private selectedNodeIds: Set<number>;
//   private highlightedNodeId: number | null;

//   constructor(
//     ctx: CanvasRenderingContext2D,
//     nodes: NodeType[],
//     links: Link[],
//     selectedNodeIds: Set<number>,
//     highlightedNodeId: number | null
//   ) {
//     this.ctx = ctx;
//     this.nodes = nodes;
//     this.links = links;
//     this.selectedNodeIds = selectedNodeIds;
//     this.highlightedNodeId = highlightedNodeId;
//   }

//   updateData(nodes: NodeType[], links: Link[], selectedNodeIds: Set<number>, highlightedNodeId: number | null) {
//     this.nodes = nodes;
//     this.links = links;
//     this.selectedNodeIds = selectedNodeIds;
//     this.highlightedNodeId = highlightedNodeId;
//   }

//   draw(offsetX: number, offsetY: number, zoom: number) {
//     this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
//     this.ctx.save();
//     this.ctx.translate(offsetX, offsetY);
//     this.ctx.scale(zoom, zoom);

//     this.drawLinks();
//     this.drawNodes();

//     this.ctx.restore();

    
//   }

//   drawSelectionRect(start: { x: number; y: number }, end: { x: number; y: number }) {
//     this.ctx.save();
//     const x = Math.min(start.x, end.x);
//     const y = Math.min(start.y, end.y);
//     const w = Math.abs(start.x - end.x);
//     const h = Math.abs(start.y - end.y);

//     this.ctx.beginPath();
//     this.ctx.rect(x, y, w, h);
//     this.ctx.fillStyle = 'rgba(74, 74, 230, 0.1)';
//     this.ctx.fill();
//     this.ctx.strokeStyle = '#4a4ae6';
//     this.ctx.lineWidth = 2;
//     this.ctx.stroke();
//     this.ctx.restore();
//   }

//   private drawLinks() {
//     const currentZoom = this.ctx.getTransform().a;
//     this.ctx.lineWidth = 2 / currentZoom;
//     this.ctx.setLineDash([]);

//     for (const link of this.links) {
//       const fromNode = this.nodes.find(n => n.id === link.fromNode);
//       const toNode = this.nodes.find(n => n.id === link.toNode);
//       if (!fromNode || !toNode) continue;

//       const startX = fromNode.x + NODE_WIDTH;
//       const startY = fromNode.y + PORT_TOP_OFFSET + link.fromPort * PORT_SPACING;
//       const endX = toNode.x;
//       const endY = toNode.y + PORT_TOP_OFFSET + link.toPort * PORT_SPACING;

//       this.ctx.beginPath();
//       const cp1x = startX + (endX - startX) * 0.5;
//       const cp1y = startY;
//       const cp2x = startX + (endX - startX) * 0.5;
//       const cp2y = endY;
//       this.ctx.moveTo(startX, startY);
//       this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);

//       const isFlowLink = fromNode.outputs[link.fromPort]?.type === 'flow';
//       this.ctx.strokeStyle = isFlowLink ? '#f39c12' : '#7c7cf0';
//       this.ctx.stroke();
//     }
//   }

//   private drawNodes() {
//     const currentZoom = this.ctx.getTransform().a;
//     const fontSize = Math.max(9, Math.min(14, 12 / Math.min(1, currentZoom)));
//     const titleFontSize = Math.max(11, Math.min(16, 14 / Math.min(1, currentZoom)));
    
//     for (const node of this.nodes) {
//       const isHighlighted = this.highlightedNodeId === node.id;
//       const isSelected = this.selectedNodeIds.has(node.id);
//       const isGetter = node.isGetter === true;

//       // Shadow
//       this.ctx.shadowBlur = isHighlighted ? 15 : 5;
//       this.ctx.shadowColor = isHighlighted ? node.color : 'rgba(0,0,0,0.3)';

//       // Node background
//       this.ctx.fillStyle = node.color;
//       this.ctx.fillRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
      
//       // Header background
//       this.ctx.fillStyle = isGetter ? '#7c3aed' : (isSelected ? '#3a3a5e' : '#2d2d44');
//       this.ctx.fillRect(node.x, node.y, NODE_WIDTH, 28);
//       this.ctx.shadowBlur = 0;

//       // Border
//       if (isSelected) {
//         this.ctx.strokeStyle = '#ffa500';
//         this.ctx.lineWidth = 3;
//         this.ctx.setLineDash([]);
//         this.ctx.strokeRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
//       } else if (isHighlighted) {
//         this.ctx.strokeStyle = '#ffff00';
//         this.ctx.lineWidth = 3;
//         this.ctx.setLineDash([]);
//         this.ctx.strokeRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
//       } else if (isGetter) {
//         this.ctx.strokeStyle = '#a855f7';
//         this.ctx.lineWidth = 2;
//         this.ctx.setLineDash([6, 6]);
//         this.ctx.strokeRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
//         this.ctx.setLineDash([]);
//       } else {
//         this.ctx.strokeStyle = '#4a4ae6';
//         this.ctx.lineWidth = 1;
//         this.ctx.setLineDash([]);
//         this.ctx.strokeRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
//       }

//       // Title
//       this.ctx.fillStyle = '#ffffff';
//       this.ctx.font = `bold ${titleFontSize}px monospace`;
//       const titleText = isGetter ? `🔍 ${node.title}` : node.title;
//       this.ctx.fillText(titleText, node.x + 8, node.y + 19);

//       // Draw input ports (left side)
//       for (let i = 0; i < node.inputs.length; i++) {
//         const portX = node.x;
//         const portY = node.y + PORT_TOP_OFFSET + i * PORT_SPACING;
        
//         // Port circle
//         this.ctx.beginPath();
//         this.ctx.arc(portX, portY, PORT_RADIUS, 0, 2 * Math.PI);
//         this.ctx.fillStyle = node.inputs[i].type === 'flow' ? '#f39c12' : '#10b981';
//         this.ctx.fill();
//         this.ctx.strokeStyle = '#ffffff';
//         this.ctx.lineWidth = 1;
//         this.ctx.stroke();
        
//         // Port label
//         this.ctx.fillStyle = '#cbd5e1';
//         this.ctx.font = `${fontSize}px monospace`;
//         this.ctx.fillText(node.inputs[i].name, portX + 12, portY + 4);

//         // Добавим отображение индексов портов для отладки (временно)
//         // Draw port index for debugging
//         //if (process.env.NODE_ENV === 'development') {
//             this.ctx.fillStyle = '#ffffff80';
//             this.ctx.font = `8px monospace`;
//             this.ctx.fillText(`${i}`, portX + 5, portY - 5);
//         //}
//       }

//       // Draw output ports (right side)
//       for (let i = 0; i < node.outputs.length; i++) {
//         const portX = node.x + NODE_WIDTH;
//         const portY = node.y + PORT_TOP_OFFSET + i * PORT_SPACING;
        
//         // Port circle
//         this.ctx.beginPath();
//         this.ctx.arc(portX, portY, PORT_RADIUS, 0, 2 * Math.PI);
//         this.ctx.fillStyle = node.outputs[i].type === 'flow' ? '#f39c12' : '#f97316';
//         this.ctx.fill();
//         this.ctx.strokeStyle = '#ffffff';
//         this.ctx.lineWidth = 1;
//         this.ctx.stroke();
        
//         // Port label
//         this.ctx.fillStyle = '#cbd5e1';
//         this.ctx.font = `${fontSize}px monospace`;
//         this.ctx.fillText(node.outputs[i].name, portX - 35, portY + 4);
//       }
//     }
//   }
// }