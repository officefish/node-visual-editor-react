import React, { useState } from 'react';
import type { NodeType } from '../types';
import { X, Save } from 'lucide-react';

interface NodeEditorProps {
  node: NodeType;
  onUpdate: (config: Record<string, any>) => void;
  onClose: () => void;
}

export const TextNodeEditor: React.FC<NodeEditorProps> = ({ node, onUpdate, onClose }) => {
  const [text, setText] = useState(node.config?.text || '');

  const handleSave = () => {
    onUpdate({ text });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-[500px] max-w-[90vw]">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Редактирование: {node.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Текст:
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition resize-none"
            rows={6}
            placeholder="Введите текст..."
          />
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition flex items-center gap-2"
          >
            <Save size={16} />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConstantNodeEditor: React.FC<NodeEditorProps> = ({ node, onUpdate, onClose }) => {
  const [value, setValue] = useState(node.config?.value ?? 0);
  const [type, setType] = useState(node.config?.type || 'number');

  const handleSave = () => {
    let parsedValue = value;
    if (type === 'number') {
      parsedValue = parseFloat(String(value)) || 0;
    } else if (type === 'boolean') {
      parsedValue = value === 'true';
    }
    onUpdate({ value: parsedValue, type });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-[500px] max-w-[90vw]">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Редактирование: {node.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Тип данных:
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition"
            >
              <option value="number">Число</option>
              <option value="string">Строка</option>
              <option value="boolean">Булево</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Значение:
            </label>
            {type === 'boolean' ? (
              <select
                value={String(value)}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <input
                type={type === 'number' ? 'number' : 'text'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition"
              />
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition flex items-center gap-2"
          >
            <Save size={16} />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export const MathNodeEditor: React.FC<NodeEditorProps> = ({ node, onUpdate, onClose }) => {
  const [operation, setOperation] = useState(node.config?.operation || 'add');

  const operations: Record<string, string> = {
    add: 'Сложение (+)',
    subtract: 'Вычитание (-)',
    multiply: 'Умножение (×)',
    divide: 'Деление (÷)',
  };

  const handleSave = () => {
    onUpdate({ operation });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-[500px] max-w-[90vw]">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Редактирование: {node.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Операция:
          </label>
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition"
          >
            {Object.entries(operations).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition flex items-center gap-2"
          >
            <Save size={16} />
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};