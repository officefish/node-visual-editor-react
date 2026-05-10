import React, { useState, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { NodesPanel } from './components/NodesPanel';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { NodeExecutor } from './core/NodeExecutor';
import { registerAllNodes } from './nodes';
import { useEditorStore } from './store/editorStore';
import { NodeRegistry } from './core/NodeRegistry';

function App() {
  const [status, setStatus] = useState('✅ Готов');
  const { nodes, links, zoom, editingNodeId, updateNodeConfig, closeEditor } = useEditorStore();
  const [executor] = useState(() => new NodeExecutor(setStatus, () => {}));

  useEffect(() => {
    registerAllNodes();
    
    // Add demo nodes if empty
    const { nodes: currentNodes, addNode, screenToWorld, offsetX, offsetY, zoom: currentZoom } = useEditorStore.getState();
    if (currentNodes.length === 0) {
      const center = screenToWorld(window.innerWidth / 2, window.innerHeight / 2, offsetX, offsetY, currentZoom);
      addNode('start', center.x - 100, center.y - 45);
      addNode('text', center.x + 100, center.y - 45);
      addNode('console', center.x + 300, center.y - 45);
    }
  }, []);

  const handleExecute = async () => {
    await executor.execute(nodes, links);
  };

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
      <NodesPanel onStatusUpdate={setStatus} />
      <Toolbar onStatusUpdate={setStatus} onExecute={handleExecute} />
      <StatusBar status={status} zoom={zoom} />
      
      {/* Node Editor Modal */}
      {editingNode && EditorComponent && (
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