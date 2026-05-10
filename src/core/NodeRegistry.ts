import type { NodeDefinition } from '../types';

class NodeRegistryClass {
  private nodes: Map<string, NodeDefinition> = new Map();

  register(type: string, definition: NodeDefinition): void {
    this.nodes.set(type, definition);
  }

  get(type: string): NodeDefinition | undefined {
    return this.nodes.get(type);
  }

  getAll(): Map<string, NodeDefinition> {
    return new Map(this.nodes);
  }

  getTypes(): string[] {
    return Array.from(this.nodes.keys());
  }
  
  has(type: string): boolean {
    return this.nodes.has(type);
  }
}

export const NodeRegistry = new NodeRegistryClass();