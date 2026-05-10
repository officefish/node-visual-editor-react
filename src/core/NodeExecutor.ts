import type { NodeType, Link } from '../types';
import { NodeRegistry } from './NodeRegistry';

type ExecutionContext = Map<string, any>;

export class NodeExecutor {
  private context: ExecutionContext = new Map();
  private onStatusUpdate?: (message: string) => void;
  private onNodeHighlight?: (nodeId: number | null) => void;

  constructor(
    onStatusUpdate?: (message: string) => void,
    onNodeHighlight?: (nodeId: number | null) => void
  ) {
    this.onStatusUpdate = onStatusUpdate;
    this.onNodeHighlight = onNodeHighlight;
  }

  // Запуск выполнения от конкретного узла-триггера
  async executeFromNode(startNodeId: number, nodes: NodeType[], links: Link[]) {
    this.context.clear();
    this.onStatusUpdate?.(`🚀 Запуск выполнения от триггера...`);
    await this.executeNode(startNodeId, nodes, links, new Set());
    this.onStatusUpdate?.('✅ Выполнение завершено!');
  }

  private async executeNode(
    nodeId: number,
    nodes: NodeType[],
    links: Link[],
    visited: Set<number>
  ) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || visited.has(nodeId)) return;
    visited.add(nodeId);

    this.onStatusUpdate?.(`Выполнение: ${node.title}`);
    this.onNodeHighlight?.(nodeId);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Collect inputs
    const inputs: Record<string, any> = {};
    const incomingLinks = links.filter(l => l.toNode === nodeId);
    for (const link of incomingLinks) {
      const value = this.context.get(`output_${link.fromNode}_${link.fromPort}`);
      if (value !== undefined && node.inputs[link.toPort]) {
        inputs[node.inputs[link.toPort].name] = value;
      }
    }

    // Execute node
    const definition = NodeRegistry.get(node.type);
    let outputData: Record<string, any> = { flow: true };

    if (definition?.execute) {
      outputData = await definition.execute(node, this.context, inputs);
    }

    // Save outputs
    for (const [portName, value] of Object.entries(outputData)) {
      const portIndex = node.outputs.findIndex(p => p.name === portName);
      if (portIndex !== -1) {
        this.context.set(`output_${nodeId}_${portIndex}`, value);
      }
    }

    // Continue execution through flow ports
    const outgoingLinks = links.filter(l => l.fromNode === nodeId);
    for (const link of outgoingLinks) {
      if (node.outputs[link.fromPort]?.type === 'flow') {
        const flowValue = this.context.get(`output_${nodeId}_${link.fromPort}`);
        if (flowValue === true) {
          await this.executeNode(link.toNode, nodes, links, visited);
        }
      }
    }

    this.onNodeHighlight?.(null);
  }
}