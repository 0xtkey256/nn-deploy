import type { Graph } from './ir/graph';
import type { KernelTarget, CompiledModel } from './ir/schedule';
import type { OptimizationPass } from './passes';
import { ALL_PASSES, runPipeline } from './passes';
import { computeMetrics } from './analysis/metrics';
import { generateJS } from './codegen/js';
import { generateWebGPU } from './codegen/webgpu';
import { generateWASM } from './codegen/wasm';

export interface CompileOptions {
  target?: KernelTarget;
  passes?: OptimizationPass[];
  enableQuantization?: boolean;
  enableLayoutOpt?: boolean;
}

export interface CompileResult {
  model: CompiledModel;
  history: { graph: Graph; passName: string; description: string }[];
  originalGraph: Graph;
}

export function compileModel(graph: Graph, options: CompileOptions = {}): CompileResult {
  const startTime = performance.now();
  const target = options.target ?? 'js';

  // Select passes
  let passes = options.passes ?? ALL_PASSES;
  if (!options.enableQuantization) {
    passes = passes.filter(p => p.name !== 'Quantization');
  }
  if (!options.enableLayoutOpt) {
    passes = passes.filter(p => p.name !== 'Layout Optimization');
  }

  // Run optimization pipeline
  const history = runPipeline(graph, passes);
  const optimizedGraph = history.length > 0 ? history[history.length - 1].graph : graph;

  // Generate code for target backend
  let generatedCode;
  switch (target) {
    case 'webgpu':
      generatedCode = generateWebGPU(optimizedGraph);
      break;
    case 'wasm':
      generatedCode = generateWASM(optimizedGraph);
      break;
    case 'js':
    default:
      generatedCode = generateJS(optimizedGraph);
      break;
  }

  const metrics = computeMetrics(optimizedGraph);
  const compileTime = performance.now() - startTime;

  const model: CompiledModel = {
    schedule: {
      modelName: optimizedGraph.name,
      ops: [],
      memoryBlocks: [],
      peakMemoryBytes: metrics.peakMemoryBytes,
      totalOps: metrics.nodeCount,
      inputBlockIds: [],
      outputBlockIds: [],
    },
    generatedCode: {
      target,
      source: generatedCode.source,
      kernels: generatedCode.kernels.map(k => ({ name: k.name, source: k.source })),
    },
    metadata: {
      modelName: optimizedGraph.name,
      compileTime,
      passes: history.map(h => h.passName),
      targetBackend: target,
      peakMemoryBytes: metrics.peakMemoryBytes,
      totalFLOPs: metrics.totalFLOPs,
    },
  };

  return { model, history, originalGraph: graph };
}
