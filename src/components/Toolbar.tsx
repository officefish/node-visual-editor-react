import React from 'react';
import { useEditorStore } from '../store/editorStore';
import { Trash2, Save, FolderOpen, Play, Download, Eraser, Edit } from 'lucide-react';

interface ToolbarProps {
  onStatusUpdate: (message: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onStatusUpdate }) => {
  const { deleteSelectedNodes, getData, loadData, clearSelection, getSelectionCount, mode, setMode } = useEditorStore();

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

  const handleModeToggle = () => {
    if (mode === 'edit') {
      setMode('run');
      onStatusUpdate('▶️ Режим выполнения активирован. Нажмите на кнопку-триггер для запуска сценария');
    } else {
      setMode('edit');
      onStatusUpdate('✏️ Режим редактирования активирован');
    }
  };

  return (
    <div className="fixed top-4 right-4 flex gap-2 z-50">
      {mode === 'edit' ? (
        <>
          <button 
            onClick={handleClear} 
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg"
            title="Очистить всё"
          >
            <Eraser size={16} />
            Очистить
          </button>
          <button 
            onClick={handleSave} 
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg"
            title="Сохранить в localStorage"
          >
            <Save size={16} />
            Сохранить
          </button>
          <button 
            onClick={handleLoad} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg"
            title="Загрузить из localStorage"
          >
            <FolderOpen size={16} />
            Загрузить
          </button>
          <button 
            onClick={handleExport} 
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg"
            title="Экспортировать в JSON файл"
          >
            <Download size={16} />
            Экспорт
          </button>
          <button 
            onClick={handleDeleteSelected} 
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg"
            title="Удалить выделенные узлы (Delete)"
          >
            <Trash2 size={16} />
            Удалить
          </button>
        </>
      ) : null}
      
      <button 
        onClick={handleModeToggle}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-lg ${
          mode === 'edit' 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-orange-600 hover:bg-orange-700'
        }`}
        title={mode === 'edit' ? 'Перейти в режим выполнения' : 'Вернуться в режим редактирования'}
      >
        {mode === 'edit' ? (
          <>
            <Play size={16} />
            Выполнить
          </>
        ) : (
          <>
            <Edit size={16} />
            Редактировать
          </>
        )}
      </button>
    </div>
  );
};