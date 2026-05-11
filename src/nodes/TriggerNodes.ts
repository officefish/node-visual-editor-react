import { NodeRegistry } from '../core/NodeRegistry';

export function registerTriggerNodes() {
  NodeRegistry.register('button', {
    title: '🔘 Button Trigger',
    inputs: [],                      // нет входов
    outputs: ['flow'],               // порт 0: flow
    color: '#e67e22',
    config: { text: 'Запустить сценарий' },
    execute: async () => {
      console.log('[Button Trigger] Выполнение триггера');
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