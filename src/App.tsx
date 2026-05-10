import React, { useState, useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { NodesPanel } from './components/NodesPanel';
import { Toolbar } from './components/Toolbar';
import { StatusBar } from './components/StatusBar';
import { NodeExecutor } from './core/NodeExecutor';
import { registerAllNodes } from './nodes';
import { useEditorStore } from './store/editorStore';

function App() {
  const [status, setStatus] = useState('✅ Готов');
  const { nodes, links, zoom } = useEditorStore();
  const [executor] = useState(() => new NodeExecutor(setStatus, () => {}));

  useEffect(() => {
    registerAllNodes();
    
    // Добавляем демо-узлы, если их нет
    const { nodes: currentNodes, addNode, screenToWorld, offsetX, offsetY, zoom } = useEditorStore.getState();
    if (currentNodes.length === 0) {
      const center = screenToWorld(window.innerWidth / 2, window.innerHeight / 2, offsetX, offsetY, zoom);
      addNode('start', center.x - 100, center.y - 45);
      addNode('console', center.x + 100, center.y - 45);
    }
  }, []);

  const handleExecute = async () => {
    await executor.execute(nodes, links);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-base-100">
      {/* Canvas должен быть фоном */}
      <Canvas onStatusUpdate={setStatus} />
      
      {/* UI элементы поверх канваса */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          <NodesPanel onStatusUpdate={setStatus} />
          <Toolbar onStatusUpdate={setStatus} onExecute={handleExecute} />
          <StatusBar status={status} zoom={zoom} />
        </div>
      </div>
    </div>
  );
}

export default App;