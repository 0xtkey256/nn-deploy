import type { Graph, Node } from '../ir/graph';
import type { TensorType } from '../ir/types';
import { topologicalSort, getInputEdges, getOutputEdges } from '../ir/graph';
import { shapeNumel, tensorByteSize, formatBytes, formatFLOPs } from '../ir/types';

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  opCounts: Record<string, number>;
  totalFLOPs: number;
  totalParams: number;
  totalMemoryBytes: number;
  peakMemoryBytes: number;
  depth: number;
  hasQuantization: boolean;
  layout: string;
}

function estimateFlops(node: Node, inputTypes: (TensorType | undefined)[]): number {
  const first = inputTypes[0];
  if (!first) return 0;

  switch (node.op) {
    case 'MatMul': case 'FusedMatMulAdd': case 'FusedLinearReLU': {
      const second = inputTypes[1];
      if (!first || !second || first.shape.length < 2 || second.shape.length < 2) return 0;
      const M = first.shape[first.shape.length - 2];
      const K = first.shape[first.shape.length - 1];
      const N = second.shape[second.shape.length - 1];
      const batch = first.shape.slice(0, -2).reduce((a, b) => a * b, 1);
      return batch * M * N * (2 * K);
    }

    case 'Conv2D': case 'FusedConvBNReLU': case 'FusedConvBN': {
      const [N, C, H, W] = first.shape;
      const filters = (node.attributes.filters as number) ?? C;
      const kernel = (node.attributes.kernel as number) ?? 3;
      const stride = (node.attributes.stride as number) ?? 1;
      const outH = Math.ceil(H / stride);
      const outW = Math.ceil(W / stride);
      return N * filters * outH * outW * C * kernel * kernel * 2;
    }

    case 'DepthwiseConv2D': {
      const [N, C, H, W] = first.shape;
      const kernel = (node.attributes.kernel as number) ?? 3;
      const stride = (node.attributes.stride as number) ?? 1;
      const outH = Math.ceil(H / stride);
      const outW = Math.ceil(W / stride);
      return N * C * outH * outW * kernel * kernel * 2;
    }

    case 'Add': case 'Sub': case 'Mul': case 'Div':
      return shapeNumel(first.shape);

    case 'ReLU': case 'Sigmoid': case 'Tanh': case 'GELU': case 'SiLU':
      return shapeNumel(first.shape);

    case 'Softmax':
      return shapeNumel(first.shape) * 5; // exp + sum + div

    case 'BatchNorm': case 'LayerNorm': case 'GroupNorm': case 'InstanceNorm':
      return shapeNumel(first.shape) * 4;

    case 'ScaledDotProductAttention': {
      if (first.shape.length < 2) return 0;
      const seqLen = first.shape[first.shape.length - 2];
      const headDim = first.shape[first.shape.length - 1];
      const batch = first.shape.slice(0, -2).reduce((a, b) => a * b, 1);
      return batch * (2 * seqLen * seqLen * headDim + seqLen * seqLen);
    }

    default:
      return 0;
  }
}

function estimateParams(node: Node, inputTypes: (TensorType | undefined)[]): number {
  const first = inputTypes[0];
  if (!first) return 0;

  switch (node.op) {
    case 'Conv2D': case 'FusedConvBNReLU': case 'FusedConvBN': {
      const C = first.shape[1];
      const filters = (node.attributes.filters as number) ?? C;
      const kernel = (node.attributes.kernel as number) ?? 3;
      return filters * C * kernel * kernel + filters; // weights + bias
    }

    case 'DepthwiseConv2D': {
      const C = first.shape[1];
      const kernel = (node.attributes.kernel as number) ?? 3;
      return C * kernel * kernel + C;
    }

    case 'MatMul': case 'FusedMatMulAdd': case 'FusedLinearReLU': {
      const second = inputTypes[1];
      if (!second) return 0;
      return shapeNumel(second.shape);
    }

    case 'BatchNorm': case 'LayerNorm': case 'GroupNorm': case 'InstanceNorm': {
      const C = first.shape[1] ?? first.shape[first.shape.length - 1];
      return C * 4; // gamma, beta, running_mean, running_var
    }

    case 'Embedding': {
      const second = inputTypes[1];
      return second ? shapeNumel(second.shape) : 0;
    }

    default:
      return 0;
  }
}

export function computeMetrics(graph: Graph): GraphMetrics {
  const sorted = topologicalSort(graph);
  const opCounts: Record<string, number> = {};
  let totalFLOPs = 0;
  let totalParams = 0;
  let totalMemoryBytes = 0;
  let peakMemoryBytes = 0;
  let hasQuantization = false;
  let layout = 'NCHW';

  // Compute depth via longest path
  const depth = new Map<string, number>();
  for (const node of sorted) {
    const inputEdges = getInputEdges(graph, node.id);
    const maxParentDepth = inputEdges.reduce((max, e) => {
      return Math.max(max, depth.get(e.sourceNodeId) ?? 0);
    }, 0);
    depth.set(node.id, inputEdges.length > 0 ? maxParentDepth + 1 : 0);
  }

  // Edge type cache
  const edgeTypeCache = new Map<string, TensorType | undefined>();
  for (const edge of graph.edges) {
    edgeTypeCache.set(`${edge.targetNodeId}:${edge.targetPortIndex}`, edge.tensorType);
  }

  for (const node of sorted) {
    opCounts[node.op] = (opCounts[node.op] ?? 0) + 1;

    if (node.attributes._quantized) hasQuantization = true;
    if (node.attributes._layout) layout = node.attributes._layout as string;

    const inputEdges = getInputEdges(graph, node.id);
    const inputTypes = inputEdges.map(e => e.tensorType);

    totalFLOPs += estimateFlops(node, inputTypes);
    totalParams += estimateParams(node, inputTypes);

    // Memory for output tensors
    const outputEdges = getOutputEdges(graph, node.id);
    for (const edge of outputEdges) {
      if (edge.tensorType) {
        totalMemoryBytes += tensorByteSize(edge.tensorType);
      }
    }

    if (node.attributes._peakMemory) {
      peakMemoryBytes = Math.max(peakMemoryBytes, node.attributes._peakMemory as number);
    }
  }

  if (peakMemoryBytes === 0) peakMemoryBytes = totalMemoryBytes;

  const maxDepth = Math.max(0, ...depth.values());

  return {
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    opCounts,
    totalFLOPs,
    totalParams,
    totalMemoryBytes,
    peakMemoryBytes,
    depth: maxDepth,
    hasQuantization,
    layout,
  };
}

export { formatBytes, formatFLOPs };
