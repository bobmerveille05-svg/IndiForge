/**
 * IndiForge Core Package
 * IR, validation, and code generation
 */

// IR types and operations
export * from './ir';

// Validation
export * from './validator';

// Generators
export { generatePineScript } from './generators/pinescript';
export { generateMql5 } from './generators/mql5';

// Main compile function
import type { IrGraph, TargetPlatform, GeneratedCode, ValidationReport } from '@indiforge/shared';
import { validateVisualGraph } from './validator';
import { generatePineScript } from './generators/pinescript';
import { generateMql5 } from './generators/mql5';

/**
 * Compile visual graph to code for specified platforms
 */
export function compile(
  graph: { nodes: unknown[]; connections: unknown[] },
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
  
  for (const platform of targetPlatforms) {
    try {
      const ir = convertToIr(graph);
      
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

/**
 * Convert visual graph to canonical IR
 * This is a simplified conversion - full implementation would be more complex
 */
function convertToIr(graph: { nodes: unknown[]; connections: unknown[] }): IrGraph {
  // For now, return a minimal IR
  // Full implementation would traverse the visual graph and build IR
  return {
    version: '1.0.0',
    meta: {
      name: 'Indicator',
      description: '',
      displayType: 'overlay',
      platforms: ['pinescript_v5', 'mql5'],
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