import { registerTriggerNodes } from './TriggerNodes';
import { registerFlowNodes } from './FlowNodes';
import { registerFunctionNodes } from './FunctionNodes';

export function registerAllNodes() {
  registerTriggerNodes();
  registerFlowNodes();
  registerFunctionNodes();
}