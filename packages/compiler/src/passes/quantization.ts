import type { OptimizationPass } from './index';
import type { Graph, Node } from '../ir/graph';
import type { DataType, TensorType } from '../ir/types';

// Ops eligible for quantization
const QUANTIZABLE_OPS = new Set([
  'MatMul', 'Conv2D', 'DepthwiseConv2D', 'Add',
  'FusedConvBNReLU', 'FusedConvBN', 'FusedMatMulAdd', 'FusedLinearReLU',
]);

function quantizeNode(node: Node, targetDtype: DataType): Node {
  return {
    ...node,
    attributes: {
      ...node.attributes,
      _quantized: true,
      _originalDtype: 'float32',
      _quantDtype: targetDtype,
      _quantScheme: 'symmetric',
      _quantBits: targetDtype === 'int8' ? 8 : 4,
    },
    outputs: node.outputs.map(out => ({
      ...out,
      tensorType: out.tensorType
        ? { ...out.tensorType, dtype: targetDtype }
        : undefined,
    })),
  };
}

function runQuantization(graph: Graph): Graph {
  const targetDtype: DataType = 'int8';

  const newNodes: Node[] = graph.nodes.map(node => {
    if (!QUANTIZABLE_OPS.has(node.op)) return node;
    return quantizeNode(node, targetDtype);
  });

  // Update edge tensor types for quantized paths
  const quantizedNodeIds = new Set(
    newNodes.filter(n => n.attributes._quantized).map(n => n.id)
  );

  const newEdges = graph.edges.map(edge => {
    if (quantizedNodeIds.has(edge.sourceNodeId) && edge.tensorType) {
      return {
        ...edge,
        tensorType: { ...edge.tensorType, dtype: targetDtype } as TensorType,
      };
    }
    return edge;
  });

  return { ...graph, nodes: newNodes, edges: newEdges };
}

export const quantizationPass: OptimizationPass = {
  name: 'Quantization',
  description: 'Convert float32 weights and activations to int8 for faster inference',
  run: runQuantization,
};
