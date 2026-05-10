import { NodeRegistry } from '../core/NodeRegistry';
import type { NodeType } from '../types';

export function registerTriggerNodes() {
  NodeRegistry.register('start', {
    title: '▶ Start Trigger',
    inputs: [],
    outputs: ['flow'],
    color: '#27ae60',
    execute: async () => {
      return { flow: true };
    },
  });

  NodeRegistry.register('timer', {
    title: '⏰ Timer',
    inputs: [],
    outputs: ['flow'],
    color: '#27ae60',
    config: { interval: 1000 },
    execute: async () => {
      return { flow: true };
    },
  });

  NodeRegistry.register('http', {
    title: '🌐 HTTP',
    inputs: [],
    outputs: ['flow', 'data'],
    color: '#27ae60',
    execute: async () => {
      return { flow: true, data: { method: 'GET', url: '/' } };
    },
  });
}