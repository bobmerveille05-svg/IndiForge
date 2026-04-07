/**
 * Execution Engine for Preview
 * Calculates indicator values from IR and OHLCV data
 * This is the "source of truth" for preview fidelity
 */

import type { IrGraph, IrNode, IrValue } from '@indiforge/shared';

/**
 * OHLCV data structure
 */
export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Execution result with computed values per bar
 */
export interface ExecutionResult {
  // Each output maps to specific calculated values
  plots: Record<string, number[]>;
  // Intermediate values for debugging
  indicators: Record<string, number[]>;
  errors: string[];
}

/**
 * Execute an IR graph against OHLCV data
 */
export function executeIr(ir: IrGraph, ohlcvData: OHLCV[]): ExecutionResult {
  if (!ohlcvData || ohlcvData.length === 0) {
    return { indicators: {}, plots: {}, errors: ['No OHLCV data provided'] };
  }

  const result: ExecutionResult = {
    indicators: {},
    plots: {},
    errors: [],
  };

  // Create a map of node IDs to their computed values
  // Also map by "type.operation" for dependency resolution
  const nodeValues: Record<string, number[]> = {};

  // Process nodes in topological order
  const sortedNodes = sortNodesByDependencies(ir.nodes);

  // Step 1: Compute all node values
  for (const node of sortedNodes) {
    try {
      const values = computeNode(node, nodeValues, ohlcvData);
      nodeValues[node.id] = values;
      
      // Store by operation for easier access
      const opKey = `${node.type}.${node.operation}`;
      nodeValues[opKey] = values;
    } catch (e) {
      result.errors.push(`Error computing ${node.type}.${node.operation}: ${e}`);
      nodeValues[node.id] = new Array(ohlcvData.length).fill(0);
    }
  }

  // Step 2: Map outputs to their source nodes explicitly
  // Each output in the IR should reference a specific node that produces it
  for (const output of ir.outputs) {
    // Find the node that should produce this output
    // In a proper IR, outputs would have a sourceNodeId
    // For now, we use heuristics based on output name
    const sourceKey = findOutputSource(output.name, sortedNodes);
    
    if (sourceKey && nodeValues[sourceKey]) {
      result.plots[output.name] = nodeValues[sourceKey];
    } else {
      // Fallback: use last node if no explicit mapping
      const lastNode = sortedNodes[sortedNodes.length - 1];
      if (lastNode) {
        result.plots[output.name] = nodeValues[lastNode.id] || new Array(ohlcvData.length).fill(0);
      }
    }
  }

  // If no explicit outputs defined, create a default one from the last indicator
  if (Object.keys(result.plots).length === 0 && sortedNodes.length > 0) {
    const lastNode = sortedNodes[sortedNodes.length - 1];
    const lastKey = `${lastNode.type}.${lastNode.operation}`;
    result.plots['main'] = nodeValues[lastKey] || nodeValues[lastNode.id];
  }

  return result;
}

/**
 * Find which node produces a given output by name
 */
function findOutputSource(outputName: string, nodes: IrNode[]): string | null {
  // Simple heuristic: look for node with matching operation name
  const name = outputName.toLowerCase();
  
  for (const node of nodes) {
    if (node.operation.toLowerCase().includes(name)) {
      return node.id;
    }
  }
  
  // Default: return last node
  return nodes.length > 0 ? nodes[nodes.length - 1].id : null;
}

/**
 * Sort nodes by dependencies (simple topological sort)
 */
function sortNodesByDependencies(nodes: IrNode[]): IrNode[] {
  const sorted: IrNode[] = [];
  const visited = new Set<string>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const visit = (nodeId: string) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    // Visit all input dependencies first
    for (const input of node.inputs) {
      if (input.type === 'node') {
        visit(input.nodeId);
      }
    }

    sorted.push(node);
  };

  for (const node of nodes) {
    visit(node.id);
  }

  return sorted;
}

/**
 * Compute values for a single node
 */
function computeNode(
  node: IrNode,
  nodeValues: Record<string, number[]>,
  ohlcvData: OHLCV[]
): number[] {
  const length = ohlcvData.length;

  switch (node.type) {
    case 'data':
      return computeData(node.operation, ohlcvData);

    case 'indicator':
      return computeIndicator(node, nodeValues, ohlcvData);

    case 'math':
      return computeMath(node, nodeValues);

    case 'comparison':
    case 'logic':
      return computeComparison(node, nodeValues);

    case 'condition':
      return computeCondition(node, nodeValues);

    default:
      return new Array(length).fill(0);
  }
}

/**
 * Compute data source (OHLCV)
 */
function computeData(operation: string, ohlcvData: OHLCV[]): number[] {
  return ohlcvData.map(d => {
    switch (operation) {
      case 'ohlcv.open':
      case 'open':
        return d.open;
      case 'ohlcv.high':
      case 'high':
        return d.high;
      case 'ohlcv.low':
      case 'low':
        return d.low;
      case 'ohlcv.close':
      case 'close':
        return d.close;
      case 'ohlcv.volume':
      case 'volume':
        return d.volume;
      case 'ohlcv.hl2':
        return (d.high + d.low) / 2;
      case 'ohlcv.hlc3':
        return (d.high + d.low + d.close) / 3;
      case 'ohlcv.ohlc4':
        return (d.open + d.high + d.low + d.close) / 4;
      default:
        return d.close;
    }
  });
}

/**
 * Compute indicator (SMA, EMA, RSI, etc.)
 */
function computeIndicator(
  node: IrNode,
  nodeValues: Record<string, number[]>,
  ohlcvData: OHLCV[]
): number[] {
  const params = node.params as Record<string, unknown>;
  const period = (params.period as number) || 20;

  // Get input data
  let sourceData: number[];
  if (node.inputs[0]?.type === 'node') {
    const inputId = node.inputs[0].nodeId;
    sourceData = nodeValues[inputId] || nodeValues['data.ohlcv.close'];
  } else {
    sourceData = nodeValues['data.ohlcv.close'] || ohlcvData.map(d => d.close);
  }

  // Fallback if still empty
  if (!sourceData || sourceData.length === 0) {
    sourceData = ohlcvData.map(d => d.close);
  }

  switch (node.operation) {
    case 'sma':
      return calculateSMA(sourceData, period);
    case 'ema':
      return calculateEMA(sourceData, period);
    case 'rsi':
      return calculateRSI(sourceData, period);
    case 'atr':
      return calculateATR(ohlcvData, period);
    case 'macd':
      return calculateMACD(sourceData);
    case 'bollinger':
      return calculateBollinger(sourceData, period, (params.stdDev as number) || 2);
    case 'highest':
      return calculateHighest(sourceData, period);
    case 'lowest':
      return calculateLowest(sourceData, period);
    default:
      return sourceData;
  }
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN); // Not enough data yet
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  let ema = data[0];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema = data[0];
    } else {
      ema = (data[i] - ema) * multiplier + ema;
    }
    result.push(i < period - 1 ? NaN : ema);
  }
  return result;
}

/**
 * Calculate Relative Strength Index
 */
function calculateRSI(data: number[], period: number): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // Calculate RSI
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < gains.length; i++) {
    if (i < period) {
      result.push(NaN);
      avgGain += gains[i];
      avgLoss += losses[i];
      if (i === period - 1) {
        avgGain /= period;
        avgLoss /= period;
      }
    } else {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
  }

  // Prepend NaN for first element
  result.unshift(NaN);

  return result;
}

/**
 * Calculate Average True Range
 */
function calculateATR(ohlcvData: OHLCV[], period: number): number[] {
  const result: number[] = [];
  const tr: number[] = [];

  for (let i = 0; i < ohlcvData.length; i++) {
    if (i === 0) {
      tr.push(ohlcvData[i].high - ohlcvData[i].low);
    } else {
      const h = ohlcvData[i].high;
      const l = ohlcvData[i].low;
      const pc = ohlcvData[i - 1].close;
      const trueRange = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
      tr.push(trueRange);
    }
  }

  return calculateSMA(tr, period);
}

/**
 * Calculate MACD (returns histogram for simplicity)
 */
function calculateMACD(data: number[]): number[] {
  const fast = calculateEMA(data, 12);
  const slow = calculateEMA(data, 26);
  const signal = calculateEMA(
    fast.map((f, i) => f - slow[i]),
    9
  );

  return fast.map((f, i) => f - slow[i] - (signal[i] || 0));
}

/**
 * Calculate Bollinger Bands (returns middle band)
 */
function calculateBollinger(data: number[], period: number, stdDevMultiplier: number): number[] {
  const middle = calculateSMA(data, period);
  const result: number[] = [];

  for (let i = period - 1; i < data.length; i++) {
    // Calculate standard deviation
    const slice = data.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    result.push(middle[i] + stdDevMultiplier * stdDev);
  }

  // Fill beginning with NaN
  for (let i = 0; i < period - 1; i++) {
    result.unshift(NaN);
  }

  return result;
}

/**
 * Calculate Highest over period
 */
function calculateHighest(data: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let max = data[i - period + 1];
      for (let j = 1; j < period; j++) {
        max = Math.max(max, data[i - j]);
      }
      result.push(max);
    }
  }

  return result;
}

/**
 * Calculate Lowest over period
 */
function calculateLowest(data: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      let min = data[i - period + 1];
      for (let j = 1; j < period; j++) {
        min = Math.min(min, data[i - j]);
      }
      result.push(min);
    }
  }

  return result;
}

/**
 * Compute math operations
 */
function computeMath(node: IrNode, nodeValues: Record<string, number[]>): number[] {
  if (node.inputs.length < 2) return [];

  const left = resolveInput(node.inputs[0], nodeValues);
  const right = resolveInput(node.inputs[1], nodeValues);

  if (!left || !right) return [];

  switch (node.operation) {
    case 'add':
      return left.map((v, i) => v + (right[i] || 0));
    case 'sub':
      return left.map((v, i) => v - (right[i] || 0));
    case 'mult':
      return left.map((v, i) => v * (right[i] || 0));
    case 'div':
      return left.map((v, i) => (right[i] !== 0 ? v / (right[i] || 1) : 0));
    case 'abs':
      return left.map(Math.abs);
    case 'min':
      return left.map((v, i) => Math.min(v, right[i] || 0));
    case 'max':
      return left.map((v, i) => Math.max(v, right[i] || 0));
    default:
      return left;
  }
}

/**
 * Compute comparison/logic operations
 */
function computeComparison(node: IrNode, nodeValues: Record<string, number[]>): number[] {
  const left = resolveInput(node.inputs[0], nodeValues);
  const right = resolveInput(node.inputs[1], nodeValues);

  if (!left || !right) return [];

  switch (node.operation) {
    case 'gt':
      return left.map((v, i) => v > (right[i] || 0) ? 1 : 0);
    case 'lt':
      return left.map((v, i) => v < (right[i] || 0) ? 1 : 0);
    case 'gte':
      return left.map((v, i) => v >= (right[i] || 0) ? 1 : 0);
    case 'lte':
      return left.map((v, i) => v <= (right[i] || 0) ? 1 : 0);
    case 'eq':
      return left.map((v, i) => Math.abs(v - (right[i] || 0)) < 0.0001 ? 1 : 0);
    case 'and':
      return left.map((v, i) => (v !== 0 && (right[i] !== 0) ? 1 : 0));
    case 'or':
      return left.map((v, i) => (v !== 0 || (right[i] !== 0) ? 1 : 0));
    case 'crossover':
      return left.map((v, i) => {
        if (i === 0) return 0;
        const prevLeft = left[i - 1];
        const prevRight = right[i - 1];
        return prevLeft <= prevRight && v > (right[i] || 0) ? 1 : 0;
      });
    case 'crossunder':
      return left.map((v, i) => {
        if (i === 0) return 0;
        const prevLeft = left[i - 1];
        const prevRight = right[i - 1];
        return prevLeft >= prevRight && v < (right[i] || 0) ? 1 : 0;
      });
    default:
      return left.map(v => v !== 0 ? 1 : 0);
  }
}

/**
 * Compute condition (if/then/else)
 */
function computeCondition(node: IrNode, nodeValues: Record<string, number[]>): number[] {
  if (node.inputs.length < 3) return [];

  const condition = resolveInput(node.inputs[0], nodeValues);
  const trueValue = resolveInput(node.inputs[1], nodeValues);
  const falseValue = resolveInput(node.inputs[2], nodeValues);

  if (!condition || !trueValue || !falseValue) return [];

  return condition.map((c, i) => c !== 0 ? trueValue[i] : falseValue[i]);
}

/**
 * Resolve input to array of values
 * Handles both node references and constants
 */
function resolveInput(input: IrValue, nodeValues: Record<string, number[]>): number[] | null {
  if (input.type === 'node') {
    return nodeValues[input.nodeId] || null;
  }
  if (input.type === 'constant') {
    // Create an array of the constant value repeated for each bar
    const val = input.value;
    if (typeof val === 'number') {
      // For numeric constants, we need the length - we'll get it from nodeValues
      // Find any existing array to get length
      const firstArray = Object.values(nodeValues)[0];
      const length = firstArray?.length || 100;
      return new Array(length).fill(val);
    }
    if (typeof val === 'boolean') {
      const firstArray = Object.values(nodeValues)[0];
      const length = firstArray?.length || 100;
      return new Array(length).fill(val ? 1 : 0);
    }
    return null;
  }
  return null;
}

export { executeIr, OHLCV, ExecutionResult };