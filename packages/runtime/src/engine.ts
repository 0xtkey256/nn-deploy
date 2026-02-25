import type { CompiledModel } from '@nn-deploy/compiler';
import type { Tensor } from './tensor';

export interface InferenceEngine {
  readonly name: string;
  readonly isAvailable: boolean;
  initialize(model: CompiledModel): Promise<void>;
  run(inputs: Record<string, Tensor>): Promise<Record<string, Tensor>>;
  dispose(): void;
}

export interface EngineOptions {
  preferredBackend?: 'webgpu' | 'wasm' | 'js';
  enableProfiling?: boolean;
}

export interface InferenceResult {
  outputs: Record<string, Tensor>;
  latencyMs: number;
  backend: string;
}
