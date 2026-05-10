import React, { useState, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { NodesPanel } from './components/NodesPanel';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { NodeExecutor } from './core/NodeExecutor';
import { registerAllNodes } from './nodes';
import { useEditorStore, setGlobalExecutor } from './store/editorStore';
import { NodeRegistry } from './core/NodeRegistry';

function App() {
  const [status, setStatus] = useState('✅ Готов');
  const { nodes, links, zoom, editingNodeId, updateNodeConfig, closeEditor, mode } = useEditorStore();
  
  // Создаем executor и сохраняем его глобально для доступа из store
  useState(() => {
    const exec = new NodeExecutor(setStatus, () => {});
    setGlobalExecutor(exec);
  });

  useEffect(() => {
    registerAllNodes();
    
    // Add demo nodes if empty
    const { nodes: currentNodes, addNode, screenToWorld, offsetX, offsetY, zoom: currentZoom, addLink } = useEditorStore.getState();
    if (currentNodes.length === 0) {
      const center = screenToWorld(window.innerWidth / 2, window.innerHeight / 2, offsetX, offsetY, currentZoom);
      
      // Добавляем кнопку-триггер
      addNode('button', center.x - 150, center.y - 45);
      // Добавляем текстовый узел
      addNode('text', center.x + 50, center.y - 45);
      // Добавляем консоль
      addNode('console', center.x + 250, center.y - 45);
      
      // Настраиваем текст для текстового узла
      setTimeout(() => {
        const { nodes: updatedNodes, updateNodeConfig: updateConfig } = useEditorStore.getState();
        const textNode = updatedNodes.find(n => n.type === 'text');
        if (textNode) {
          updateConfig(textNode.id, { text: 'Привет из NodeFlow!' });
        }
        
        const buttonNode = updatedNodes.find(n => n.type === 'button');
        const updatedTextNode = updatedNodes.find(n => n.type === 'text');
        const consoleNode = updatedNodes.find(n => n.type === 'console');
        
        if (buttonNode && updatedTextNode) {
          addLink(buttonNode.id, 0, updatedTextNode.id, 0);
        }
        if (updatedTextNode && consoleNode) {
          addLink(updatedTextNode.id, 1, consoleNode.id, 1);
        }
      }, 100);
    }
  }, []);

  // Find editing node and its editor component
  const editingNode = nodes.find(n => n.id === editingNodeId);
  const EditorComponent = editingNode ? NodeRegistry.get(editingNode.type)?.component : null;

  const handleNodeUpdate = (config: Record<string, any>) => {
    if (editingNodeId !== null) {
      updateNodeConfig(editingNodeId, config);
    }
  };

  return (
    <div className="fixed inset-0 bg-base-100">
      <Canvas onStatusUpdate={setStatus} />
      {mode === 'edit' && <NodesPanel onStatusUpdate={setStatus} />}
      <Toolbar onStatusUpdate={setStatus} />
      <StatusBar status={status} zoom={zoom} />
      
      {/* Node Editor Modal - только для текстовых/математических узлов */}
      {mode === 'edit' && editingNode && EditorComponent && editingNode.type !== 'button' && (
        <EditorComponent
          node={editingNode}
          onUpdate={handleNodeUpdate}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}

export default App;