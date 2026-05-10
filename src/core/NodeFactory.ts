import type { INode, NodeConstructor, NodeMetadata, NodeConfig } from './interfaces';

class NodeFactoryClass {
  private registry: Map<string, NodeMetadata> = new Map();
  
  register(metadata: NodeMetadata): void {
    if (this.registry.has(metadata.type)) {
      console.warn(`Node type "${metadata.type}" already registered. Overwriting...`);
    }
    this.registry.set(metadata.type, metadata);
    console.log(`✅ Registered node: ${metadata.title} (${metadata.type})`);
  }
  
  create(type: string, config?: NodeConfig): INode | null {
    const metadata = this.registry.get(type);
    if (!metadata) {
      console.error(`Node type "${type}" not found`);
      return null;
    }
    
    const node = new metadata.constructor(config);
    return node;
  }
  
  getAllMetadata(): NodeMetadata[] {
    return Array.from(this.registry.values());
  }
  
  getByCategory(category: string): NodeMetadata[] {
    return this.getAllMetadata().filter(m => m.category === category);
  }
  
  has(type: string): boolean {
    return this.registry.has(type);
  }
  
  getMetadata(type: string): NodeMetadata | undefined {
    return this.registry.get(type);
  }
}

export const NodeFactory = new NodeFactoryClass();