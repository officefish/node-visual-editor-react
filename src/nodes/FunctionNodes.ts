import { NodeRegistry } from '../core/NodeRegistry';
import type { NodeType } from '../types';

export function registerFunctionNodes() {
  NodeRegistry.register('console', {
    title: '🖨️ Console Log',
    inputs: ['flow', 'value'],
    outputs: ['flow'],
    color: '#3498db',
    execute: async (node: NodeType, context: Map<string, any>, inputs: Record<string, any>) => {
      console.log(`[Console] Node ${node.id}:`, inputs.value);
      return { flow: true };
    },
  });

  NodeRegistry.register('math', {
    title: '🧮 Math',
    inputs: ['flow', 'a', 'b'],
    outputs: ['flow', 'result'],
    color: '#3498db',
    config: { operation: 'add' },
    execute: async (node: NodeType, context: Map<string, any>, inputs: Record<string, any>) => {
      const a = inputs.a || 0;
      const b = inputs.b || 0;
      let result = 0;
      switch (node.config.operation) {
        case 'add': result = a + b; break;
        case 'subtract': result = a - b; break;
        case 'multiply': result = a * b; break;
        case 'divide': result = b !== 0 ? a / b : 0; break;
      }
      return { flow: true, result };
    },
  });

  NodeRegistry.register('constant', {
    title: '🔢 Constant',
    inputs: [],
    outputs: ['value'],
    color: '#9b59b6',
    config: { value: 0 },
    execute: async (node: NodeType) => {
      return { value: node.config.value };
    },
  });

  NodeRegistry.register('delay', {
    title: '⏳ Delay',
    inputs: ['flow'],
    outputs: ['flow'],
    color: '#3498db',
    config: { ms: 500 },
    execute: async (node: NodeType) => {
      await new Promise(resolve => setTimeout(resolve, node.config.ms));
      return { flow: true };
    },
  });

  NodeRegistry.register('variable', {
    title: '📦 Variable',
    inputs: ['flow', 'value'],
    outputs: ['flow'],
    color: '#3498db',
    config: { action: 'set', varName: 'myVar' },
    execute: async (node: NodeType, context: Map<string, any>, inputs: Record<string, any>) => {
      if (node.config.action === 'set') {
        context.set(node.config.varName, inputs.value);
      } else {
        const value = context.get(node.config.varName);
        return { flow: true, value };
      }
      return { flow: true };
    },
  });
}