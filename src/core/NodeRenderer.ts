import type { NodeType, Link } from '../types';

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

  constructor(
    ctx: CanvasRenderingContext2D,
    nodes: NodeType[],
    links: Link[],
    selectedNodeIds: Set<number>,
    highlightedNodeId: number | null
  ) {
    this.ctx = ctx;
    this.nodes = nodes;
    this.links = links;
    this.selectedNodeIds = selectedNodeIds;
    this.highlightedNodeId = highlightedNodeId;
  }

  updateData(nodes: NodeType[], links: Link[], selectedNodeIds: Set<number>, highlightedNodeId: number | null) {
    this.nodes = nodes;
    this.links = links;
    this.selectedNodeIds = selectedNodeIds;
    this.highlightedNodeId = highlightedNodeId;
  }

  draw(offsetX: number, offsetY: number, zoom: number) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(zoom, zoom);

    this.drawLinks();
    this.drawNodes();

    this.ctx.restore();
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

  private drawLinks() {
    this.ctx.lineWidth = 2 / this.ctx.getTransform().a;

    for (const link of this.links) {
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
      this.ctx.strokeStyle = isFlowLink ? '#f39c12' : '#7c7cf0';
      this.ctx.stroke();
    }
  }

  private drawNodes() {
    for (const node of this.nodes) {
      const isHighlighted = this.highlightedNodeId === node.id;
      const isSelected = this.selectedNodeIds.has(node.id);

      // Shadow
      this.ctx.shadowBlur = isHighlighted ? 15 : 5;
      this.ctx.shadowColor = isHighlighted ? node.color : 'rgba(0,0,0,0.3)';

      // Node background
      this.ctx.fillStyle = node.color;
      this.ctx.fillRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);
      this.ctx.fillStyle = isSelected ? '#3a3a5e' : '#2d2d44';
      this.ctx.fillRect(node.x, node.y, NODE_WIDTH, 28);
      this.ctx.shadowBlur = 0;

      // Border
      if (isSelected) {
        this.ctx.strokeStyle = '#ffa500';
        this.ctx.lineWidth = 3;
      } else if (isHighlighted) {
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 3;
      } else {
        this.ctx.strokeStyle = '#4a4ae6';
        this.ctx.lineWidth = 1;
      }
      this.ctx.strokeRect(node.x, node.y, NODE_WIDTH, NODE_HEIGHT);

      // Title
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `bold ${12 / Math.min(1, this.ctx.getTransform().a)}px monospace`;
      this.ctx.fillText(node.title, node.x + 8, node.y + 19);

      // Input ports
      for (let i = 0; i < node.inputs.length; i++) {
        const portX = node.x;
        const portY = node.y + PORT_TOP_OFFSET + i * PORT_SPACING;
        this.ctx.beginPath();
        this.ctx.arc(portX, portY, PORT_RADIUS, 0, 2 * Math.PI);
        this.ctx.fillStyle = node.inputs[i].type === 'flow' ? '#f39c12' : '#5cb85c';
        this.ctx.fill();
        this.ctx.fillStyle = '#ccc';
        this.ctx.font = `9px monospace`;
        this.ctx.fillText(node.inputs[i].name, portX + 10, portY + 4);
      }

      // Output ports
      for (let i = 0; i < node.outputs.length; i++) {
        const portX = node.x + NODE_WIDTH;
        const portY = node.y + PORT_TOP_OFFSET + i * PORT_SPACING;
        this.ctx.beginPath();
        this.ctx.arc(portX, portY, PORT_RADIUS, 0, 2 * Math.PI);
        this.ctx.fillStyle = node.outputs[i].type === 'flow' ? '#f39c12' : '#e67e22';
        this.ctx.fill();
        this.ctx.fillStyle = '#ccc';
        this.ctx.fillText(node.outputs[i].name, portX - 35, portY + 4);
      }
    }
  }
}