import { BaseNode, DataType } from '../../core/interfaces';
import type { TypedPort, NodeExecutionContext, ExecutionResult, NodeConfig } from '../../core/interfaces';
import { NodeFactory } from '../../core/NodeFactory';

// Интерфейс для аудио устройства
interface AudioDevice {
  id: string;
  name: string;
  type: 'input' | 'output';
}

// Класс узла AudioStream
export class AudioStreamNode extends BaseNode {
  id: number = 0;
  readonly type: string = 'audio_stream';
  title: string = '🎵 Audio Stream';
  description: string = 'Захват аудиопотока с выбранного устройства';
  
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  
  getInputs(): TypedPort[] {
    return [
      { name: 'start', type: DataType.FLOW, description: 'Запуск захвата аудио' },
      { name: 'stop', type: DataType.FLOW, description: 'Остановка захвата аудио' }
    ];
  }
  
  getOutputs(): TypedPort[] {
    return [
      { name: 'flow', type: DataType.FLOW, description: 'Поток выполнения' },
      { name: 'audio_stream', type: DataType.AUDIO_STREAM, description: 'Аудиопоток для обработки' },
      { name: 'error', type: DataType.FLOW, description: 'Ошибка захвата' }
    ];
  }
  
  getDefaultConfig(): NodeConfig {
    return {
      deviceId: 'default',
      deviceName: 'Микрофон по умолчанию',
      sampleRate: 44100,
      channelCount: 1,
      autoStart: false
    };
  }
  
  validateConfig(config: NodeConfig): boolean {
    if (!config.deviceId) return false;
    if (typeof config.sampleRate !== 'number' || config.sampleRate < 8000 || config.sampleRate > 192000) return false;
    if (typeof config.channelCount !== 'number' || config.channelCount < 1 || config.channelCount > 2) return false;
    return true;
  }
  
  getColor(): string {
    return '#8b5cf6';
  }
  
  getIcon(): string {
    return '🎵';
  }
  
  // Получение списка аудио устройств
  static async getAudioDevices(): Promise<AudioDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          id: device.deviceId,
          name: device.label || `Микрофон ${device.deviceId.slice(0, 8)}`,
          type: 'input'
        }));
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }
  
  // Запуск аудио потока
  private async startAudioStream(): Promise<MediaStream | null> {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          deviceId: this.config.deviceId !== 'default' ? { exact: this.config.deviceId } : undefined,
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;
      
      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      
      return stream;
    } catch (error) {
      console.error('Error starting audio stream:', error);
      return null;
    }
  }
  
  // Остановка аудио потока
  private stopAudioStream(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }
  
  async execute(context: NodeExecutionContext): Promise<ExecutionResult> {
    const inputStart = context.getInput('start');
    const inputStop = context.getInput('stop');
    
    if (inputStart === true) {
      context.log(`Запуск аудио потока с устройства: ${this.config.deviceName}`);
      
      const stream = await this.startAudioStream();
      
      if (stream) {
        const audioWrapper = {
          stream: stream,
          audioContext: this.audioContext,
          sourceNode: this.sourceNode,
          getAudioData: () => {
            return { timestamp: Date.now(), level: 0.5 };
          }
        };
        
        context.setOutput('audio_stream', audioWrapper);
        context.setOutput('flow', true);
        
        context.log('✅ Аудио поток успешно запущен');
        return { continue: true, output: { flow: true, audio_stream: audioWrapper } };
      } else {
        context.setOutput('error', true);
        context.log('❌ Ошибка запуска аудио потока', 'error');
        return { continue: false, error: 'Failed to start audio stream' };
      }
    }
    
    if (inputStop === true) {
      context.log('Остановка аудио потока');
      this.stopAudioStream();
      context.setOutput('flow', true);
      return { continue: true, output: { flow: true } };
    }
    
    return { continue: true };
  }
}

// Регистрация узла в фабрике
NodeFactory.register({
  constructor: AudioStreamNode,
  type: 'audio_stream',
  title: '🎵 Audio Stream',
  description: 'Захват аудиопотока с выбранного устройства для дальнейшей обработки',
  category: 'media',
  version: '1.0.0',
  icon: '🎵',
  color: '#8b5cf6'
});

export const audioStreamMetadata = NodeFactory.getMetadata('audio_stream');