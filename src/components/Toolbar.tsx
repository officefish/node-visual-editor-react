import React from 'react';
import { useEditorStore } from '../store/editorStore';
import { Trash2, Save, FolderOpen, Play, Download, Eraser } from 'lucide-react';

interface ToolbarProps {
  onStatusUpdate: (message: string) => void;
  onExecute: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onStatusUpdate, onExecute }) => {
  const { deleteSelectedNodes, getData, loadData, clearSelection, getSelectionCount, nodes, links, nextNodeId } = useEditorStore();

  const handleClear = () => {
    if (confirm('Очистить всё?')) {
      useEditorStore.setState({ nodes: [], links: [], nextNodeId: 1 });
      clearSelection();
      onStatusUpdate('🗑️ Всё очищено');
    }
  };

  const handleSave = () => {
    const data = getData();
    localStorage.setItem('nodeflow_save', JSON.stringify(data));
    onStatusUpdate('💾 Схема сохранена');
  };

  const handleLoad = () => {
    const json = localStorage.getItem('nodeflow_save');
    if (json) {
      const data = JSON.parse(json);
      loadData(data);
      onStatusUpdate('📂 Схема загружена');
    } else {
      onStatusUpdate('❌ Нет сохранённой схемы');
    }
  };

  const handleExport = () => {
    const data = getData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nodeflow_${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onStatusUpdate('📥 Экспортировано в JSON');
  };

  const handleDeleteSelected = () => {
    const count = getSelectionCount();
    if (count > 0) {
      deleteSelectedNodes();
      onStatusUpdate(`🗑️ Удалено ${count} узлов`);
    } else {
      onStatusUpdate('❌ Нет выделенных узлов');
    }
  };

  return (
    <div className="fixed top-4 right-4 flex gap-2 z-50">
      <button 
        onClick={handleClear} 
        className="btn btn-error btn-sm gap-2"
        title="Очистить всё"
      >
        <Eraser size={16} />
        Очистить
      </button>
      <button 
        onClick={handleSave} 
        className="btn btn-success btn-sm gap-2"
        title="Сохранить в localStorage"
      >
        <Save size={16} />
        Сохранить
      </button>
      <button 
        onClick={handleLoad} 
        className="btn btn-info btn-sm gap-2"
        title="Загрузить из localStorage"
      >
        <FolderOpen size={16} />
        Загрузить
      </button>
      <button 
        onClick={handleExport} 
        className="btn btn-secondary btn-sm gap-2"
        title="Экспортировать в JSON файл"
      >
        <Download size={16} />
        Экспорт
      </button>
      <button 
        onClick={onExecute} 
        className="btn btn-warning btn-sm gap-2"
        title="Выполнить программу"
      >
        <Play size={16} />
        Выполнить
      </button>
      <button 
        onClick={handleDeleteSelected} 
        className="btn btn-error btn-sm gap-2"
        title="Удалить выделенные узлы (Delete)"
      >
        <Trash2 size={16} />
        Удалить выбранные
      </button>
    </div>
  );
};