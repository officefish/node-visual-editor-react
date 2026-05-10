import React from 'react';
import { NodeRegistry } from '../core/NodeRegistry';
import { useEditorStore } from '../store/editorStore';
import { Plus } from 'lucide-react';

interface NodesPanelProps {
  onStatusUpdate: (message: string) => void;
}

export const NodesPanel: React.FC<NodesPanelProps> = ({ onStatusUpdate }) => {
  const { addNode, screenToWorld, offsetX, offsetY, zoom } = useEditorStore();

  const categories = {
    '⚡ Триггеры': ['button', 'timer', 'http'],
    '🔄 Управление потоком': ['if', 'loop', 'sequence'],
    '⚙️ Функции': ['text', 'console', 'math', 'constant', 'delay', 'variable'],
  };

  const handleAddNode = (type: string) => {
    const center = screenToWorld(window.innerWidth / 2, window.innerHeight / 2, offsetX, offsetY, zoom);
    addNode(type, center.x - 100, center.y - 45);
    onStatusUpdate(`➕ Добавлен узел: ${type}`);
  };

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 w-80 bg-gray-900 rounded-xl shadow-2xl z-50 border border-purple-500 overflow-y-auto max-h-[90vh]">
      <div className="p-4">
        <div className="text-center font-bold text-lg mb-4 border-b border-purple-500 pb-2 text-white sticky top-0 bg-gray-900">
          📦 NodeFlow - Конструктор
        </div>

        {Object.entries(categories).map(([category, types]) => (
          <div key={category} className="mb-4">
            <div className="text-xs text-gray-400 uppercase mb-2 tracking-wider">
              {category}
            </div>
            {types.map((type) => {
              const def = NodeRegistry.get(type);
              if (!def) return null;
              return (
                <button
                  key={type}
                  onClick={() => handleAddNode(type)}
                  className="w-full text-left px-3 py-2 mb-1 rounded-lg bg-gray-800 hover:bg-purple-600 transition-all flex items-center gap-2 group text-white"
                >
                  <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span>{def.title}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};