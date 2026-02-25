import type { CompiledModel } from '@nn-deploy/compiler';
import type { InferenceEngine } from './engine';
import { Tensor } from './tensor';

export class WebGPUEngine implements InferenceEngine {
  readonly name = 'WebGPU';
  private device: GPUDevice | null = null;
  private pipelines: Map<string, GPUComputePipeline> = new Map();
  private model: CompiledModel | null = null;

  get isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  async initialize(model: CompiledModel): Promise<void> {
    if (!this.isAvailable) throw new Error('WebGPU not available');

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No WebGPU adapter found');

    this.device = await adapter.requestDevice();
    this.model = model;

    // Compile each WGSL kernel into a compute pipeline
    for (const kernel of model.generatedCode.kernels) {
      try {
        const shaderModule = this.device.createShaderModule({ code: kernel.source });
        const pipeline = await this.device.createComputePipelineAsync({
          layout: 'auto',
          compute: { module: shaderModule, entryPoint: 'main' },
        });
        this.pipelines.set(kernel.name, pipeline);
      } catch {
        console.warn(`Failed to compile kernel: ${kernel.name}`);
      }
    }
  }

  async run(inputs: Record<string, Tensor>): Promise<Record<string, Tensor>> {
    if (!this.device || !this.model) throw new Error('Engine not initialized');

    // For now, fall back to JS execution if WebGPU pipelines fail
    // Full WebGPU dispatch would create buffers, bind groups, and dispatch compute passes
    const outputs: Record<string, Tensor> = {};

    // Create GPU buffers for inputs
    const gpuBuffers = new Map<string, GPUBuffer>();
    for (const [name, tensor] of Object.entries(inputs)) {
      const buffer = this.device.createBuffer({
        size: tensor.byteSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
      });
      new Float32Array(buffer.getMappedRange()).set(tensor.data as Float32Array);
      buffer.unmap();
      gpuBuffers.set(name, buffer);
    }

    // TODO: Full kernel dispatch implementation
    // For now, return input passthrough as placeholder
    for (const [name, tensor] of Object.entries(inputs)) {
      outputs[name] = tensor.clone();
    }

    // Cleanup
    for (const buffer of gpuBuffers.values()) {
      buffer.destroy();
    }

    return outputs;
  }

  dispose(): void {
    this.pipelines.clear();
    this.device?.destroy();
    this.device = null;
    this.model = null;
  }
}
