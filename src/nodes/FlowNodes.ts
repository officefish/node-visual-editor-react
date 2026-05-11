import { NodeRegistry } from '../core/NodeRegistry';
import type { NodeType } from '../types';

export function registerFlowNodes() {
  NodeRegistry.register('if', {
    title: '🔀 If / Else',
    inputs: ['flow', 'condition'],   // порт 0: flow, порт 1: condition
    outputs: ['true', 'false'],      // порт 0: true, порт 1: false (оба flow)
    color: '#e67e22',
    execute: async (_node: NodeType, _context: Map<string, any>, inputs: Record<string, any>) => {
      const condition = inputs.condition || false;
      console.log(`[If] Условие: ${condition} → ${condition ? 'true' : 'false'}`);
      return { [condition ? 'true' : 'false']: true };
    },
  });

  NodeRegistry.register('loop', {
    title: '🔄 Loop',
    inputs: ['flow'],                // порт 0: flow
    outputs: ['flow'],               // порт 0: flow
    color: '#e67e22',
    config: { iterations: 5 },
    execute: async (node: NodeType) => {
      const iterations = node.config.iterations || 5;
      console.log(`[Loop] Запуск цикла на ${iterations} итераций`);
      return { flow: true };
    },
  });

  NodeRegistry.register('sequence', {
    title: '📋 Sequence',
    inputs: ['flow'],
    outputs: ['flow'],
    color: '#e67e22',
    execute: async () => {
      console.log('[Sequence] Выполнение последовательности');
      return { flow: true };
    },
  });
}