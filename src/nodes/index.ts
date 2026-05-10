import { registerTriggerNodes } from './TriggerNodes';
import { registerFlowNodes } from './FlowNodes';
import { registerFunctionNodes } from './FunctionNodes';

import './specialized'; // Автоматическая регистрация специализированных узлов

export function registerAllNodes() {
  registerTriggerNodes();
  registerFlowNodes();
  registerFunctionNodes();
  // Специализированные узлы регистрируются сами при импорте
}