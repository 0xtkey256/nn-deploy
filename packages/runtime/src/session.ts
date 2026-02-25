import type { CompiledModel } from '@nn-deploy/compiler';
import type { InferenceEngine, InferenceResult, EngineOptions } from './engine';
import type { Tensor } from './tensor';
import { JSEngine } from './js-engine';
import { WebGPUEngine } from './webgpu-engine';

export interface SessionOptions extends EngineOptions {
  warmup?: boolean;
}

export interface ModelMetadata {
  name: string;
  backend: string;
  compileTime: number;
  passes: string[];
  peakMemoryBytes: number;
  totalFLOPs: number;
}

export class InferenceSession {
  private engine: InferenceEngine;
  private model: CompiledModel;

  private constructor(engine: InferenceEngine, model: CompiledModel) {
    this.engine = engine;
    this.model = model;
  }

  static async create(model: CompiledModel, options: SessionOptions = {}): Promise<InferenceSession> {
    const engine = InferenceSession.selectEngine(options);
    await engine.initialize(model);

    const session = new InferenceSession(engine, model);

    if (options.warmup) {
      // Warmup run (results discarded)
      // Caller should provide dummy inputs for warmup
    }

    return session;
  }

  private static selectEngine(options: EngineOptions): InferenceEngine {
    const preferred = options.preferredBackend ?? 'js';

    if (preferred === 'webgpu') {
      const gpu = new WebGPUEngine();
      if (gpu.isAvailable) return gpu;
    }

    // Default to JS engine (always available)
    return new JSEngine();
  }

  async run(inputs: Record<string, Tensor>): Promise<InferenceResult> {
    const start = performance.now();
    const outputs = await this.engine.run(inputs);
    const latencyMs = performance.now() - start;

    return {
      outputs,
      latencyMs,
      backend: this.engine.name,
    };
  }

  getMetadata(): ModelMetadata {
    return {
      name: this.model.metadata.modelName,
      backend: this.engine.name,
      compileTime: this.model.metadata.compileTime,
      passes: this.model.metadata.passes,
      peakMemoryBytes: this.model.metadata.peakMemoryBytes,
      totalFLOPs: this.model.metadata.totalFLOPs,
    };
  }

  dispose(): void {
    this.engine.dispose();
  }
}
