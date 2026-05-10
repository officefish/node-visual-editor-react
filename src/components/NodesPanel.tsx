import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { Plus } from 'lucide-react';
import { NodeRegistry } from '../core/NodeRegistry';
import { NodeFactory } from '../core/NodeFactory';
import type { NodeMetadata } from '../core/interfaces';

interface NodesPanelProps {
  onStatusUpdate: (message: string) => void;
}

interface CategoryNodes {
  [key: string]: Array<{
    type: string;
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    isCustom?: boolean;
  }>;
}

export const NodesPanel: React.FC<NodesPanelProps> = ({ onStatusUpdate }) => {
  const { addNode, screenToWorld, offsetX, offsetY, zoom } = useEditorStore();
  const [categoryNodes, setCategoryNodes] = useState<CategoryNodes>({});

  useEffect(() => {
    const categories: CategoryNodes = {
      '⚡ Триггеры': [],
      '🔄 Управление потоком': [],
      '⚙️ Функции': [],
      '🎵 Медиа': []
    };

    // Получаем узлы из старого NodeRegistry
    const allNodes = NodeRegistry.getAll();
    
    for (const [type, def] of allNodes.entries()) {
      let category = '⚙️ Функции';
      if (type === 'button' || type === 'timer' || type === 'http') {
        category = '⚡ Триггеры';
      } else if (type === 'if' || type === 'loop' || type === 'sequence') {
        category = '🔄 Управление потоком';
      } else if (type === 'text' || type === 'console' || type === 'math' || type === 'constant' || type === 'delay' || type === 'variable') {
        category = '⚙️ Функции';
      }
      
      categories[category].push({
        type,
        title: def.title,
        description: `Узел: ${def.title}`,
        icon: def.title.charAt(0),
        color: def.color,
        isCustom: false
      });
    }

    // Получаем кастомные узлы из NodeFactory
    const customNodes = NodeFactory.getAllMetadata();
    for (const node of customNodes) {
      let category = '🎵 Медиа';
      if (node.category === 'media') {
        category = '🎵 Медиа';
      } else if (node.category === 'flow') {
        category = '🔄 Управление потоком';
      } else if (node.category === 'triggers') {
        category = '⚡ Триггеры';
      } else if (node.category === 'functions') {
        category = '⚙️ Функции';
      }
      
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push({
        type: node.type,
        title: node.title,
        description: node.description,
        icon: node.icon || '📦',
        color: node.color,
        isCustom: true
      });
    }

    setCategoryNodes(categories);
  }, []);

  const handleAddNode = (type: string, title: string) => {
    const center = screenToWorld(window.innerWidth / 2, window.innerHeight / 2, offsetX, offsetY, zoom);
    addNode(type, center.x - 100, center.y - 45);
    onStatusUpdate(`➕ Добавлен узел: ${title}`);
  };

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 w-80 bg-gray-900 rounded-xl shadow-2xl z-50 border border-purple-500 overflow-y-auto max-h-[90vh]">
      <div className="p-4">
        <div className="text-center font-bold text-lg mb-4 border-b border-purple-500 pb-2 text-white sticky top-0 bg-gray-900">
          📦 NodeFlow - Конструктор
        </div>

        {Object.entries(categoryNodes).map(([category, nodes]) => (
          nodes.length > 0 && (
            <div key={category} className="mb-4">
              <div className="text-xs text-gray-400 uppercase mb-2 tracking-wider">
                {category}
              </div>
              {nodes.map((node) => (
                <button
                  key={node.type}
                  onClick={() => handleAddNode(node.type, node.title)}
                  className="w-full text-left px-3 py-2 mb-1 rounded-lg bg-gray-800 hover:bg-purple-600 transition-all flex items-center gap-2 group text-white"
                  title={node.description}
                >
                  <span className="text-lg">{node.icon}</span>
                  <span className="flex-1">{node.title}</span>
                  {node.isCustom && (
                    <span className="text-xs px-1 py-0.5 bg-purple-700 rounded text-purple-200">new</span>
                  )}
                  <Plus size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  );
};