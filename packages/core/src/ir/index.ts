/**
 * Canonical Intermediate Representation (IR) for IndiForge
 * This is the source of truth between preview and code generation
 */

import type { 
  IrGraph, 
  IrNode, 
  IrValue, 
  IrInput, 
  IrOutput, 
  IrAlert,
  IrConstraints,
  ValueType,
  TargetPlatform,
  DisplayType
} from '@indiforge/shared';

/**
 * IR Version - bump this when IR schema changes
 */
export const IR_VERSION = '1.0.0';

/**
 * Node operation registry
 * Defines all supported operations and their properties
 */
export const OPERATION_REGISTRY = {
  // Data operations
  data: {
    'ohlcv.open': { outputType: 'series<float>', lookback: 0 },
    'ohlcv.high': { outputType: 'series<float>', lookback: 0 },
    'ohlcv.low': { outputType: 'series<float>', lookback: 0 },
    'ohlcv.close': { outputType: 'series<float>', lookback: 0 },
    'ohlcv.volume': { outputType: 'series<float>', lookback: 0 },
    'ohlcv.hl2': { outputType: 'series<float>', lookback: 0 },
    'ohlcv.hlc3': { outputType: 'series<float>', lookback: 0 },
    'ohlcv.ohlc4': { outputType: 'series<float>', lookback: 0 },
  },
  
  // Indicator operations
  indicator: {
    'sma': { outputType: 'series<float>', lookback: 0, params: { period: 20 } },
    'ema': { outputType: 'series<float>', lookback: 0, params: { period: 9 } },
    'rsi': { outputType: 'series<float>', lookback: 14, params: { period: 14 } },
    'atr': { outputType: 'series<float>', lookback: 14, params: { period: 14 } },
    'macd': { 
      outputType: 'series<float>', 
      lookback: 26, 
      params: { fast: 12, slow: 26, signal: 9 },
      outputs: ['macd', 'signal', 'histogram']
    },
    'bollinger': {
      outputType: 'series<float>',
      lookback: 20,
      params: { period: 20, stdDev: 2.0 },
      outputs: ['middle', 'upper', 'lower']
    },
    'highest': { outputType: 'series<float>', lookback: 0, params: { period: 20 } },
    'lowest': { outputType: 'series<float>', lookback: 0, params: { period: 20 } },
  },
  
  // Math operations
  math: {
    'add': { outputType: 'series<float>', inputs: ['series<float>', 'series<float>'] },
    'sub': { outputType: 'series<float>', inputs: ['series<float>', 'series<float>'] },
    'mult': { outputType: 'series<float>', inputs: ['series<float>', 'series<float>'] },
    'div': { outputType: 'series<float>', inputs: ['series<float>', 'series<float>'] },
    'abs': { outputType: 'series<float>', inputs: ['series<float>'] },
    'min': { outputType: 'series<float>', inputs: ['series<float>', 'series<float>'] },
    'max': { outputType: 'series<float>', inputs: ['series<float>', 'series<float>'] },
    'round': { outputType: 'series<float>', inputs: ['series<float>'] },
    'clamp': { outputType: 'series<float>', inputs: ['series<float>', 'scalar<float>', 'scalar<float>'] },
  },
  
  // Comparison operations
  comparison: {
    'gt': { outputType: 'bool', inputs: ['series<float>', 'series<float>'] },
    'lt': { outputType: 'bool', inputs: ['series<float>', 'series<float>'] },
    'gte': { outputType: 'bool', inputs: ['series<float>', 'series<float>'] },
    'lte': { outputType: 'bool', inputs: ['series<float>', 'series<float>'] },
    'eq': { outputType: 'bool', inputs: ['series<float>', 'series<float>'] },
    'neq': { outputType: 'bool', inputs: ['series<float>', 'series<float>'] },
  },
  
  // Logic operations
  logic: {
    'and': { outputType: 'bool', inputs: ['bool', 'bool'] },
    'or': { outputType: 'bool', inputs: ['bool', 'bool'] },
    'not': { outputType: 'bool', inputs: ['bool'] },
    'crossover': { outputType: 'bool', inputs: ['series<float>', 'series<float>'] },
    'crossunder': { outputType: 'bool', inputs: ['series<float>', 'series<float>'] },
  },
  
  // Condition operations
  condition: {
    'if': { outputType: 'series<float>', inputs: ['bool', 'series<float>', 'series<float>'] },
  },
  
  // Output operations
  output: {
    'plot': { outputType: 'void', inputs: ['series<float>'] },
    'hline': { outputType: 'void', inputs: ['scalar<float>'] },
    'band': { outputType: 'void', inputs: ['series<float>', 'series<float>'] },
    'fill': { outputType: 'void', inputs: ['series<float>', 'series<float>'] },
  },
  
  // Alert operations
  alert: {
    'alert': { outputType: 'void', inputs: ['bool'], params: { message: '' } },
  },
} as const;

/**
 * Platform-specific compatibility matrix
 */
export const PLATFORM_CAPABILITIES: Record<TargetPlatform, {
  supports: string[];
  limitations: string[];
  approximations: Record<string, string>;
}> = {
  pinescript_v5: {
    supports: [
      'ohlcv.*', 'sma', 'ema', 'rsi', 'atr', 'macd', 'bollinger', 'highest', 'lowest',
      'add', 'sub', 'mult', 'div', 'abs', 'min', 'max', 'round', 'clamp',
      'gt', 'lt', 'gte', 'lte', 'eq', 'neq',
      'and', 'or', 'not', 'crossover', 'crossunder',
      'if', 'plot', 'hline', 'band', 'fill', 'alert'
    ],
    limitations: [
      'dynamic plot count', 'runtime plot addition', 'complex objects'
    ],
    approximations: {},
  },
  mql5: {
    supports: [
      'ohlcv.*', 'sma', 'ema', 'rsi', 'atr', 'macd', 'bollinger', 'highest', 'lowest',
      'add', 'sub', 'mult', 'div', 'abs', 'min', 'max', 'round', 'clamp',
      'gt', 'lt', 'gte', 'lte', 'eq', 'neq',
      'and', 'or', 'not', 'crossover', 'crossunder',
      'if', 'plot', 'hline', 'band', 'fill', 'alert'
    ],
    limitations: [
      'array bounds', 'buffer management'
    ],
    approximations: {
      'macd': 'Uses iMACD native, may differ in initial values',
    },
  },
  mql4: {
    supports: [
      'ohlcv.*', 'sma', 'ema', 'rsi', 'atr', 
      'add', 'sub', 'mult', 'div', 'abs', 'min', 'max',
      'gt', 'lt', 'gte', 'lte', 'eq',
      'and', 'or', 'not',
      'if', 'plot'
    ],
    limitations: [
      'no bollinger native', 'no macd native', 'no atr native',
      'limited plotting', 'no alerts native', 'no hline'
    ],
    approximations: {
      'rsi': 'Calculated manually',
      'bollinger': 'Manual calculation required',
    },
  },
  ninjatrader_8: {
    supports: [
      'ohlcv.*', 'sma', 'ema', 'rsi', 'atr', 'macd', 'bollinger',
      'add', 'sub', 'mult', 'div', 'abs', 'min', 'max', 'round',
      'gt', 'lt', 'gte', 'lte', 'eq',
      'and', 'or', 'not', 'crossover', 'crossunder',
      'if', 'plot'
    ],
    limitations: [
      'OnBarUpdate lifecycle', 'Plot[] array management',
      'no native alerts in code', 'AddPlot requirements'
    ],
    approximations: {},
  },
};

/**
 * Create a new empty IR graph
 */
export function createIrGraph(options: {
  name: string;
  description?: string;
  displayType: DisplayType;
  platforms: TargetPlatform[];
}): IrGraph {
  return {
    version: IR_VERSION,
    meta: {
      name: options.name,
      description: options.description || '',
      displayType: options.displayType,
      platforms: options.platforms,
    },
    inputs: [],
    nodes: [],
    outputs: [],
    alerts: [],
    constraints: {
      lookbackRequired: 0,
      warmupBars: 0,
      unsupportedPlatforms: [],
      approximations: {},
    },
  };
}

/**
 * Add an input to the IR graph
 */
export function addIrInput(
  graph: IrGraph,
  input: Omit<IrInput, 'exposed'>
): IrGraph {
  return {
    ...graph,
    inputs: [...graph.inputs, { ...input, exposed: input.exposed ?? true }],
  };
}

/**
 * Add a node to the IR graph
 */
export function addIrNode(graph: IrGraph, node: IrNode): IrGraph {
  // Update constraints based on node
  const opInfo = getOperationInfo(node.type, node.operation);
  const lookback = opInfo?.lookback ?? 0;
  
  return {
    ...graph,
    nodes: [...graph.nodes, node],
    constraints: {
      ...graph.constraints,
      lookbackRequired: Math.max(graph.constraints.lookbackRequired, lookback),
      warmupBars: Math.max(graph.constraints.warmupBars, lookback),
    },
  };
}

/**
 * Get operation info from registry
 */
export function getOperationInfo(
  type: string,
  operation: string
): { outputType: ValueType; lookback: number; params?: Record<string, unknown> } | undefined {
  const ops = OPERATION_REGISTRY[type as keyof typeof OPERATION_REGISTRY];
  if (!ops) return undefined;
  return (ops as Record<string, unknown>)[operation] as never;
}

/**
 * Check if an operation is supported by a platform
 */
export function isOperationSupported(
  platform: TargetPlatform,
  type: string,
  operation: string
): 'supported' | 'approximated' | 'unsupported' {
  const caps = PLATFORM_CAPABILITIES[platform];
  const pattern = `${type}.${operation}`;
  
  for (const supported of caps.supports) {
    if (supported === pattern || supported === `${type}.*`) {
      if (caps.approximations[pattern]) {
        return 'approximated';
      }
      return 'supported';
    }
  }
  
  return 'unsupported';
}

/**
 * Infer value type from operation
 */
export function inferValueType(type: string, operation: string): ValueType {
  const opInfo = getOperationInfo(type, operation);
  return opInfo?.outputType ?? 'series<float>';
}

export type { IrGraph, IrNode, IrValue, IrInput, IrOutput, IrAlert, IrConstraints };