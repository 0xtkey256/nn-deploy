import type { OpType } from '../ir/ops';
import type { DataType, TensorType } from '../ir/types';
import {
  type Graph,
  type Attributes,
  createGraph,
  addNode,
  addEdge,
  resetIdCounter,
} from '../ir/graph';

// ONNX-like JSON model format
export interface JsonModelNode {
  name: string;
  op: string;
  inputs: string[];
  attributes?: Record<string, unknown>;
  tensorType?: {
    dtype: string;
    shape: number[];
    layout?: string;
  };
}

export interface JsonModel {
  name: string;
  inputs: {
    name: string;
    dtype: string;
    shape: number[];
    layout?: string;
  }[];
  outputs: string[];
  nodes: JsonModelNode[];
}

export function parseOnnxJson(json: JsonModel): Graph {
  resetIdCounter();
  let graph = createGraph(json.name);
  const nameToNodeId = new Map<string, string>();

  // Add input nodes
  for (const inp of json.inputs) {
    const tensorType: TensorType = {
      dtype: inp.dtype as DataType,
      shape: inp.shape,
      layout: inp.layout as TensorType['layout'],
    };
    const result = addNode(graph, {
      op: 'Input',
      name: inp.name,
      inputs: [],
      outputs: [{ name: inp.name, tensorType }],
      attributes: {},
    });
    graph = result.graph;
    nameToNodeId.set(inp.name, result.nodeId);
  }

  // Add operation nodes
  for (const node of json.nodes) {
    const attrs: Attributes = {};
    if (node.attributes) {
      for (const [k, v] of Object.entries(node.attributes)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          attrs[k] = v;
        } else if (Array.isArray(v) && v.every(x => typeof x === 'number')) {
          attrs[k] = v as number[];
        }
      }
    }

    const tensorType: TensorType | undefined = node.tensorType
      ? {
          dtype: node.tensorType.dtype as DataType,
          shape: node.tensorType.shape,
          layout: node.tensorType.layout as TensorType['layout'],
        }
      : undefined;

    const inputs = node.inputs.map(name => ({ name }));
    const result = addNode(graph, {
      op: node.op as OpType,
      name: node.name,
      inputs,
      outputs: [{ name: node.name, tensorType }],
      attributes: attrs,
    });
    graph = result.graph;
    nameToNodeId.set(node.name, result.nodeId);

    // Add edges from inputs
    for (let i = 0; i < node.inputs.length; i++) {
      const sourceId = nameToNodeId.get(node.inputs[i]);
      if (sourceId) {
        const edgeResult = addEdge(graph, sourceId, 0, result.nodeId, i);
        graph = edgeResult.graph;
      }
    }
  }

  // Add output nodes
  for (const outName of json.outputs) {
    const result = addNode(graph, {
      op: 'Output',
      name: `out_${outName}`,
      inputs: [{ name: outName }],
      outputs: [],
      attributes: {},
    });
    graph = result.graph;

    const sourceId = nameToNodeId.get(outName);
    if (sourceId) {
      const edgeResult = addEdge(graph, sourceId, 0, result.nodeId, 0);
      graph = edgeResult.graph;
    }
  }

  return graph;
}
