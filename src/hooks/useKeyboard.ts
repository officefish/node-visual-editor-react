import { useEffect } from 'react';
import { useEditorStore } from '../store/editorStore';

export const useKeyboard = () => {
  const { deleteSelectedNodes, getSelectionCount } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (getSelectionCount() > 0) {
          deleteSelectedNodes();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelectedNodes, getSelectionCount]);
};