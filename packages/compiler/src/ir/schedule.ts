import type { TensorType } from './types';
import type { OpType } from './ops';
import type { Attributes } from './graph';

// A memory block allocated for tensor storage
export interface MemoryBlock {
  id: string;
  offset: number;
  size: number;
  // Lifetime: [first use, last use] in schedule order
  lifetime: [number, number];
  tensorType: TensorType;
  label: string;
}

// Kernel binding for code generation
export type KernelTarget = 'webgpu' | 'wasm' | 'js';

export interface KernelBinding {
  target: KernelTarget;
  kernelName: string;
  workgroupSize?: [number, number, number];
  dispatchSize?: [number, number, number];
}

// A scheduled operation with concrete memory assignments
export interface ScheduledOp {
  id: string;
  op: OpType;
  name: string;
  attributes: Attributes;
  // Memory offsets for inputs and outputs
  inputMemory: string[];   // MemoryBlock IDs
  outputMemory: string[];  // MemoryBlock IDs
  // Kernel to execute
  kernel: KernelBinding;
  // Dependencies (must complete before this op)
  dependencies: string[];  // ScheduledOp IDs
  // Execution order index
  order: number;
}

// Complete execution schedule
export interface Schedule {
  modelName: string;
  ops: ScheduledOp[];
  memoryBlocks: MemoryBlock[];
  peakMemoryBytes: number;
  totalOps: number;
  inputBlockIds: string[];
  outputBlockIds: string[];
}

// Compiled model ready for execution
export interface CompiledModel {
  schedule: Schedule;
  generatedCode: {
    target: KernelTarget;
    source: string;
    kernels: { name: string; source: string }[];
  };
  metadata: {
    modelName: string;
    compileTime: number;
    passes: string[];
    targetBackend: KernelTarget;
    peakMemoryBytes: number;
    totalFLOPs: number;
  };
}
