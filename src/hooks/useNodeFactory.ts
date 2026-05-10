import { useEffect, useState } from 'react';
import { NodeFactory } from '../core/NodeFactory';
import type { NodeMetadata } from '../core/interfaces';
import { NodeRegistry } from '../core/NodeRegistry';
import type { NodeType, NodeDefinition } from '../types';

export const useNodeFactory = () => {
  const [nodes, setNodes] = useState<NodeMetadata[]>([]);
  const [categories, setCategories] = useState<Map<string, NodeMetadata[]>>(new Map());
  
  useEffect(() => {
    const allNodes = NodeFactory.getAllMetadata();
    setNodes(allNodes);
    
    const cats = new Map<string, NodeMetadata[]>();
    for (const node of allNodes) {
      if (!cats.has(node.category)) {
        cats.set(node.category, []);
      }
      cats.get(node.category)!.push(node);
    }
    setCategories(cats);
    
    // Регистрируем узлы в старом NodeRegistry для совместимости
    for (const node of allNodes) {
      // Проверяем существование через get вместо has
      const existing = NodeRegistry.get(node.type);
      if (!existing) {
        const tempNode = NodeFactory.create(node.type);
        if (tempNode) {
          const definition: NodeDefinition = {
            title: node.title,
            inputs: tempNode.getInputs().map(p => p.name),
            outputs: tempNode.getOutputs().map(p => p.name),
            color: node.color || '#6b7280',
            config: tempNode.getDefaultConfig(),
            execute: async (nodeType: NodeType, context: Map<string, any>, inputs: Record<string, any>) => {
              return { flow: true };
            }
          };
          NodeRegistry.register(node.type, definition);
        }
      }
    }
  }, []);
  
  const getNodesByCategory = (category: string): NodeMetadata[] => {
    return categories.get(category) || [];
  };
  
  const createNode = (type: string, id?: number, config?: any) => {
    return NodeFactory.create(type, config);
  };
  
  return {
    nodes,
    categories,
    getNodesByCategory,
    createNode,
    NodeFactory
  };
};