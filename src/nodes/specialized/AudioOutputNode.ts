import { BaseNode, DataType } from '../../core/interfaces';
import type { TypedPort, NodeExecutionContext, ExecutionResult, NodeConfig } from '../../core/interfaces';
import { NodeFactory } from '../../core/NodeFactory';

export class AudioOutputNode extends BaseNode {
  id: number = 0;
  type: string = 'audio_output';
  title: string = '🔈 Audio Output';
  description: string = 'Вывод обработанного аудиопотока на устройство';
  
  getInputs(): TypedPort[] {
    return [
      { name: 'flow', type: DataType.FLOW, description: 'Входной поток' },
      { name: 'audio_stream', type: DataType.AUDIO_STREAM, description: 'Аудиопоток для вывода', required: true }
    ];
  }
  
  getOutputs(): TypedPort[] {
    return [
      { name: 'flow', type: DataType.FLOW, description: 'Поток выполнения' }
    ];
  }
  
  getDefaultConfig(): NodeConfig {
    return {
      volume: 0.8,
      autoPlay: true
    };
  }
  
  getColor(): string {
    return '#c084fc';
  }
  
  getIcon(): string {
    return '🔈';
  }
  
  async execute(context: NodeExecutionContext): Promise<ExecutionResult> {
    const audioStream = context.getInput('audio_stream');
    
    if (!audioStream) {
      context.log('Нет аудиопотока для вывода', 'error');
      return { continue: false, error: 'No audio stream provided' };
    }
    
    context.log(`Вывод аудио с громкостью ${this.config.volume}`);
    
    // Здесь реальный вывод аудио
    if (audioStream.stream && this.config.autoPlay) {
      // Создаем аудио элемент для воспроизведения
      const audio = new Audio();
      // В реальном приложении здесь будет подключение к аудиоустройству
    }
    
    context.setOutput('flow', true);
    
    return { continue: true, output: { flow: true } };
  }
}

NodeFactory.register({
  constructor: AudioOutputNode,
  type: 'audio_output',
  title: '🔈 Audio Output',
  description: 'Вывод обработанного аудиопотока',
  category: 'media',
  version: '1.0.0',
  icon: '🔈',
  color: '#c084fc'
});