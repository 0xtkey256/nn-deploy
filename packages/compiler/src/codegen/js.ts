import type { Graph, Node } from '../ir/graph';
import type { Schedule, ScheduledOp, MemoryBlock, KernelBinding } from '../ir/schedule';
import type { GeneratedCode, GeneratedKernel } from './types';
import { topologicalSort, getInputEdges, getOutputEdges } from '../ir/graph';
import { tensorByteSize, shapeNumel } from '../ir/types';
import { genId } from '../ir/graph';

function generateKernelJS(node: Node): string {
  switch (node.op) {
    case 'MatMul': case 'FusedMatMulAdd': case 'FusedLinearReLU':
      return `
function kernel_${node.name}(inputs, output) {
  // MatMul: C = A @ B
  const A = inputs[0], B = inputs[1];
  const M = A.shape[A.shape.length - 2];
  const K = A.shape[A.shape.length - 1];
  const N = B.shape[B.shape.length - 1];
  for (let m = 0; m < M; m++) {
    for (let n = 0; n < N; n++) {
      let sum = 0;
      for (let k = 0; k < K; k++) {
        sum += A.data[m * K + k] * B.data[k * N + n];
      }
      ${node.op === 'FusedMatMulAdd' || node.op === 'FusedLinearReLU' ? 'sum += inputs[2].data[n]; // bias' : ''}
      ${node.op === 'FusedLinearReLU' ? 'sum = Math.max(0, sum); // ReLU' : ''}
      output.data[m * N + n] = sum;
    }
  }
}`;

    case 'Conv2D': case 'FusedConvBNReLU': case 'FusedConvBN':
      return `
function kernel_${node.name}(inputs, output) {
  // Conv2D: NCHW format
  const X = inputs[0], W = inputs[1];
  const [N, C, H, Wid] = X.shape;
  const F = ${node.attributes.filters ?? 'C'};
  const K = ${node.attributes.kernel ?? 3};
  const S = ${node.attributes.stride ?? 1};
  const outH = Math.floor((H - K) / S) + 1;
  const outW = Math.floor((Wid - K) / S) + 1;
  for (let n = 0; n < N; n++) {
    for (let f = 0; f < F; f++) {
      for (let oh = 0; oh < outH; oh++) {
        for (let ow = 0; ow < outW; ow++) {
          let sum = 0;
          for (let c = 0; c < C; c++) {
            for (let kh = 0; kh < K; kh++) {
              for (let kw = 0; kw < K; kw++) {
                const ih = oh * S + kh, iw = ow * S + kw;
                sum += X.data[((n * C + c) * H + ih) * Wid + iw] *
                       W.data[((f * C + c) * K + kh) * K + kw];
              }
            }
          }
          ${node.op.includes('ReLU') ? 'sum = Math.max(0, sum);' : ''}
          output.data[((n * F + f) * outH + oh) * outW + ow] = sum;
        }
      }
    }
  }
}`;

    case 'ReLU':
      return `
function kernel_${node.name}(inputs, output) {
  const x = inputs[0];
  for (let i = 0; i < x.data.length; i++) {
    output.data[i] = Math.max(0, x.data[i]);
  }
}`;

    case 'GELU':
      return `
function kernel_${node.name}(inputs, output) {
  const x = inputs[0];
  for (let i = 0; i < x.data.length; i++) {
    const v = x.data[i];
    output.data[i] = 0.5 * v * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (v + 0.044715 * v * v * v)));
  }
}`;

    case 'Sigmoid':
      return `
function kernel_${node.name}(inputs, output) {
  const x = inputs[0];
  for (let i = 0; i < x.data.length; i++) {
    output.data[i] = 1 / (1 + Math.exp(-x.data[i]));
  }
}`;

    case 'Softmax':
      return `
function kernel_${node.name}(inputs, output) {
  const x = inputs[0];
  const lastDim = x.shape[x.shape.length - 1];
  const batches = x.data.length / lastDim;
  for (let b = 0; b < batches; b++) {
    const off = b * lastDim;
    let max = -Infinity;
    for (let i = 0; i < lastDim; i++) max = Math.max(max, x.data[off + i]);
    let sum = 0;
    for (let i = 0; i < lastDim; i++) { output.data[off + i] = Math.exp(x.data[off + i] - max); sum += output.data[off + i]; }
    for (let i = 0; i < lastDim; i++) output.data[off + i] /= sum;
  }
}`;

    case 'Add':
      return `
function kernel_${node.name}(inputs, output) {
  const a = inputs[0], b = inputs[1];
  for (let i = 0; i < a.data.length; i++) {
    output.data[i] = a.data[i] + (b.data[i % b.data.length] ?? 0);
  }
}`;

    case 'LayerNorm':
      return `
function kernel_${node.name}(inputs, output) {
  const x = inputs[0];
  const lastDim = x.shape[x.shape.length - 1];
  const batches = x.data.length / lastDim;
  const eps = 1e-5;
  for (let b = 0; b < batches; b++) {
    const off = b * lastDim;
    let mean = 0;
    for (let i = 0; i < lastDim; i++) mean += x.data[off + i];
    mean /= lastDim;
    let variance = 0;
    for (let i = 0; i < lastDim; i++) variance += (x.data[off + i] - mean) ** 2;
    variance /= lastDim;
    const std = Math.sqrt(variance + eps);
    for (let i = 0; i < lastDim; i++) output.data[off + i] = (x.data[off + i] - mean) / std;
  }
}`;

    case 'Reshape': case 'Flatten': case 'Squeeze': case 'Unsqueeze':
      return `
function kernel_${node.name}(inputs, output) {
  const x = inputs[0];
  for (let i = 0; i < x.data.length; i++) output.data[i] = x.data[i];
}`;

    case 'MaxPool2D':
      return `
function kernel_${node.name}(inputs, output) {
  const x = inputs[0];
  const [N, C, H, W] = x.shape;
  const K = ${node.attributes.kernel ?? 2};
  const S = ${node.attributes.stride ?? node.attributes.kernel ?? 2};
  const outH = Math.floor((H - K) / S) + 1;
  const outW = Math.floor((W - K) / S) + 1;
  for (let n = 0; n < N; n++) {
    for (let c = 0; c < C; c++) {
      for (let oh = 0; oh < outH; oh++) {
        for (let ow = 0; ow < outW; ow++) {
          let max = -Infinity;
          for (let kh = 0; kh < K; kh++) {
            for (let kw = 0; kw < K; kw++) {
              max = Math.max(max, x.data[((n*C+c)*H + oh*S+kh)*W + ow*S+kw]);
            }
          }
          output.data[((n*C+c)*outH+oh)*outW+ow] = max;
        }
      }
    }
  }
}`;

    case 'GlobalAvgPool':
      return `
function kernel_${node.name}(inputs, output) {
  const x = inputs[0];
  const [N, C, H, W] = x.shape;
  for (let n = 0; n < N; n++) {
    for (let c = 0; c < C; c++) {
      let sum = 0;
      for (let h = 0; h < H; h++) for (let w = 0; w < W; w++) sum += x.data[((n*C+c)*H+h)*W+w];
      output.data[n*C+c] = sum / (H * W);
    }
  }
}`;

    default:
      return `
function kernel_${node.name}(inputs, output) {
  // Passthrough for ${node.op}
  if (inputs[0]) for (let i = 0; i < inputs[0].data.length; i++) output.data[i] = inputs[0].data[i];
}`;
  }
}

export function generateJS(graph: Graph): GeneratedCode {
  const sorted = topologicalSort(graph);
  const kernels: GeneratedKernel[] = [];
  const execOrder: string[] = [];

  for (const node of sorted) {
    if (node.op === 'Input' || node.op === 'Output' || node.op === 'Constant') continue;

    const kernelSource = generateKernelJS(node);
    kernels.push({
      name: `kernel_${node.name}`,
      source: kernelSource,
      op: node.op,
    });
    execOrder.push(node.name);
  }

  const source = `// Auto-generated JS inference runtime
// Model: ${graph.name}
// Nodes: ${graph.nodes.length}, Edges: ${graph.edges.length}

class Tensor {
  constructor(data, shape) {
    this.data = data instanceof Float32Array ? data : new Float32Array(data);
    this.shape = shape;
  }
}

${kernels.map(k => k.source).join('\n')}

function run(inputs) {
  const tensors = { ...inputs };
  // Initialize constant/weight tensors with random data
  ${sorted
    .filter(n => n.op === 'Constant')
    .map(n => {
      const outEdge = getOutputEdges(graph, n.id)[0];
      const shape = outEdge?.tensorType?.shape;
      const size = shape ? shapeNumel(shape) : 64;
      const shapeStr = shape ? JSON.stringify(shape) : '[64]';
      return `  tensors['${n.name}'] = new Tensor(Float32Array.from({length:${size}}, () => (Math.random()-0.5)*0.1), ${shapeStr});`;
    })
    .join('\n')}
  ${sorted
    .filter(n => n.op !== 'Input' && n.op !== 'Output' && n.op !== 'Constant')
    .map(n => {
      const inputEdges = getInputEdges(graph, n.id);
      const inputNames = inputEdges.map(e => {
        const src = graph.nodes.find(nd => nd.id === e.sourceNodeId);
        return src?.name ?? 'unknown';
      });
      const outEdge = getOutputEdges(graph, n.id)[0];
      const outShape = outEdge?.tensorType?.shape;
      const outSize = outShape ? shapeNumel(outShape) : 0;
      const shapeStr = outShape ? JSON.stringify(outShape) : 'null';
      return `  // ${n.op}: ${n.name}
  {
    const _inputs = [${inputNames.map(name => `tensors['${name}']`).join(', ')}];
    const _shape = ${shapeStr} || (_inputs[0] ? _inputs[0].shape : [1]);
    const _size = ${outSize || '_shape.reduce((a,b) => a * b, 1)'};
    tensors['${n.name}'] = new Tensor(new Float32Array(_size), _shape);
    kernel_${n.name}(_inputs, tensors['${n.name}']);
  }`;
    })
    .join('\n')}
  return tensors;
}
`;

  return {
    target: 'js',
    source,
    kernels,
    entryPoint: 'run',
  };
}
