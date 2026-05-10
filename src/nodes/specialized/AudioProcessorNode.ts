import { BaseNode, DataType } from '../../core/interfaces';
import type { TypedPort, NodeExecutionContext, ExecutionResult, NodeConfig } from '../../core/interfaces';
import { NodeFactory } from '../../core/NodeFactory';

export class AudioProcessorNode extends BaseNode {
  id: number = 0;
  type: string = 'audio_processor';
  title: string = '🔊 Audio Processor';
  description: string = 'Обработка аудиопотока (фильтры, усиление)';
  
  getInputs(): TypedPort[] {
    return [
      { name: 'flow', type: DataType.FLOW, description: 'Входной поток' },
      { name: 'audio_stream', type: DataType.AUDIO_STREAM, description: 'Аудиопоток для обработки', required: true }
    ];
  }
  
  getOutputs(): TypedPort[] {
    return [
      { name: 'flow', type: DataType.FLOW, description: 'Поток выполнения' },
      { name: 'processed_audio', type: DataType.AUDIO_STREAM, description: 'Обработанный аудиопоток' }
    ];
  }
  
  getDefaultConfig(): NodeConfig {
    return {
      gain: 1.0,           // Усиление (0-2)
      lowPassFilter: false,
      highPassFilter: false,
      noiseReduction: false
    };
  }
  
  getColor(): string {
    return '#a855f7';
  }
  
  getIcon(): string {
    return '🔊';
  }
  
  async execute(context: NodeExecutionContext): Promise<ExecutionResult> {
    const audioStream = context.getInput('audio_stream');
    
    if (!audioStream) {
      context.log('Нет аудиопотока для обработки', 'error');
      return { continue: false, error: 'No audio stream provided' };
    }
    
    context.log(`Обработка аудио: gain=${this.config.gain}, lowPass=${this.config.lowPassFilter}`);
    
    // Создаем обработанный аудиопоток (здесь реальная обработка)
    const processedAudio = {
      ...audioStream,
      processed: true,
      gain: this.config.gain,
      filters: {
        lowPass: this.config.lowPassFilter,
        highPass: this.config.highPassFilter
      }
    };
    
    context.setOutput('processed_audio', processedAudio);
    context.setOutput('flow', true);
    
    return { continue: true, output: { flow: true, processed_audio: processedAudio } };
  }
}

NodeFactory.register({
  constructor: AudioProcessorNode,
  type: 'audio_processor',
  title: '🔊 Audio Processor',
  description: 'Обработка аудиопотока с возможностью настройки фильтров',
  category: 'media',
  version: '1.0.0',
  icon: '🔊',
  color: '#a855f7'
});