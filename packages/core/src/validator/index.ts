/**
 * Semantic validation for Visual Graphs and IR
 */

import type {
  VisualGraph,
  VisualNode,
  VisualConnection,
  ValidationReport,
  ValidationIssue,
  TargetPlatform,
  ValueType,
} from '@indiforge/shared';
import { isOperationSupported } from '../ir';

/**
 * Validate a visual graph
 */
export function validateVisualGraph(
  graph: VisualGraph,
  targetPlatforms: TargetPlatform[]
): ValidationReport {
  const issues: ValidationIssue[] = [];
  
  // Check for cycles
  const cycles = detectCycles(graph);
  if (cycles.length > 0) {
    issues.push({
      severity: 'error',
      code: 'CYCLE_DETECTED',
      message: 'Graph contains cycles',
      details: { cycles },
    });
  }
  
  // Check for disconnected nodes
  const disconnected = findDisconnectedNodes(graph);
  if (disconnected.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'DISCONNECTED_NODES',
      message: 'Some nodes are not connected to any output',
      details: { nodeIds: disconnected },
    });
  }
  
  // Validate each node
  for (const node of graph.nodes) {
    const nodeIssues = validateNode(node, targetPlatforms);
    issues.push(...nodeIssues);
  }
  
  // Validate connections
  for (const conn of graph.connections) {
    const connIssues = validateConnection(conn, graph);
    issues.push(...connIssues);
  }
  
  // Check for outputs
  const outputNodes = graph.nodes.filter(n => n.category === 'outputs');
  if (outputNodes.length === 0 && graph.nodes.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'NO_OUTPUTS',
      message: 'Graph has no output nodes',
    });
  }
  
  // Build compatibility matrix
  const compatibilityMatrix = buildCompatibilityMatrix(graph, targetPlatforms);
  
  const hasErrors = issues.some(i => i.severity === 'error');
  
  return {
    valid: !hasErrors,
    issues,
    compatibilityMatrix,
  };
}

/**
 * Detect cycles in the graph using DFS
 */
function detectCycles(graph: VisualGraph): string[][] {
  const adj = new Map<string, string[]>();
  
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }
  
  for (const conn of graph.connections) {
    const sources = adj.get(conn.sourceNodeId);
    if (sources) {
      sources.push(conn.targetNodeId);
    }
  }
  
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];
  
  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recStack.add(nodeId);
    
    const neighbors = adj.get(nodeId) ?? [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path, neighbor]);
      } else if (recStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
      }
    }
    
    recStack.delete(nodeId);
  }
  
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id, [node.id]);
    }
  }
  
  return cycles;
}

/**
 * Find nodes not connected to any output
 */
function findDisconnectedNodes(graph: VisualGraph): string[] {
  const outputNodeIds = new Set(
    graph.nodes.filter(n => n.category === 'outputs').map(n => n.id)
  );
  
  // BFS from outputs backwards
  const connected = new Set<string>();
  const queue: string[] = [...outputNodeIds];
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (connected.has(nodeId)) continue;
    connected.add(nodeId);
    
    // Find nodes that connect to this node
    for (const conn of graph.connections) {
      if (conn.targetNodeId === nodeId && !connected.has(conn.sourceNodeId)) {
        queue.push(conn.sourceNodeId);
      }
    }
  }
  
  // Return nodes not in connected set (excluding outputs themselves)
  return graph.nodes
    .filter(n => !connected.has(n.id) && n.category !== 'outputs')
    .map(n => n.id);
}

/**
 * Validate a single node
 */
function validateNode(
  node: VisualNode,
  targetPlatforms: TargetPlatform[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // Check platform compatibility
  for (const platform of targetPlatforms) {
    const support = node.platformSupport[platform] ?? 'unsupported';
    if (support === 'unsupported') {
      issues.push({
        severity: 'error',
        code: 'UNSUPPORTED_NODE',
        message: `Node type "${node.type}" is not supported on ${platform}`,
        nodeId: node.id,
        details: { platform, nodeType: node.type },
      });
    } else if (support === 'approximated') {
      issues.push({
        severity: 'warning',
        code: 'APPROXIMATED_NODE',
        message: `Node type "${node.type}" may behave differently on ${platform}`,
        nodeId: node.id,
        details: { platform, nodeType: node.type },
      });
    }
  }
  
  // Validate parameters based on node type
  const paramIssues = validateNodeParams(node);
  issues.push(...paramIssues);
  
  return issues;
}

/**
 * Validate node parameters
 */
function validateNodeParams(node: VisualNode): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (node.category === 'indicators') {
    // Check period parameters
    const period = node.params.period as number | undefined;
    if (period !== undefined) {
      if (period <= 0) {
        issues.push({
          severity: 'error',
          code: 'INVALID_PERIOD',
          message: 'Period must be greater than 0',
          nodeId: node.id,
        });
      }
      if (period < 2) {
        issues.push({
          severity: 'warning',
          code: 'SHORT_PERIOD',
          message: 'Period less than 2 may produce unreliable results',
          nodeId: node.id,
        });
      }
    }
    
    // Check RSI-specific params
    if (node.type === 'rsi') {
      const rsiPeriod = node.params.period as number ?? 14;
      if (rsiPeriod < 2 || rsiPeriod > 100) {
        issues.push({
          severity: 'warning',
          code: 'RSI_PERIOD_RANGE',
          message: 'RSI period typically between 2 and 100',
          nodeId: node.id,
        });
      }
    }
  }
  
  return issues;
}

/**
 * Validate a connection between nodes
 */
function validateConnection(
  conn: VisualConnection,
  graph: VisualGraph
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  const sourceNode = graph.nodes.find(n => n.id === conn.sourceNodeId);
  const targetNode = graph.nodes.find(n => n.id === conn.targetNodeId);
  
  if (!sourceNode) {
    issues.push({
      severity: 'error',
      code: 'MISSING_SOURCE',
      message: 'Connection references non-existent source node',
      details: { sourceId: conn.sourceNodeId },
    });
    return issues;
  }
  
  if (!targetNode) {
    issues.push({
      severity: 'error',
      code: 'MISSING_TARGET',
      message: 'Connection references non-existent target node',
      details: { targetId: conn.targetNodeId },
    });
    return issues;
  }
  
  // Check type compatibility
  const compatible = areTypesCompatible(sourceNode.outputType, conn.sourceHandle);
  if (!compatible) {
    issues.push({
      severity: 'warning',
      code: 'TYPE_MISMATCH',
      message: `Output type "${sourceNode.outputType}" may not match expected input`,
      nodeId: conn.targetNodeId,
      details: { 
        sourceType: sourceNode.outputType,
        sourceHandle: conn.sourceHandle,
      },
    });
  }
  
  return issues;
}

/**
 * Check if output type is compatible with expected type
 */
function areTypesCompatible(outputType: ValueType, handle: string): boolean {
  // For now, simple check - could be enhanced
  return true;
}

/**
 * Build compatibility matrix for all platforms
 */
function buildCompatibilityMatrix(
  graph: VisualGraph,
  targetPlatforms: TargetPlatform[]
): Record<TargetPlatform, 'compatible' | 'warnings' | 'incompatible'> {
  const matrix: Record<TargetPlatform, 'compatible' | 'warnings' | 'incompatible'> = {
    pinescript_v5: 'compatible',
    mql5: 'compatible',
    mql4: 'compatible',
    ninjatrader_8: 'compatible',
  };
  
  for (const platform of targetPlatforms) {
    let hasErrors = false;
    let hasWarnings = false;
    
    for (const node of graph.nodes) {
      const support = isOperationSupported(platform, node.category, node.type);
      if (support === 'unsupported') {
        hasErrors = true;
      } else if (support === 'approximated') {
        hasWarnings = true;
      }
    }
    
    if (hasErrors) {
      matrix[platform] = 'incompatible';
    } else if (hasWarnings) {
      matrix[platform] = 'warnings';
    } else {
      matrix[platform] = 'compatible';
    }
  }
  
  return matrix;
}

export type { ValidationReport, ValidationIssue };