import type { OptimizationPass } from './index';
import type { TensorType } from '../ir/types';
import type { Node, Graph, Edge } from '../ir/graph';
import { topologicalSort, getInputEdges } from '../ir/graph';

function inferOutputShape(node: Node, inputTypes: (TensorType | undefined)[]): TensorType | undefined {
  const first = inputTypes[0];
  if (!first) return undefined;

  switch (node.op) {
    // Pass-through shape ops
    case 'ReLU': case 'GELU': case 'Sigmoid': case 'Tanh': case 'SiLU':
    case 'BatchNorm': case 'LayerNorm': case 'GroupNorm': case 'InstanceNorm':
    case 'Add': case 'Sub': case 'Mul': case 'Div':
      return { ...first };

    case 'Softmax':
      return { ...first };

    case 'MatMul': {
      const second = inputTypes[1];
      if (!first || !second) return undefined;
      const a = first.shape;
      const b = second.shape;
      if (a.length < 2 || b.length < 2) return undefined;
      const outShape = [...a.slice(0, -1), b[b.length - 1]];
      return { dtype: first.dtype, shape: outShape, layout: first.layout };
    }

    case 'Conv2D': case 'DepthwiseConv2D': {
      const [N, C, H, W] = first.layout === 'NHWC'
        ? [first.shape[0], first.shape[3], first.shape[1], first.shape[2]]
        : [first.shape[0], first.shape[1], first.shape[2], first.shape[3]];
      const filters = (node.attributes.filters as number) ?? C;
      const kernel = (node.attributes.kernel as number) ?? 3;
      const stride = (node.attributes.stride as number) ?? 1;
      const padding = (node.attributes.padding as string) ?? 'valid';

      let outH: number, outW: number;
      if (padding === 'same') {
        outH = Math.ceil(H / stride);
        outW = Math.ceil(W / stride);
      } else {
        outH = Math.floor((H - kernel) / stride) + 1;
        outW = Math.floor((W - kernel) / stride) + 1;
      }

      const outC = node.op === 'DepthwiseConv2D' ? C : filters;
      const shape = first.layout === 'NHWC'
        ? [N, outH, outW, outC]
        : [N, outC, outH, outW];

      return { dtype: first.dtype, shape, layout: first.layout };
    }

    case 'ConvTranspose2D': {
      const [N, , H, W] = first.shape;
      const filters = (node.attributes.filters as number) ?? first.shape[1];
      const kernel = (node.attributes.kernel as number) ?? 3;
      const stride = (node.attributes.stride as number) ?? 1;
      const outH = (H - 1) * stride + kernel;
      const outW = (W - 1) * stride + kernel;
      return { dtype: first.dtype, shape: [N, filters, outH, outW], layout: first.layout };
    }

    case 'MaxPool2D': case 'AvgPool2D': {
      const [N, C, H, W] = first.shape;
      const kernel = (node.attributes.kernel as number) ?? 2;
      const stride = (node.attributes.stride as number) ?? kernel;
      const outH = Math.floor((H - kernel) / stride) + 1;
      const outW = Math.floor((W - kernel) / stride) + 1;
      return { dtype: first.dtype, shape: [N, C, outH, outW], layout: first.layout };
    }

    case 'GlobalAvgPool': {
      const [N, C] = first.shape;
      return { dtype: first.dtype, shape: [N, C, 1, 1], layout: first.layout };
    }

    case 'AdaptiveAvgPool': {
      const [N, C] = first.shape;
      const outputSize = (node.attributes.output_size as number[]) ?? [1, 1];
      return { dtype: first.dtype, shape: [N, C, ...outputSize], layout: first.layout };
    }

    case 'Reshape': {
      const shape = node.attributes.shape as number[] | undefined;
      if (!shape) return undefined;
      return { dtype: first.dtype, shape, layout: first.layout };
    }

    case 'Transpose': {
      const perm = node.attributes.perm as number[] | undefined;
      if (!perm) return { dtype: first.dtype, shape: [...first.shape].reverse(), layout: first.layout };
      return { dtype: first.dtype, shape: perm.map(i => first.shape[i]), layout: first.layout };
    }

    case 'Flatten': {
      const [batch, ...rest] = first.shape;
      return { dtype: first.dtype, shape: [batch, rest.reduce((a, b) => a * b, 1)] };
    }

    case 'Concat': {
      const axis = (node.attributes.axis as number) ?? 0;
      const shapes = inputTypes.filter((t): t is TensorType => t !== undefined).map(t => t.shape);
      if (shapes.length === 0) return undefined;
      const outShape = [...shapes[0]];
      outShape[axis] = shapes.reduce((sum, s) => sum + s[axis], 0);
      return { dtype: first.dtype, shape: outShape, layout: first.layout };
    }

    case 'Squeeze': {
      const axes = node.attributes.axes as number[] | undefined;
      const shape = axes
        ? first.shape.filter((_, i) => !axes.includes(i))
        : first.shape.filter(d => d !== 1);
      return { dtype: first.dtype, shape, layout: first.layout };
    }

    case 'Unsqueeze': {
      const axes = node.attributes.axes as number[] | undefined;
      if (!axes) return undefined;
      const shape = [...first.shape];
      for (const ax of axes.sort()) shape.splice(ax, 0, 1);
      return { dtype: first.dtype, shape, layout: first.layout };
    }

    case 'ReduceSum': case 'ReduceMean': case 'ReduceMax': {
      const axes = node.attributes.axes as number[] | undefined;
      const keepdims = (node.attributes.keepdims as boolean) ?? true;
      if (!axes) return undefined;
      const shape = first.shape.map((d, i) =>
        axes.includes(i) ? (keepdims ? 1 : -1) : d
      ).filter(d => d !== -1);
      return { dtype: first.dtype, shape, layout: first.layout };
    }

    case 'Embedding': {
      const second = inputTypes[1];
      if (!second) return undefined;
      const vocabSize = second.shape[0];
      const embDim = second.shape[1];
      return { dtype: second.dtype, shape: [...first.shape, embDim] };
    }

    case 'ScaledDotProductAttention': {
      // Q, K, V → output shape same as Q
      return first ? { ...first } : undefined;
    }

    // Fused ops
    case 'FusedConvBNReLU': case 'FusedConvBN': {
      const [N, , H, W] = first.shape;
      const filters = (node.attributes.filters as number) ?? first.shape[1];
      const kernel = (node.attributes.kernel as number) ?? 3;
      const stride = (node.attributes.stride as number) ?? 1;
      const padding = (node.attributes.padding as string) ?? 'valid';
      let outH: number, outW: number;
      if (padding === 'same') {
        outH = Math.ceil(H / stride);
        outW = Math.ceil(W / stride);
      } else {
        outH = Math.floor((H - kernel) / stride) + 1;
        outW = Math.floor((W - kernel) / stride) + 1;
      }
      return { dtype: first.dtype, shape: [N, filters, outH, outW], layout: first.layout };
    }

    case 'FusedMatMulAdd': case 'FusedLinearReLU': {
      const second = inputTypes[1];
      if (!second) return undefined;
      const outShape = [...first.shape.slice(0, -1), second.shape[second.shape.length - 1]];
      return { dtype: first.dtype, shape: outShape, layout: first.layout };
    }

    default:
      return first ? { ...first } : undefined;
  }
}

function runShapeInference(graph: Graph): Graph {
  const sorted = topologicalSort(graph);
  const edgeTypes = new Map<string, TensorType>();
  let result = { ...graph, edges: [...graph.edges] };

  for (const node of sorted) {
    if (node.op === 'Input') {
      const outputType = node.outputs[0]?.tensorType;
      if (outputType) {
        for (const edge of graph.edges.filter(e => e.sourceNodeId === node.id)) {
          edgeTypes.set(edge.id, outputType);
        }
      }
      continue;
    }

    // Gather input types
    const inputEdges = getInputEdges(graph, node.id);
    const inputTypes = inputEdges.map(e => edgeTypes.get(e.id) ?? e.tensorType);

    // Infer output
    const outputType = inferOutputShape(node, inputTypes);
    if (outputType) {
      for (const edge of graph.edges.filter(e => e.sourceNodeId === node.id)) {
        edgeTypes.set(edge.id, outputType);
      }
    }
  }

  // Apply inferred types to edges
  const newEdges: Edge[] = result.edges.map(e => {
    const inferred = edgeTypes.get(e.id);
    return inferred ? { ...e, tensorType: inferred } : e;
  });

  return { ...result, edges: newEdges };
}

export const shapeInferencePass: OptimizationPass = {
  name: 'Shape Inference',
  description: 'Propagate tensor shapes through the graph using operation semantics',
  run: runShapeInference,
};
