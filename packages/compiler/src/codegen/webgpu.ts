import type { Graph, Node } from '../ir/graph';
import type { GeneratedCode, GeneratedKernel } from './types';
import { topologicalSort, getInputEdges, getOutputEdges } from '../ir/graph';
import { shapeNumel } from '../ir/types';

function generateWGSLKernel(node: Node): string {
  switch (node.op) {
    case 'MatMul': case 'FusedMatMulAdd': case 'FusedLinearReLU':
      return `// MatMul kernel: ${node.name}
@group(0) @binding(0) var<storage, read> a: array<f32>;
@group(0) @binding(1) var<storage, read> b: array<f32>;
${node.op !== 'MatMul' ? '@group(0) @binding(2) var<storage, read> bias: array<f32>;' : ''}
@group(0) @binding(${node.op !== 'MatMul' ? 3 : 2}) var<storage, read_write> result: array<f32>;

struct Params { M: u32, K: u32, N: u32 }
@group(0) @binding(${node.op !== 'MatMul' ? 4 : 3}) var<uniform> params: Params;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let row = gid.x;
  let col = gid.y;
  if (row >= params.M || col >= params.N) { return; }

  var sum: f32 = 0.0;
  for (var k: u32 = 0; k < params.K; k++) {
    sum += a[row * params.K + k] * b[k * params.N + col];
  }
  ${node.op === 'FusedMatMulAdd' || node.op === 'FusedLinearReLU' ? 'sum += bias[col];' : ''}
  ${node.op === 'FusedLinearReLU' ? 'sum = max(sum, 0.0);' : ''}
  result[row * params.N + col] = sum;
}`;

    case 'Conv2D': case 'FusedConvBNReLU': case 'FusedConvBN':
      return `// Conv2D kernel: ${node.name}
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read> weight: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;

struct ConvParams { N: u32, C: u32, H: u32, W: u32, F: u32, K: u32, S: u32, outH: u32, outW: u32 }
@group(0) @binding(3) var<uniform> params: ConvParams;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let oh = gid.x;
  let ow = gid.y;
  let f = gid.z;
  if (oh >= params.outH || ow >= params.outW || f >= params.F) { return; }

  var sum: f32 = 0.0;
  for (var c: u32 = 0; c < params.C; c++) {
    for (var kh: u32 = 0; kh < params.K; kh++) {
      for (var kw: u32 = 0; kw < params.K; kw++) {
        let ih = oh * params.S + kh;
        let iw = ow * params.S + kw;
        sum += input[(c * params.H + ih) * params.W + iw] *
               weight[((f * params.C + c) * params.K + kh) * params.K + kw];
      }
    }
  }
  ${node.op.includes('ReLU') ? 'sum = max(sum, 0.0);' : ''}
  output[(f * params.outH + oh) * params.outW + ow] = sum;
}`;

    case 'ReLU':
      return `// ReLU kernel: ${node.name}
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  output[i] = max(input[i], 0.0);
}`;

    case 'GELU':
      return `// GELU kernel: ${node.name}
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  let x = input[i];
  let cdf = 0.5 * (1.0 + tanh(0.7978845608 * (x + 0.044715 * x * x * x)));
  output[i] = x * cdf;
}`;

    case 'Softmax':
      return `// Softmax kernel: ${node.name} (simplified 1D)
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

struct Params { size: u32 }
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(1)
fn main() {
  var maxVal: f32 = input[0];
  for (var i: u32 = 1; i < params.size; i++) {
    maxVal = max(maxVal, input[i]);
  }
  var sum: f32 = 0.0;
  for (var i: u32 = 0; i < params.size; i++) {
    output[i] = exp(input[i] - maxVal);
    sum += output[i];
  }
  for (var i: u32 = 0; i < params.size; i++) {
    output[i] /= sum;
  }
}`;

    case 'Add':
      return `// Add kernel: ${node.name}
@group(0) @binding(0) var<storage, read> a: array<f32>;
@group(0) @binding(1) var<storage, read> b: array<f32>;
@group(0) @binding(2) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let i = gid.x;
  output[i] = a[i] + b[i];
}`;

    case 'LayerNorm':
      return `// LayerNorm kernel: ${node.name}
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

struct Params { batchSize: u32, dim: u32 }
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let b = gid.x;
  if (b >= params.batchSize) { return; }
  let off = b * params.dim;
  var mean: f32 = 0.0;
  for (var i: u32 = 0; i < params.dim; i++) { mean += input[off + i]; }
  mean /= f32(params.dim);
  var variance: f32 = 0.0;
  for (var i: u32 = 0; i < params.dim; i++) {
    let d = input[off + i] - mean;
    variance += d * d;
  }
  variance /= f32(params.dim);
  let std = sqrt(variance + 1e-5);
  for (var i: u32 = 0; i < params.dim; i++) {
    output[off + i] = (input[off + i] - mean) / std;
  }
}`;

    default:
      return `// Passthrough kernel: ${node.name} (${node.op})
@group(0) @binding(0) var<storage, read> input: array<f32>;
@group(0) @binding(1) var<storage, read_write> output: array<f32>;

@compute @workgroup_size(256)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  output[gid.x] = input[gid.x];
}`;
  }
}

export function generateWebGPU(graph: Graph): GeneratedCode {
  const sorted = topologicalSort(graph);
  const kernels: GeneratedKernel[] = [];

  for (const node of sorted) {
    if (node.op === 'Input' || node.op === 'Output' || node.op === 'Constant') continue;

    kernels.push({
      name: `kernel_${node.name}`,
      source: generateWGSLKernel(node),
      op: node.op,
    });
  }

  const source = `// Auto-generated WebGPU WGSL shaders
// Model: ${graph.name}
// Total kernels: ${kernels.length}
//
// Execution order:
${sorted
  .filter(n => n.op !== 'Input' && n.op !== 'Output' && n.op !== 'Constant')
  .map((n, i) => `// ${i + 1}. ${n.op} (${n.name})`)
  .join('\n')}

${kernels.map(k => k.source).join('\n\n')}
`;

  return {
    target: 'webgpu',
    source,
    kernels,
    entryPoint: 'main',
  };
}
