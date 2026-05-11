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
  
  const { nodes: currentNodes, addNode, screenToWorld, offsetX, offsetY, zoom: currentZoom, addLink, updateNodeGetter } = useEditorStore.getState();
  if (currentNodes.length === 0) {
    const center = screenToWorld(window.innerWidth / 2, window.innerHeight / 2, offsetX, offsetY, currentZoom);
    
    // Добавляем кнопку-триггер
    addNode('button', center.x - 150, center.y - 45);
    // Добавляем текстовый узел
    addNode('text', center.x + 50, center.y - 45);
    // Добавляем консоль
    addNode('console', center.x + 250, center.y - 45);
    
    // Настраиваем соединения после добавления узлов
    setTimeout(() => {
      const { nodes: updatedNodes, addLink: addNewLink, updateNodeGetter: updateGetter } = useEditorStore.getState();
      const buttonNode = updatedNodes.find(n => n.type === 'button');
      const textNode = updatedNodes.find(n => n.type === 'text');
      const consoleNode = updatedNodes.find(n => n.type === 'console');
      
      if (textNode) {
        // Включаем Getter режим для текстового узла
        updateGetter(textNode.id, true);
        console.log('Text node set as Getter');
      }
      
      if (buttonNode && consoleNode) {
        // Соединяем Button -> Console по потоку выполнения (порт 0 у обоих - flow)
        addNewLink(buttonNode.id, 0, consoleNode.id, 0);
        console.log('Link created: Button -> Console (flow)');
      }
      
      if (textNode && consoleNode) {
        // Text узел: порт 1 - result (output), Console: порт 1 - value (input)
        addNewLink(textNode.id, 1, consoleNode.id, 1);
        console.log('Link created: Text -> Console (data)');
      }
      
      // Выведем информацию о портах для отладки
      setTimeout(() => {
        const finalState = useEditorStore.getState();
        console.log('Final nodes:', finalState.nodes.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          inputs: n.inputs.map(p => p.name),
          outputs: n.outputs.map(p => p.name),
          isGetter: n.isGetter
        })));
        console.log('Final links:', finalState.links);
      }, 200);
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