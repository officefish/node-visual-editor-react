import React from 'react';
import { useEditorStore } from '../store/editorStore';

interface StatusBarProps {
  status: string;
  zoom: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ status, zoom }) => {
  const { getSelectionCount } = useEditorStore();
  const selectionCount = getSelectionCount();

  return (
    <>
      {/* Информационная панель снизу слева */}
      <div className="fixed bottom-4 left-4 bg-black bg-opacity-80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs font-mono z-50 text-gray-300">
        <div>🖱️ ЛКМ: выделение | 🔲 ЛКМ + drag: рамка</div>
        <div>🖱️ ПКМ + drag: панорамирование | 🔍 Колесико: масштаб</div>
        <div>🔗 Клик по порту → клик по другому порту: соединение</div>
        <div>🎯 Ctrl+клик по линии: удалить соединение | ⌫ Delete: удалить выделенные</div>
      </div>

      {/* Информация о масштабе */}
      <div className="fixed top-4 left-4 bg-black bg-opacity-80 backdrop-blur-sm rounded-lg px-3 py-1 text-sm font-mono z-50 text-white">
        🔍 Zoom: {Math.round(zoom * 100)}%
      </div>

      {/* Счётчик выделенных узлов */}
      <div className="fixed top-4 left-32 bg-black bg-opacity-80 backdrop-blur-sm rounded-lg px-3 py-1 text-sm font-mono z-50 text-yellow-400">
        📌 Выделено: {selectionCount} {selectionCount === 1 ? 'узел' : selectionCount > 0 && selectionCount < 5 ? 'узла' : 'узлов'}
      </div>

      {/* Статус выполнения */}
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs font-mono z-50">
        <span className={status.includes('✅') ? 'text-green-400' : status.includes('❌') ? 'text-red-400' : 'text-blue-400'}>
          {status}
        </span>
      </div>
    </>
  );
};