import { NodeRegistry } from '../core/NodeRegistry';
import type { NodeType } from '../types';

export function registerFlowNodes() {
  NodeRegistry.register('if', {
    title: '🔀 If / Else',
    inputs: ['flow', 'condition'],
    outputs: ['true', 'false'],
    color: '#e67e22',
    execute: async (node: NodeType, context: Map<string, any>, inputs: Record<string, any>) => {
      const condition = inputs.condition || false;
      return { [condition ? 'true' : 'false']: true };
    },
  });

  NodeRegistry.register('loop', {
    title: '🔄 Loop',
    inputs: ['flow'],
    outputs: ['flow'],
    color: '#e67e22',
    config: { condition: 'i < 5', varName: 'i' },
    execute: async () => {
      return { flow: true };
    },
  });

  NodeRegistry.register('sequence', {
    title: '📋 Sequence',
    inputs: ['flow'],
    outputs: ['flow'],
    color: '#e67e22',
    execute: async () => {
      return { flow: true };
    },
  });
}