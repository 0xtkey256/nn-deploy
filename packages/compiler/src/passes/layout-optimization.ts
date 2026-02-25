import type { OptimizationPass } from './index';
import type { Graph, Node, Edge } from '../ir/graph';
import type { Layout, TensorType } from '../ir/types';
import { genId } from '../ir/graph';

// Ops that benefit from NHWC layout (common for WebGPU/mobile)
const NHWC_PREFERRED_OPS = new Set([
  'Conv2D', 'DepthwiseConv2D', 'ConvTranspose2D',
  'MaxPool2D', 'AvgPool2D', 'GlobalAvgPool', 'AdaptiveAvgPool',
  'BatchNorm', 'InstanceNorm', 'GroupNorm',
  'FusedConvBNReLU', 'FusedConvBN',
]);

function transposeShape(shape: number[], from: Layout, to: Layout): number[] {
  if (from === to || shape.length !== 4) return shape;
  if (from === 'NCHW' && to === 'NHWC') {
    return [shape[0], shape[2], shape[3], shape[1]]; // N,C,H,W → N,H,W,C
  }
  return [shape[0], shape[3], shape[1], shape[2]]; // N,H,W,C → N,C,H,W
}

function runLayoutOptimization(graph: Graph): Graph {
  const targetLayout: Layout = 'NHWC';
  const convertedNodes = new Set<string>();

  // Determine which nodes should be converted
  for (const node of graph.nodes) {
    if (NHWC_PREFERRED_OPS.has(node.op)) {
      convertedNodes.add(node.id);
    }
  }

  if (convertedNodes.size === 0) return graph;

  // Update nodes with new layout
  const newNodes: Node[] = graph.nodes.map(node => {
    if (!convertedNodes.has(node.id)) return node;

    return {
      ...node,
      attributes: {
        ...node.attributes,
        _layout: targetLayout,
        _layoutConverted: true,
      },
      outputs: node.outputs.map(out => ({
        ...out,
        tensorType: out.tensorType
          ? {
              ...out.tensorType,
              shape: transposeShape(out.tensorType.shape, out.tensorType.layout ?? 'NCHW', targetLayout),
              layout: targetLayout,
            }
          : undefined,
      })),
    };
  });

  // Update edge types
  const newEdges: Edge[] = graph.edges.map(edge => {
    if (!edge.tensorType) return edge;
    if (convertedNodes.has(edge.sourceNodeId)) {
      return {
        ...edge,
        tensorType: {
          ...edge.tensorType,
          shape: transposeShape(edge.tensorType.shape, edge.tensorType.layout ?? 'NCHW', targetLayout),
          layout: targetLayout,
        },
      };
    }
    return edge;
  });

  return { ...graph, nodes: newNodes, edges: newEdges };
}

export const layoutOptimizationPass: OptimizationPass = {
  name: 'Layout Optimization',
  description: 'Convert tensor layouts from NCHW to NHWC for optimal GPU execution',
  run: runLayoutOptimization,
};
