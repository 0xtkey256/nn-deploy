import type { Schedule, KernelTarget } from '../ir/schedule';

export interface GeneratedKernel {
  name: string;
  source: string;
  op: string;
}

export interface GeneratedCode {
  target: KernelTarget;
  source: string;
  kernels: GeneratedKernel[];
  entryPoint: string;
}

export interface CodegenOptions {
  target: KernelTarget;
  optimize?: boolean;
  debug?: boolean;
}
