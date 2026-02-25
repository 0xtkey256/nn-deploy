import type { CompiledModel } from '@nn-deploy/compiler';
import type { InferenceEngine } from './engine';
import { Tensor } from './tensor';

export class JSEngine implements InferenceEngine {
  readonly name = 'JavaScript';
  readonly isAvailable = true;
  private runFn: ((inputs: Record<string, Tensor>) => Record<string, Tensor>) | null = null;

  async initialize(model: CompiledModel): Promise<void> {
    // Parse the generated JS source and create a runnable function
    const source = model.generatedCode.source;

    // Create a sandboxed execution context
    // The generated code defines a `run` function and Tensor class
    const wrappedSource = `
      ${source}
      return { run, Tensor };
    `;

    try {
      const factory = new Function(wrappedSource);
      const module = factory();
      this.runFn = (inputs: Record<string, Tensor>) => {
        // Convert our Tensor objects to the generated code's Tensor format
        const jsInputs: Record<string, { data: Float32Array; shape: number[] }> = {};
        for (const [name, tensor] of Object.entries(inputs)) {
          jsInputs[name] = { data: tensor.data as Float32Array, shape: tensor.shape };
        }
        const result = module.run(jsInputs);

        // Convert back to our Tensor objects
        const outputs: Record<string, Tensor> = {};
        for (const [name, val] of Object.entries(result)) {
          const t = val as { data: Float32Array; shape: number[] };
          if (t && t.data && t.shape) {
            outputs[name] = new Tensor(t.data, t.shape);
          }
        }
        return outputs;
      };
    } catch {
      throw new Error('Failed to initialize JS engine from generated code');
    }
  }

  async run(inputs: Record<string, Tensor>): Promise<Record<string, Tensor>> {
    if (!this.runFn) throw new Error('Engine not initialized');
    return this.runFn(inputs);
  }

  dispose(): void {
    this.runFn = null;
  }
}
