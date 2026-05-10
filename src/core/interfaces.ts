import type { 
    NodeType, Port, 
} from '../types';

export const DataType = {
  FLOW: 'flow',
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  OBJECT: 'object',
  ARRAY: 'array',
  AUDIO_STREAM: 'audio_stream',
  VIDEO_STREAM: 'video_stream',
  FILE: 'file',
  ANY: 'any'
} as const;

export type DataType = typeof DataType[keyof typeof DataType];

// Порт с поддержкой типов данных
export interface TypedPort {
  name: string;
  type: DataType;
  description?: string;
  required?: boolean;
}

// Конфигурация узла
export interface NodeConfig {
  [key: string]: any;
}

// Контекст выполнения узла
export interface NodeExecutionContext {
  global: any;     // Глобальный контекст
  local: Map<string, any>;      // Локальный контекст узла
  getInput: (portName: string) => any;
  setOutput: (portName: string, value: any) => void;
  log: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

// Результат выполнения узла
export interface ExecutionResult {
  continue: boolean;            // Продолжать ли выполнение
  output?: Record<string, any>; // Выходные данные
  error?: string;               // Ошибка выполнения
}

// Базовый интерфейс узла
export interface INode {
  readonly id: number;
  readonly type: string;
  readonly title: string;
  readonly description: string;
  readonly version: string;
  
  // Входные и выходные порты
  getInputs(): TypedPort[];
  getOutputs(): TypedPort[];
  
  // Конфигурация
  getDefaultConfig(): NodeConfig;
  validateConfig(config: NodeConfig): boolean;
  
  // Выполнение
  execute(context: NodeExecutionContext): Promise<ExecutionResult>;
  
  // Визуализация (опционально)
  getColor?(): string;
  getIcon?(): string;
}

// Базовый класс для всех узлов
export abstract class BaseNode implements INode {
  abstract id: number;
  abstract readonly type: string;
  abstract title: string;
  abstract description: string;
  version: string = '1.0.0';
  config: NodeConfig = {};
  
  constructor(config?: NodeConfig) {
    if (config) {
      this.config = { ...this.getDefaultConfig(), ...config };
    }
  }
  
  abstract getInputs(): TypedPort[];
  abstract getOutputs(): TypedPort[];
  abstract getDefaultConfig(): NodeConfig;
  abstract execute(context: NodeExecutionContext): Promise<ExecutionResult>;
  
  validateConfig(config: NodeConfig): boolean {
    // Базовая валидация - можно переопределить
    return true;
  }
  
  getColor(): string {
    return '#6b7280'; // Серый по умолчанию
  }
  
  getIcon(): string {
    return '📦';
  }
}

// Конструктор узла для фабрики
export type NodeConstructor = new (config?: NodeConfig) => INode;

// Реестр узлов
export interface NodeMetadata {
  constructor: NodeConstructor;
  type: string;
  title: string;
  description: string;
  category: string;
  version: string;
  icon?: string;
  color?: string;
}