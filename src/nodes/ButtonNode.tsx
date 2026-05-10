import React from 'react';
import type { NodeType } from '../types';
import { useEditorStore } from '../store/editorStore';

interface ButtonNodeRendererProps {
  node: NodeType;
  isRunning: boolean;
  zoom: number;
}

// Компонент для отображения кнопки на канвасе
export const ButtonNodeRenderer: React.FC<ButtonNodeRendererProps> = ({ node, isRunning, zoom }) => {
  const { executeButtonTrigger, mode } = useEditorStore();
  
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === 'run') {
      console.log(`[Button] Запуск сценария от кнопки "${node.config.text || node.title}"`);
      await executeButtonTrigger(node.id);
    }
  };
  
  // Размеры шрифта в зависимости от масштаба
  const iconSize = Math.max(16, Math.min(48, 32 * zoom));
  const fontSize = Math.max(10, Math.min(16, 14 * zoom));
  
  // В режиме редактирования - статичный блок
  if (mode === 'edit') {
    return (
      <div 
        className="w-full h-full rounded-lg bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center"
        style={{
          backgroundColor: '#374151',
          borderColor: '#6B7280',
        }}
      >
        <div className="flex flex-col items-center justify-center gap-1">
          <span style={{ fontSize: `${iconSize}px` }}>⚙️</span>
          <span 
            className="font-mono font-bold text-gray-300"
            style={{ fontSize: `${fontSize}px` }}
          >
            {node.config.text || 'Button'}
          </span>
        </div>
      </div>
    );
  }
  
  // В режиме выполнения - активная кнопка
  return (
    <button
      onClick={handleClick}
      className="w-full h-full rounded-lg font-bold shadow-lg transition-all flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #22c55e, #059669)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, #4ade80, #10b981)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, #22c55e, #059669)';
      }}
    >
      <div className="flex flex-col items-center justify-center gap-1">
        <span style={{ fontSize: `${iconSize}px` }}>🔘</span>
        <span 
          className="font-mono font-bold text-white"
          style={{ fontSize: `${fontSize}px` }}
        >
          {node.config.text || 'Button'}
        </span>
      </div>
    </button>
  );
};