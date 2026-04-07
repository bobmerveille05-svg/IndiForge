/**
 * IndiForge Core Package
 * IR, validation, execution, and code generation
 */

// IR types and operations
export * from './ir';

// Validation
export * from './validator';

// Compiler
export * from './compiler/visual-to-ir';
export { executeIr, OHLCV, ExecutionResult } from './compiler/execution-engine';

// Generators
export { generatePineScript } from './generators/pinescript';
export { generateMql5 } from './generators/mql5';

// Main compile function
import type { IrGraph, TargetPlatform, GeneratedCode, ValidationReport, VisualGraph } from '@indiforge/shared';
import { validateVisualGraph } from './validator';
import { generatePineScript } from './generators/pinescript';
import { generateMql5 } from './generators/mql5';
import { convertVisualToIr } from './compiler/visual-to-ir';
import { executeIr, OHLCV } from './compiler/execution-engine';

/**
 * Execute indicator and return values for preview
 */
export function calculateIndicator(
  graph: VisualGraph,
  ohlcvData: OHLCV[],
  options: {
    name: string;
    description?: string;
    displayType: 'overlay' | 'separate_pane';
    platforms: TargetPlatform[];
  }
): { values: Record<string, number[]>; errors: string[] } {
  // Convert to IR
  const ir = convertVisualToIr(graph, options);
  
  // Execute
  const result = executeIr(ir, ohlcvData);
  
  return { values: result.plots, errors: result.errors };
}

/**
 * Compile visual graph to code for specified platforms
 */
export function compile(
  graph: VisualGraph,
  targetPlatforms: TargetPlatform[]
): {
  validation: ValidationReport;
  outputs: GeneratedCode[];
} {
  // Validate first
  const validation = validateVisualGraph(
    graph as never,
    targetPlatforms
  );
  
  // If validation fails with errors, still try to generate but note issues
  const outputs: GeneratedCode[] = [];
  
  // Convert to IR first
  const ir = convertVisualToIr(graph, {
    name: 'Indicator',
    displayType: 'overlay',
    platforms: targetPlatforms,
  });

  for (const platform of targetPlatforms) {
    try {
      if (platform === 'pinescript_v5') {
        outputs.push(generatePineScript(ir));
      } else if (platform === 'mql5') {
        outputs.push(generateMql5(ir));
      }
      // Other platforms would go here (mql4, ninjatrader_8)
    } catch (error) {
      // Log error but continue with other platforms
      console.error(`Failed to generate for ${platform}:`, error);
    }
  }
  
  return { validation, outputs };
}