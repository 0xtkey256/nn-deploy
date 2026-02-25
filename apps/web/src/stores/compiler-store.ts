'use client';

import { create } from 'zustand';
import type {
  Graph,
  GraphMetrics,
  OptimizationPass,
  KernelTarget,
  CompiledModel,
  GeneratedCode,
} from '@nn-deploy/compiler';
import {
  parseDSL,
  ALL_PASSES,
  runPipeline,
  compileModel,
  computeMetrics,
} from '@nn-deploy/compiler';
import { EXAMPLES, DEFAULT_EXAMPLE } from '@/lib/examples';

export interface HistoryEntry {
  graph: Graph;
  label: string;
  metrics: GraphMetrics;
}

export interface CompilerState {
  // Source
  source: string;
  parseError: string | null;

  // Pipeline
  history: HistoryEntry[];
  currentStep: number;
  enabledPasses: boolean[];
  targetBackend: KernelTarget;

  // Compiled output
  compiledModel: CompiledModel | null;
  generatedCode: string | null;

  // Selection
  selectedNodeId: string | null;

  // Actions
  setSource: (source: string) => void;
  compile: () => void;
  setStep: (step: number) => void;
  togglePass: (index: number) => void;
  setTargetBackend: (target: KernelTarget) => void;
  selectNode: (nodeId: string | null) => void;
  loadExample: (index: number) => void;
}

export const useCompilerStore = create<CompilerState>((set, get) => ({
  source: DEFAULT_EXAMPLE.dsl,
  parseError: null,
  history: [],
  currentStep: 0,
  enabledPasses: ALL_PASSES.map(() => true),
  targetBackend: 'js',
  compiledModel: null,
  generatedCode: null,
  selectedNodeId: null,

  setSource: (source) => set({ source }),

  compile: () => {
    const { source, enabledPasses, targetBackend } = get();
    try {
      const graph = parseDSL(source);
      const originalMetrics = computeMetrics(graph);

      // Build history
      const history: HistoryEntry[] = [
        { graph, label: 'Original', metrics: originalMetrics },
      ];

      // Run enabled passes
      const selectedPasses = ALL_PASSES.filter((_, i) => enabledPasses[i]);
      const results = runPipeline(graph, selectedPasses);

      for (const result of results) {
        const metrics = computeMetrics(result.graph);
        history.push({
          graph: result.graph,
          label: result.passName,
          metrics,
        });
      }

      // Full compilation
      const compiled = compileModel(graph, {
        target: targetBackend,
        passes: selectedPasses,
      });

      set({
        history,
        currentStep: history.length - 1,
        parseError: null,
        compiledModel: compiled.model,
        generatedCode: compiled.model.generatedCode.source,
        selectedNodeId: null,
      });
    } catch (e) {
      set({
        parseError: e instanceof Error ? e.message : String(e),
        history: [],
        compiledModel: null,
        generatedCode: null,
      });
    }
  },

  setStep: (step) => set({ currentStep: step, selectedNodeId: null }),

  togglePass: (index) => {
    const { enabledPasses } = get();
    const next = [...enabledPasses];
    next[index] = !next[index];
    set({ enabledPasses: next });
  },

  setTargetBackend: (target) => set({ targetBackend: target }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  loadExample: (index) => {
    const example = EXAMPLES[index] ?? DEFAULT_EXAMPLE;
    set({ source: example.dsl, parseError: null, history: [], compiledModel: null, generatedCode: null });
  },
}));
