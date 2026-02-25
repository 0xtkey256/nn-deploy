// @nn-deploy/compiler - Neural Network Compiler

// IR types
export type { DataType, Layout, TensorType, QuantizationConfig } from './ir/types';
export { dtypeBytes, shapeNumel, tensorByteSize, shapeToString, tensorTypeToString, formatBytes, formatFLOPs } from './ir/types';

export type { OpType, OpCategory, OpSignature } from './ir/ops';
export { OP_REGISTRY, OP_COLORS, getOpCategory, getOpColor } from './ir/ops';

export type { Port, AttributeValue, Attributes, Node, Edge, PassRecord, Graph } from './ir/graph';
export {
  genId, resetIdCounter, createGraph, addNode, removeNode, updateNode,
  addEdge, removeEdge, recordPass, getNode, getInputEdges, getOutputEdges,
  getProducers, getConsumers, topologicalSort, cloneGraph, getNodesByOp,
  isInput, isOutput, isConstant,
} from './ir/graph';

export type { MemoryBlock, KernelTarget, KernelBinding, ScheduledOp, Schedule, CompiledModel } from './ir/schedule';

// Parsers
export { parseDSL, parseDSLWithImplicitOutput } from './parser/dsl';
export { parseOnnxJson } from './parser/json';
export type { JsonModel, JsonModelNode } from './parser/json';

// Optimization passes
export type { OptimizationPass, PassResult } from './passes';
export {
  runPass, runPipeline, ALL_PASSES,
  shapeInferencePass, constantFoldingPass, deadCodeEliminationPass,
  operatorFusionPass, quantizationPass, layoutOptimizationPass, memoryPlanningPass,
} from './passes';

// Code generation
export type { GeneratedCode, GeneratedKernel, CodegenOptions } from './codegen/types';
export { generateJS } from './codegen/js';
export { generateWebGPU } from './codegen/webgpu';
export { generateWASM } from './codegen/wasm';

// Analysis
export type { GraphMetrics } from './analysis/metrics';
export { computeMetrics } from './analysis/metrics';

// Compiler
export type { CompileOptions, CompileResult } from './compile';
export { compileModel } from './compile';
