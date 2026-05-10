import { NodeRegistry } from '../core/NodeRegistry';
import type { NodeType } from '../types';
import { TextNodeEditor, ConstantNodeEditor, MathNodeEditor } from '../components/NodeEditors';

export function registerFunctionNodes() {
  NodeRegistry.register('console', {
    title: '🖨️ Console Log',
    inputs: ['flow', 'value'],
    outputs: ['flow'],
    color: '#3498db',
    execute: async (_node: NodeType, _context: Map<string, any>, inputs: Record<string, any>) => {
      console.log('[Console]', inputs.value);
      return { flow: true };
    },
  });

  NodeRegistry.register('text', {
    title: '📝 Текст',
    inputs: ['flow'],
    outputs: ['flow', 'result'],
    color: '#3498db',
    config: { text: '' },
    component: TextNodeEditor,
    execute: async (node: NodeType, _context: Map<string, any>, _inputs: Record<string, any>) => {
      const text = node.config.text || '';
      console.log(`[Text Node] Вывод: ${text}`);
      return { flow: true, result: text };
    },
  });

  NodeRegistry.register('constant', {
    title: '🔢 Константа',
    inputs: [],
    outputs: ['value'],
    color: '#9b59b6',
    config: { value: 0, type: 'number' },
    component: ConstantNodeEditor,
    execute: async (node: NodeType) => {
      let value = node.config.value;
      if (node.config.type === 'number') {
        value = Number(value) || 0;
      } else if (node.config.type === 'boolean') {
        value = value === 'true' || value === true;
      } else {
        value = String(value);
      }
      console.log(`[Constant] Значение: ${value}`);
      return { value };
    },
  });

  NodeRegistry.register('math', {
    title: '🧮 Математика',
    inputs: ['flow', 'a', 'b'],
    outputs: ['flow', 'result'],
    color: '#3498db',
    config: { operation: 'add' },
    component: MathNodeEditor,
    execute: async (node: NodeType, _context: Map<string, any>, inputs: Record<string, any>) => {
      const a = Number(inputs.a) || 0;
      const b = Number(inputs.b) || 0;
      let result = 0;
      switch (node.config.operation) {
        case 'add': result = a + b; break;
        case 'subtract': result = a - b; break;
        case 'multiply': result = a * b; break;
        case 'divide': result = b !== 0 ? a / b : 0; break;
      }
      console.log(`[Math] ${a} ${node.config.operation} ${b} = ${result}`);
      return { flow: true, result };
    },
  });

  NodeRegistry.register('delay', {
    title: '⏳ Задержка',
    inputs: ['flow'],
    outputs: ['flow'],
    color: '#3498db',
    config: { ms: 500 },
    execute: async (node: NodeType) => {
      await new Promise(resolve => setTimeout(resolve, node.config.ms));
      console.log(`[Delay] Задержка ${node.config.ms}ms`);
      return { flow: true };
    },
  });

  NodeRegistry.register('variable', {
    title: '📦 Переменная',
    inputs: ['flow', 'value'],
    outputs: ['flow', 'value'],
    color: '#3498db',
    config: { action: 'set', varName: 'myVar' },
    execute: async (node: NodeType, context: Map<string, any>, inputs: Record<string, any>) => {
      if (node.config.action === 'set') {
        context.set(node.config.varName, inputs.value);
        console.log(`[Variable] ${node.config.varName} =`, inputs.value);
        return { flow: true };
      } else {
        const value = context.get(node.config.varName);
        console.log(`[Variable] Чтение ${node.config.varName}:`, value);
        return { flow: true, value };
      }
    },
  });
}