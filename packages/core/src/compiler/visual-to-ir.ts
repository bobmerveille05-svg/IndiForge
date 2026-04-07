/**
 * Visual Graph to IR Converter
 * Transforms the visual node graph into canonical IR
 */

import type {
  VisualGraph,
  VisualNode,
  VisualConnection,
  IrGraph,
  IrNode,
  IrValue,
  IrInput,
  IrOutput,
  IrAlert,
  TargetPlatform,
  DisplayType,
} from '@indiforge/shared';
import { IR_VERSION, OPERATION_REGISTRY } from '../ir';

interface ConversionContext {
  graph: VisualGraph;
  nodeIdToIrNodeId: Map<string, string>;
  nextNodeIndex: number;
}

/**
 * Convert a Visual Graph to Canonical IR
 */
export function convertVisualToIr(
  visualGraph: VisualGraph,
  options: {
    name: string;
    description?: string;
    displayType: DisplayType;
    platforms: TargetPlatform[];
  }
): IrGraph {
  const context: ConversionContext = {
    graph: visualGraph,
    nodeIdToIrNodeId: new Map(),
    nextNodeIndex: 1,
  };

  const irNodes: IrNode[] = [];
  const irInputs: IrInput[] = [];
  const outputs: IrOutput[] = [];
  const alerts: IrAlert[] = [];

  // Process nodes in topological order
  const sortedNodes = topologicalSort(visualGraph);

  for (const visualNode of sortedNodes) {
    const irNode = convertNode(visualNode, context);
    if (irNode) {
      irNodes.push(irNode);
    }
  }

  // Process connections to create outputs
  for (const conn of visualGraph.connections) {
    const targetNode = visualGraph.nodes.find(n => n.id === conn.targetNodeId);
    if (targetNode?.category === 'outputs') {
      const sourceNodeId = context.nodeIdToIrNodeId.get(conn.sourceNodeId);
      if (sourceNodeId) {
        outputs.push({
          name: targetNode.params.name as string || `output_${outputs.length + 1}`,
          plotType: (targetNode.params.plotType as string) as IrOutput['plotType'] || 'line',
          style: targetNode.params.style as Record<string, unknown> || {},
        });
      }
    }
  }

  // Calculate constraints
  let lookbackRequired = 0;
  let warmupBars = 0;

  for (const node of irNodes) {
    const opInfo = getOperationInfo(node.type, node.operation);
    if (opInfo?.lookback) {
      lookbackRequired = Math.max(lookbackRequired, opInfo.lookback);
      warmupBars = Math.max(warmupBars, opInfo.lookback);
    }
  }

  return {
    version: IR_VERSION,
    meta: {
      name: options.name,
      description: options.description || '',
      displayType: options.displayType,
      platforms: options.platforms,
    },
    inputs: irInputs,
    nodes: irNodes,
    outputs,
    alerts,
    constraints: {
      lookbackRequired,
      warmupBars,
      unsupportedPlatforms: [],
      approximations: {},
    },
  };
}

/**
 * Convert a single visual node to IR node
 */
function convertNode(
  visualNode: VisualNode,
  context: ConversionContext
): IrNode | null {
  const irNodeId = `${context.nextNodeIndex++}`;
  context.nodeIdToIrNodeId.set(visualNode.id, irNodeId);

  // Map visual node category/type to IR node type
  const irNodeType = mapNodeType(visualNode.category);
  const operation = visualNode.operation || visualNode.type;

  // Convert inputs (connections)
  const connections = context.graph.connections.filter(
    c => c.targetNodeId === visualNode.id
  );

  const inputs: IrValue[] = connections.map(conn => {
    const sourceIrNodeId = context.nodeIdToIrNodeId.get(conn.sourceNodeId);
    if (sourceIrNodeId) {
      return { type: 'node' as const, nodeId: sourceIrNodeId };
    }
    // Fallback: try to get from original visual node
    const sourceVisual = context.graph.nodes.find(n => n.id === conn.sourceNodeId);
    if (sourceVisual?.category === 'inputs') {
      return { type: 'constant' as const, value: sourceVisual.params.default };
    }
    return { type: 'constant' as const, value: 0 };
  });

  // Add constant inputs for parameters
  if (visualNode.params.period !== undefined) {
    inputs.push({ type: 'constant', value: visualNode.params.period as number });
  }

  return {
    id: irNodeId,
    type: irNodeType,
    operation,
    inputs,
    params: visualNode.params,
    outputType: visualNode.outputType,
  };
}

/**
 * Map visual node category to IR node type
 */
function mapNodeType(category: string): IrNode['type'] {
  const mapping: Record<string, IrNode['type']> = {
    data: 'data',
    inputs: 'input',
    indicators: 'indicator',
    math: 'math',
    logic: 'logic',
    comparison: 'comparison',
    conditions: 'condition',
    outputs: 'output',
    alerts: 'alert',
  };
  return mapping[category] || 'math';
}

/**
 * Topologically sort nodes for proper IR generation
 */
function topologicalSort(graph: VisualGraph): VisualNode[] {
  const visited = new Set<string>();
  const result: VisualNode[] = [];

  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // Visit dependencies first
    const incoming = graph.connections.filter(c => c.targetNodeId === nodeId);
    for (const conn of incoming) {
      visit(conn.sourceNodeId);
    }

    const node = graph.nodes.find(n => n.id === nodeId);
    if (node) result.push(node);
  };

  for (const node of graph.nodes) {
    visit(node.id);
  }

  return result;
}

/**
 * Get operation info from registry
 */
function getOperationInfo(
  type: string,
  operation: string
): { outputType: string; lookback: number; params?: Record<string, unknown> } | undefined {
  const category = type as keyof typeof OPERATION_REGISTRY;
  const ops = OPERATION_REGISTRY[category];
  if (!ops) return undefined;
  return (ops as Record<string, unknown>)[operation] as never;
}

export { convertVisualToIr };