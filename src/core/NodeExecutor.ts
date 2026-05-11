import type { NodeType, Link } from '../types';
import { NodeRegistry } from './NodeRegistry';

type ExecutionContext = Map<string, any>;

export class NodeExecutor {
  private context: ExecutionContext = new Map();
  private onStatusUpdate?: (message: string) => void;
  private onNodeHighlight?: (nodeId: number | null) => void;

  constructor(
    onStatusUpdate?: (message: string) => void,
    onNodeHighlight?: (nodeId: number | null) => void
  ) {
    this.onStatusUpdate = onStatusUpdate;
    this.onNodeHighlight = onNodeHighlight;
  }

  async executeFromNode(startNodeId: number, nodes: NodeType[], links: Link[]) {
    this.context.clear();
    this.onStatusUpdate?.(`🚀 Запуск выполнения от триггера...`);
    
    // Сначала собираем значения со всех Getter узлов
    await this.evaluateAllGetters(nodes, links);
    
    // Выводим содержимое контекста после сбора Getter узлов
    console.log('[Executor] Контекст после сбора Getter узлов:', Array.from(this.context.entries()));
    
    // Затем запускаем выполнение от стартового узла
    await this.executeFromStartNode(startNodeId, nodes, links, new Set());
    
    this.onStatusUpdate?.('✅ Выполнение завершено!');
  }

  private async evaluateAllGetters(nodes: NodeType[], links: Link[]) {
    const getterNodes = nodes.filter(node => node.isGetter === true);
    
    for (const node of getterNodes) {
      await this.evaluateGetterNode(node, nodes, links);
    }
  }

  private async evaluateGetterNode(node: NodeType, nodes: NodeType[], links: Link[]) {
    const definition = NodeRegistry.get(node.type);
    if (!definition?.execute) return;
    
    const inputs: Record<string, any> = {};
    const incomingLinks = links.filter(l => l.toNode === node.id);
    
    for (const link of incomingLinks) {
        const fromNode = nodes.find(n => n.id === link.fromNode);
        if (fromNode && fromNode.isGetter) {
        const key = `output_${link.fromNode}_${link.fromPort}`;
        const value = this.context.get(key);
        if (value !== undefined && node.inputs[link.toPort]) {
            inputs[node.inputs[link.toPort].name] = value;
        }
        }
    }
    
    const outputData = await definition.execute(node, this.context, inputs);
    
    // Сохраняем выходные значения с правильными индексами портов
    for (const [portName, value] of Object.entries(outputData)) {
        // Находим индекс порта по его имени
        const portIndex = node.outputs.findIndex(p => p.name === portName);
        if (portIndex !== -1) {
        const key = `output_${node.id}_${portIndex}`;
        this.context.set(key, value);
        console.log(`[Executor] Getter узел ${node.title} сохранил значение "${value}" по ключу "${key}" (порт ${portName}, индекс ${portIndex})`);
        } else {
        console.warn(`[Executor] Порт "${portName}" не найден в узле ${node.title}. Доступные порты:`, node.outputs.map(p => p.name));
        }
    }
  }

  private async executeFromStartNode(
    startNodeId: number,
    nodes: NodeType[],
    links: Link[],
    visited: Set<number>
  ) {
    const startNode = nodes.find(n => n.id === startNodeId);
    if (!startNode) return;
    
    this.onStatusUpdate?.(`Запуск от триггера: ${startNode.title}`);
    this.onNodeHighlight?.(startNodeId);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Находим все исходящие связи от стартового узла
    const outgoingLinks = links.filter(l => l.fromNode === startNodeId);
    
    for (const link of outgoingLinks) {
      if (startNode.outputs[link.fromPort]?.type === 'flow') {
        await this.executeNode(link.toNode, nodes, links, visited);
      }
    }
    
    this.onNodeHighlight?.(null);
  }

  private async executeNode(
    nodeId: number,
    nodes: NodeType[],
    links: Link[],
    visited: Set<number>
  ) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || visited.has(nodeId)) return;
    
    if (node.isGetter) {
      return;
    }
    
    if (node.type === 'button') {
      return;
    }
    
    visited.add(nodeId);

    this.onStatusUpdate?.(`Выполнение: ${node.title}`);
    this.onNodeHighlight?.(nodeId);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Собираем входные данные из контекста
    const inputs: Record<string, any> = {};
    const incomingLinks = links.filter(l => l.toNode === nodeId);
    
    console.log(`[Executor] Узел ${node.title} имеет ${incomingLinks.length} входящих связей`);
    
    for (const link of incomingLinks) {
      const fromNode = nodes.find(n => n.id === link.fromNode);
      const key = `output_${link.fromNode}_${link.fromPort}`;
      const value = this.context.get(key);
      
      console.log(`[Executor] Проверка связи: ключ="${key}", значение=${value}, fromNode=${fromNode?.title}, fromPort=${link.fromPort}, toPort=${link.toPort}`);
      
      if (value !== undefined && node.inputs[link.toPort]) {
        const inputName = node.inputs[link.toPort].name;
        inputs[inputName] = value;
        console.log(`[Executor] ✅ Передано значение "${value}" в порт "${inputName}" узла ${node.title}`);
      } else {
        console.log(`[Executor] ⚠️ Не удалось передать значение: value=${value}, порт существует=${!!node.inputs[link.toPort]}`);
      }
    }

    // Выполнение узла
    const definition = NodeRegistry.get(node.type);
    let outputData: Record<string, any> = {};

    

    if (definition?.execute) {
      console.log(`[Executor] Вызов execute для узла ${node.title} с inputs:`, inputs);
      outputData = await definition.execute(node, this.context, inputs);
      console.log(`[Executor] Результат execute:`, outputData);
    }

    // Сохраняем выходные данные в контекст
    for (const [portName, value] of Object.entries(outputData)) {
      const portIndex = node.outputs.findIndex(p => p.name === portName);
      if (portIndex !== -1) {
        const key = `output_${nodeId}_${portIndex}`;
        this.context.set(key, value);
        console.log(`[Executor] Узел ${node.title} сохранил значение "${value}" по ключу "${key}" (порт ${portName}, индекс ${portIndex})`);
      }
    }

    // Продолжаем выполнение по flow портам
    const outgoingLinks = links.filter(l => l.fromNode === nodeId);
    for (const link of outgoingLinks) {
      if (node.outputs[link.fromPort]?.type === 'flow') {
        const key = `output_${nodeId}_${link.fromPort}`;
        const flowValue = this.context.get(key);
        if (flowValue === true) {
          console.log(`[Executor] Продолжение выполнения по flow: ${node.title} -> узел ${link.toNode}`);
          await this.executeNode(link.toNode, nodes, links, visited);
        }
      }
    }

    this.onNodeHighlight?.(null);
  }
}