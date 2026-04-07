/**
 * Pine Script v5 code generator
 */

import type { 
  IrGraph, 
  IrNode, 
  IrValue, 
  IrInput, 
  IrOutput, 
  IrAlert,
  GeneratedCode,
  CodeManifest 
} from '@indiforge/shared';
import { OPERATION_REGISTRY } from '../ir';

const GENERATOR_VERSION = '1.0.0';

/**
 * Generate Pine Script v5 code from IR
 */
export function generatePineScript(ir: IrGraph): GeneratedCode {
  const warnings: string[] = [];
  const inputs: IrInput[] = [];
  const outputs: IrOutput[] = [];
  const dependencies: string[] = [];
  
  // Collect inputs and outputs
  for (const input of ir.inputs) {
    if (input.exposed) {
      inputs.push(input);
    }
  }
  
  for (const output of ir.outputs) {
    outputs.push(output);
  }
  
  // Generate code sections
  const inputDeclarations = generateInputs(inputs);
  const variableDeclarations = generateVariables(ir.nodes);
  const calculationCode = generateCalculations(ir.nodes);
  const outputCode = generateOutputs(outputs);
  const alertCode = generateAlerts(ir.alerts);
  
  // Build the complete script
  const code = generateScript({
    name: ir.meta.name,
    description: ir.meta.description,
    displayType: ir.meta.displayType,
    inputs: inputDeclarations,
    variables: variableDeclarations,
    calculations: calculationCode,
    outputs: outputCode,
    alerts: alertCode,
  });
  
  // Check for approximations needed
  if (ir.constraints.approximations) {
    for (const [op, note] of Object.entries(ir.constraints.approximations)) {
      warnings.push(`${op}: ${note}`);
    }
  }
  
  const manifest: CodeManifest = {
    generatorVersion: GENERATOR_VERSION,
    semanticHash: computeSemanticHash(ir),
    generatedAt: new Date().toISOString(),
    inputs,
    outputs,
    dependencies,
  };
  
  return {
    platform: 'pinescript_v5',
    version: 'v5',
    code,
    warnings,
    manifest,
  };
}

function generateInputs(inputs: IrInput[]): string {
  if (inputs.length === 0) return '';
  
  const lines: string[] = [];
  
  for (const input of inputs) {
    let defaultVal = String(input.default);
    let typeStr = 'input';
    
    if (input.type === 'scalar<float>') {
      if (Number.isInteger(input.default)) {
        lines.push(`input.int(${defaultVal}, "${capitalizeFirst(input.name)}")`);
      } else {
        lines.push(`input.float(${defaultVal}, "${capitalizeFirst(input.name)}")`);
      }
    } else if (input.type === 'bool') {
      lines.push(`input.bool(${defaultVal === 'true'}, "${capitalizeFirst(input.name)}")`);
    }
  }
  
  return lines.join('\n');
}

function generateVariables(nodes: IrNode[]): string {
  const lines: string[] = [];
  
  // Find indicator nodes that need variable declarations
  for (const node of nodes) {
    if (node.type === 'indicator') {
      const opInfo = OPERATION_REGISTRY.indicator[node.operation as keyof typeof OPERATION_REGISTRY.indicator];
      if (opInfo && 'outputs' in opInfo) {
        // Multi-output indicator (e.g., MACD, Bollinger)
        const outputs = (opInfo as { outputs: string[] }).outputs;
        for (const outputName of outputs) {
          const varName = `${node.operation}_${outputName}`;
          lines.push(`var ${varName} = na`);
        }
      } else {
        // Single output indicator
        lines.push(`var ${node.operation}_${node.id.slice(0, 4)} = na`);
      }
    }
  }
  
  return lines.length > 0 ? lines.join('\n') : '';
}

function generateCalculations(nodes: IrNode[]): string {
  const lines: string[] = [];
  const computed = new Set<string>();
  
  // Topological sort would be ideal, but for now we'll do a simple approach
  // Process nodes in order, computing their values
  for (const node of nodes) {
    if (node.type === 'data') {
      // Data nodes reference built-in Pine variables
      computed.add(node.id);
      continue;
    }
    
    if (node.type === 'indicator') {
      const calc = generateIndicatorCalc(node);
      if (calc) {
        lines.push(calc);
        computed.add(node.id);
      }
    }
    
    if (node.type === 'math' || node.type === 'comparison' || node.type === 'logic') {
      const calc = generateMathCalc(node, computed);
      if (calc) {
        lines.push(calc);
        computed.add(node.id);
      }
    }
    
    if (node.type === 'condition') {
      const calc = generateConditionCalc(node, computed);
      if (calc) {
        lines.push(calc);
        computed.add(node.id);
      }
    }
  }
  
  return lines.join('\n');
}

function generateIndicatorCalc(node: IrNode): string | null {
  const inputs = node.inputs.map(i => resolveValue(i)).join(', ');
  
  switch (node.operation) {
    case 'sma':
      return `ta.sma(${inputs})`;
    case 'ema':
      return `ta.ema(${inputs})`;
    case 'rsi':
      return `ta.rsi(${inputs})`;
    case 'atr':
      return `ta.atr(${inputs})`;
    case 'macd': {
      const fast = node.params.fast ?? 12;
      const slow = node.params.slow ?? 26;
      const signal = node.params.signal ?? 9;
      return `[macdLine, signalLine, hist] = ta.macd(close, ${fast}, ${slow}, ${signal})`;
    }
    case 'bollinger': {
      const period = node.params.period ?? 20;
      const stdDev = node.params.stdDev ?? 2.0;
      return `[bbMiddle, bbUpper, bbLower] = ta.bb(close, ${period}, ${stdDev})`;
    }
    case 'highest':
      return `ta.highest(${inputs})`;
    case 'lowest':
      return `ta.lowest(${inputs})`;
    default:
      return null;
  }
}

function generateMathCalc(node: IrNode, computed: Set<string>): string | null {
  const resolvedInputs = node.inputs.map(i => resolveValue(i));
  
  switch (node.operation) {
    case 'add':
      return `${resolvedInputs[0]} + ${resolvedInputs[1]}`;
    case 'sub':
      return `${resolvedInputs[0]} - ${resolvedInputs[1]}`;
    case 'mult':
      return `${resolvedInputs[0]} * ${resolvedInputs[1]}`;
    case 'div':
      return `${resolvedInputs[0]} / ${resolvedInputs[1]}`;
    case 'abs':
      return `math.abs(${resolvedInputs[0]})`;
    case 'min':
      return `math.min(${resolvedInputs.join(', ')})`;
    case 'max':
      return `math.max(${resolvedInputs.join(', ')})`;
    case 'round':
      return `math.round(${resolvedInputs[0]})`;
    case 'gt':
      return `${resolvedInputs[0]} > ${resolvedInputs[1]}`;
    case 'lt':
      return `${resolvedInputs[0]} < ${resolvedInputs[1]}`;
    case 'gte':
      return `${resolvedInputs[0]} >= ${resolvedInputs[1]}`;
    case 'lte':
      return `${resolvedInputs[0]} <= ${resolvedInputs[1]}`;
    case 'eq':
      return `${resolvedInputs[0]} == ${resolvedInputs[1]}`;
    case 'and':
      return `${resolvedInputs[0]} and ${resolvedInputs[1]}`;
    case 'or':
      return `${resolvedInputs[0]} or ${resolvedInputs[1]}`;
    case 'not':
      return `not ${resolvedInputs[0]}`;
    case 'crossover':
      return `ta.crossover(${resolvedInputs[0]}, ${resolvedInputs[1]})`;
    case 'crossunder':
      return `ta.crossunder(${resolvedInputs[0]}, ${resolvedInputs[1]})`;
    default:
      return null;
  }
}

function generateConditionCalc(node: IrNode, computed: Set<string>): string | null {
  if (node.operation === 'if') {
    const condition = resolveValue(node.inputs[0]);
    const trueVal = resolveValue(node.inputs[1]);
    const falseVal = resolveValue(node.inputs[2]);
    return `${condition} ? ${trueVal} : ${falseVal}`;
  }
  return null;
}

function resolveValue(value: IrValue): string {
  if (value.type === 'constant') {
    return String(value.value);
  }
  // For node references, use a placeholder that gets resolved
  return `value_${value.nodeId}`;
}

function generateOutputs(outputs: IrOutput[]): string {
  const lines: string[] = [];
  
  for (const output of outputs) {
    switch (output.plotType) {
      case 'line':
        lines.push(`plot(${output.name}, color=color.blue)`);
        break;
      case 'histogram':
        lines.push(`plot(${output.name}, style=plot.style_histogram)`);
        break;
      case 'shape':
        lines.push(`plotshape(${output.name}, ...)`);
        break;
      case 'hline':
        lines.push(`line.new(x1, ${output.name}, x2, ${output.name})`);
        break;
      case 'band':
        lines.push(`plot(${output.name}_upper), plot(${output.name}_lower)`);
        break;
    }
  }
  
  return lines.join('\n');
}

function generateAlerts(alerts: IrAlert[]): string {
  const lines: string[] = [];
  
  for (const alert of alerts) {
    if (alert.enabled) {
      const condition = resolveValue(alert.condition);
      lines.push(`alertcondition(${condition}, title="${alert.message}", message="${alert.message}")`);
    }
  }
  
  return lines.join('\n');
}

interface ScriptParts {
  name: string;
  description: string;
  displayType: string;
  inputs: string;
  variables: string;
  calculations: string;
  outputs: string;
  alerts: string;
}

function generateScript(parts: ScriptParts): string {
  const overlayStr = parts.displayType === 'overlay' ? 'overlay=true' : '';
  
  return `// This code was generated by IndiForge
// Generator version: ${GENERATOR_VERSION}
// Generated at: ${new Date().toISOString()}

${parts.inputs ? parts.inputs + '\n' : ''}// Indicator declaration
indicator("${parts.name}", shorttitle="${parts.name.slice(0, 8)}", ${overlayStr})

${parts.variables ? parts.variables + '\n' : ''}
${parts.calculations ? '// Calculations\n' + parts.calculations + '\n' : ''}
${parts.outputs ? '// Outputs\n' + parts.outputs + '\n' : ''}
${parts.alerts ? '// Alerts\n' + parts.alerts + '\n' : ''}
`;
}

function computeSemanticHash(ir: IrGraph): string {
  // Simple hash based on IR content
  const content = JSON.stringify(ir);
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export { generatePineScript };