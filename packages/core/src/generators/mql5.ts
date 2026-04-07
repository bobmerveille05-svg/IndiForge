/**
 * MetaTrader 5 (MQL5) code generator
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
 * Generate MQL5 code from IR
 */
export function generateMql5(ir: IrGraph): GeneratedCode {
  const warnings: string[] = [];
  const inputs: IrInput[] = [];
  const outputs: IrOutput[] = [];
  const dependencies: string[] = ['Trade.mqh', 'OnCalculate'];
  
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
  const bufferDeclarations = generateBuffers(outputs);
  const calculationCode = generateCalculations(ir.nodes);
  const outputCode = generateOutputs(outputs);
  const alertCode = generateAlerts(ir.alerts);
  
  // Build the complete script
  const code = generateScript({
    name: ir.meta.name,
    description: ir.meta.description,
    inputs: inputDeclarations,
    buffers: bufferDeclarations,
    calculations: calculationCode,
    outputs: outputCode,
    alerts: alertCode,
  });
  
  // Check for known approximations
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
    platform: 'mql5',
    version: 'build 1380',
    code,
    warnings,
    manifest,
  };
}

function generateInputs(inputs: IrInput[]): string {
  if (inputs.length === 0) return '';
  
  const lines: string[] = [];
  
  for (const input of inputs) {
    const name = toMqlIdentifier(input.name);
    let typeStr = 'int';
    
    if (input.type === 'scalar<float>') {
      typeStr = Number.isInteger(input.default as number) ? 'int' : 'double';
    }
    
    let defaultVal = input.default;
    if (typeof defaultVal === 'string') {
      defaultVal = parseFloat(defaultVal);
    }
    
    lines.push(`input ${typeStr} ${name} = ${defaultVal};  // ${input.name}`);
  }
  
  return lines.join('\n');
}

function generateBuffers(outputs: IrOutput[]): string {
  const lines: string[] = [];
  
  // MQL5 requires buffer declaration for custom indicators
  const bufferCount = outputs.length;
  if (bufferCount > 0) {
    lines.push(`#property indicator_plots ${bufferCount}`);
    lines.push(`#property indicator_buffers ${bufferCount}`);
    
    for (let i = 0; i < outputs.length; i++) {
      const output = outputs[i];
      lines.push(`double Buffer_${i}[];`);
    }
  }
  
  return lines.join('\n');
}

function generateCalculations(nodes: IrNode[]): string {
  const lines: string[] = [];
  const computed = new Set<string>();
  
  // Process data nodes
  for (const node of nodes) {
    if (node.type === 'data') {
      computed.add(node.id);
    }
  }
  
  // Process indicator and calculation nodes
  for (const node of nodes) {
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
  }
  
  return lines.length > 0 ? lines.join('\n') : '';
}

function generateIndicatorCalc(node: IrNode): string | null {
  const inputs = node.inputs.map(i => resolveValue(i)).join(', ');
  
  switch (node.operation) {
    case 'sma':
      return `iMA(NULL, 0, ${node.params.period ?? 20}, 0, MODE_SMA, PRICE_CLOSE)`;
    case 'ema':
      return `iMA(NULL, 0, ${node.params.period ?? 9}, 0, MODE_EMA, PRICE_CLOSE)`;
    case 'rsi':
      return `iRSI(NULL, 0, ${node.params.period ?? 14}, PRICE_CLOSE)`;
    case 'atr':
      return `iATR(NULL, 0, ${node.params.period ?? 14})`;
    case 'macd':
      return `iMACD(NULL, 0, ${node.params.fast ?? 12}, ${node.params.slow ?? 26}, ${node.params.signal ?? 9}, PRICE_CLOSE)`;
    case 'bollinger':
      return `iBands(NULL, 0, ${node.params.period ?? 20}, 0, ${node.params.stdDev ?? 2.0}, PRICE_CLOSE)`;
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
      return `MathAbs(${resolvedInputs[0]})`;
    case 'min':
      return `MathMin(${resolvedInputs[0]}, ${resolvedInputs[1]})`;
    case 'max':
      return `MathMax(${resolvedInputs[0]}, ${resolvedInputs[1]})`;
    case 'round':
      return `MathRound(${resolvedInputs[0]})`;
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
      return `(${resolvedInputs[0]} && ${resolvedInputs[1]})`;
    case 'or':
      return `(${resolvedInputs[0]} || ${resolvedInputs[1]})`;
    case 'not':
      return `!${resolvedInputs[0]}`;
    default:
      return null;
  }
}

function resolveValue(value: IrValue): string {
  if (value.type === 'constant') {
    if (typeof value.value === 'number') {
      return String(value.value);
    }
    return String(value.value);
  }
  return `Buffer_${value.nodeId.slice(0, 4)}[i]`;
}

function generateOutputs(outputs: IrOutput[]): string {
  const lines: string[] = [];
  
  for (let i = 0; i < outputs.length; i++) {
    const output = outputs[i];
    lines.push(`Buffer_${i}[i] = ${output.name};`);
  }
  
  return lines.join('\n');
}

function generateAlerts(alerts: IrAlert[]): string {
  const lines: string[] = [];
  
  for (const alert of alerts) {
    if (alert.enabled) {
      const condition = resolveValue(alert.condition);
      lines.push(`if(${condition} && !prevCondition) Alert("${alert.message}");`);
    }
  }
  
  return lines.join('\n');
}

interface ScriptParts {
  name: string;
  description: string;
  inputs: string;
  buffers: string;
  calculations: string;
  outputs: string;
  alerts: string;
}

function generateScript(parts: ScriptParts): string {
  return `//+------------------------------------------------------------------+
//| ${parts.name}.mq5 |
//| Generated by IndiForge |
//| Generator version: ${GENERATOR_VERSION} |
//+------------------------------------------------------------------+
#property copyright "IndiForge"
#property version   "1.00"
#property description "${parts.description}"
#property indicator_chart_window
#property indicator_buffers ${parts.outputs ? parts.outputs.split('\n').filter(l => l.includes('Buffer_')).length : 0}

${parts.inputs ? parts.inputs + '\n' : ''}
${parts.buffers ? parts.buffers + '\n' : ''}

int OnInit()
{
  // Set indicator properties
  return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
  // Cleanup
}

int OnCalculate(const int rates_total,
                const int prev_calculated,
                const datetime &time[],
                const double &open[],
                const double &high[],
                const double &low[],
                const double &close[],
                const long &tick_volume[],
                const long &volume[],
                const int &spread[])
{
  int limit = rates_total - prev_calculated;
  
  for(int i = (limit > 0 ? rates_total - limit : 0); i < rates_total; i++)
  {
    ${parts.calculations ? parts.calculations.replace(/\n/g, '\n    ') : ''}
    ${parts.outputs ? parts.outputs.replace(/\n/g, '\n    ') : ''}
  }
  
  return(rates_total);
}
${parts.alerts ? '\n' + parts.alerts : ''}
`;
}

function computeSemanticHash(ir: IrGraph): string {
  const content = JSON.stringify(ir);
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function toMqlIdentifier(name: string): string {
  // Convert to PascalCase for MQL
  return name.replace(/(?:^|_)(.)/g, (_, c) => c.toUpperCase());
}

export { generateMql5 };