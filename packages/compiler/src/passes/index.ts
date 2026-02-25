import type { Graph } from '../ir/graph';
import { recordPass } from '../ir/graph';

// Optimization pass interface
export interface OptimizationPass {
  name: string;
  description: string;
  run: (graph: Graph) => Graph;
}

export interface PassResult {
  graph: Graph;
  passName: string;
  description: string;
}

export function runPass(graph: Graph, pass: OptimizationPass): PassResult {
  const result = pass.run(graph);
  const recorded = recordPass(result, pass.name, pass.description);
  return { graph: recorded, passName: pass.name, description: pass.description };
}

export function runPipeline(graph: Graph, passes: OptimizationPass[]): PassResult[] {
  const results: PassResult[] = [];
  let current = graph;
  for (const pass of passes) {
    const result = runPass(current, pass);
    results.push(result);
    current = result.graph;
  }
  return results;
}

export { shapeInferencePass } from './shape-inference';
export { constantFoldingPass } from './constant-folding';
export { deadCodeEliminationPass } from './dead-code-elimination';
export { operatorFusionPass } from './operator-fusion';
export { quantizationPass } from './quantization';
export { layoutOptimizationPass } from './layout-optimization';
export { memoryPlanningPass } from './memory-planning';

import { shapeInferencePass } from './shape-inference';
import { constantFoldingPass } from './constant-folding';
import { deadCodeEliminationPass } from './dead-code-elimination';
import { operatorFusionPass } from './operator-fusion';
import { quantizationPass } from './quantization';
import { layoutOptimizationPass } from './layout-optimization';
import { memoryPlanningPass } from './memory-planning';

export const ALL_PASSES: OptimizationPass[] = [
  shapeInferencePass,
  constantFoldingPass,
  deadCodeEliminationPass,
  operatorFusionPass,
  quantizationPass,
  layoutOptimizationPass,
  memoryPlanningPass,
];
