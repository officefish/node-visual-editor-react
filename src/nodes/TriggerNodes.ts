import { NodeRegistry } from '../core/NodeRegistry';
import type { NodeType } from '../types';

export function registerTriggerNodes() {

  NodeRegistry.register('button', {
    title: '🔘 Button Trigger',
    inputs: [],
    outputs: ['flow'],
    color: '#e67e22',
    config: { text: 'Запустить сценарий' },
    execute: async (node: NodeType, _context: Map<string, any>, _inputs: Record<string, any>) => {
      console.log(`[Button Trigger] Запуск сценария от кнопки: ${node.config.text || node.title}`);
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
      console.log('[Timer] Тик таймера');
      return { flow: true };
    },
  });

  NodeRegistry.register('http', {
    title: '🌐 HTTP',
    inputs: [],
    outputs: ['flow', 'data'],
    color: '#27ae60',
    execute: async () => {
      console.log('[HTTP] Обработка запроса');
      return { flow: true, data: { method: 'GET', url: '/' } };
    },
  });
}