import React from 'react';
import type { NodeType } from '../types';
import { useEditorStore } from '../store/editorStore';

// Компонент для отображения кнопки на канвасе
export const ButtonNodeRenderer: React.FC<{ node: NodeType; isRunning: boolean }> = ({ node, isRunning }) => {
  const { executeButtonTrigger, mode } = useEditorStore();
  
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mode === 'run') {
      console.log(`[Button] Запуск сценария от кнопки "${node.config.text || node.title}"`);
      await executeButtonTrigger(node.id);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className={`
        w-full h-full rounded-lg font-bold shadow-lg transition-all flex items-center justify-center
        ${mode === 'run' 
          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 cursor-pointer' 
          : 'bg-gray-700 cursor-default border-2 border-dashed border-gray-500'
        }
      `}
      disabled={mode !== 'run'}
      style={{
        transform: `scale(1)`,
        transformOrigin: 'top left',
      }}
    >
      <div className="flex flex-col items-center justify-center gap-1">
        <span className="text-3xl">{mode === 'run' ? '🔘' : '⚙️'}</span>
        <span className="text-sm font-mono font-bold">{node.config.text || 'Button'}</span>
      </div>
    </button>
  );
};