import type { TensorType } from './types';
import type { OpType } from './ops';

// Named input/output port on a node
export interface Port {
  name: string;
  tensorType?: TensorType;
}

// Attributes are key-value pairs for operation parameters
export type AttributeValue = string | number | boolean | number[];
export type Attributes = Record<string, AttributeValue>;

// A node in the computation graph
export interface Node {
  id: string;
  op: OpType;
  name: string;
  inputs: Port[];
  outputs: Port[];
  attributes: Attributes;
}

// An edge connecting two nodes
export interface Edge {
  id: string;
  sourceNodeId: string;
  sourcePortIndex: number;
  targetNodeId: string;
  targetPortIndex: number;
  tensorType?: TensorType;
}

// Record of an optimization pass applied
export interface PassRecord {
  name: string;
  description: string;
  timestamp: number;
}

// The immutable computation graph
export interface Graph {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  passHistory: PassRecord[];
}

// --- ID generation ---

let _counter = 0;
export function genId(prefix: string): string {
  return `${prefix}_${++_counter}`;
}

export function resetIdCounter(): void {
  _counter = 0;
}

// --- Graph construction (immutable - returns new graphs) ---

export function createGraph(name: string): Graph {
  return {
    id: genId('g'),
    name,
    nodes: [],
    edges: [],
    passHistory: [],
  };
}

export function addNode(graph: Graph, node: Omit<Node, 'id'>): { graph: Graph; nodeId: string } {
  const id = genId('n');
  const newNode: Node = { ...node, id };
  return {
    graph: { ...graph, nodes: [...graph.nodes, newNode] },
    nodeId: id,
  };
}

export function removeNode(graph: Graph, nodeId: string): Graph {
  return {
    ...graph,
    nodes: graph.nodes.filter(n => n.id !== nodeId),
    edges: graph.edges.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId),
  };
}

export function updateNode(graph: Graph, nodeId: string, updates: Partial<Omit<Node, 'id'>>): Graph {
  return {
    ...graph,
    nodes: graph.nodes.map(n => (n.id === nodeId ? { ...n, ...updates } : n)),
  };
}

export function addEdge(
  graph: Graph,
  sourceNodeId: string,
  sourcePortIndex: number,
  targetNodeId: string,
  targetPortIndex: number,
  tensorType?: TensorType,
): { graph: Graph; edgeId: string } {
  const id = genId('e');
  const newEdge: Edge = { id, sourceNodeId, sourcePortIndex, targetNodeId, targetPortIndex, tensorType };
  return {
    graph: { ...graph, edges: [...graph.edges, newEdge] },
    edgeId: id,
  };
}

export function removeEdge(graph: Graph, edgeId: string): Graph {
  return {
    ...graph,
    edges: graph.edges.filter(e => e.id !== edgeId),
  };
}

export function recordPass(graph: Graph, name: string, description: string): Graph {
  return {
    ...graph,
    passHistory: [...graph.passHistory, { name, description, timestamp: Date.now() }],
  };
}

// --- Graph queries ---

export function getNode(graph: Graph, nodeId: string): Node | undefined {
  return graph.nodes.find(n => n.id === nodeId);
}

export function getInputEdges(graph: Graph, nodeId: string): Edge[] {
  return graph.edges.filter(e => e.targetNodeId === nodeId);
}

export function getOutputEdges(graph: Graph, nodeId: string): Edge[] {
  return graph.edges.filter(e => e.sourceNodeId === nodeId);
}

export function getProducers(graph: Graph, nodeId: string): Node[] {
  const inputEdges = getInputEdges(graph, nodeId);
  return inputEdges
    .map(e => graph.nodes.find(n => n.id === e.sourceNodeId))
    .filter((n): n is Node => n !== undefined);
}

export function getConsumers(graph: Graph, nodeId: string): Node[] {
  const outputEdges = getOutputEdges(graph, nodeId);
  return outputEdges
    .map(e => graph.nodes.find(n => n.id === e.targetNodeId))
    .filter((n): n is Node => n !== undefined);
}

export function topologicalSort(graph: Graph): Node[] {
  const inDegree = new Map<string, number>();
  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
  }

  const queue: Node[] = [];
  for (const node of graph.nodes) {
    if ((inDegree.get(node.id) ?? 0) === 0) {
      queue.push(node);
    }
  }

  const sorted: Node[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const edge of getOutputEdges(graph, node.id)) {
      const deg = (inDegree.get(edge.targetNodeId) ?? 1) - 1;
      inDegree.set(edge.targetNodeId, deg);
      if (deg === 0) {
        const target = graph.nodes.find(n => n.id === edge.targetNodeId);
        if (target) queue.push(target);
      }
    }
  }

  return sorted;
}

export function cloneGraph(graph: Graph): Graph {
  return JSON.parse(JSON.stringify(graph));
}

export function getNodesByOp(graph: Graph, op: OpType): Node[] {
  return graph.nodes.filter(n => n.op === op);
}

export function isInput(node: Node): boolean {
  return node.op === 'Input';
}

export function isOutput(node: Node): boolean {
  return node.op === 'Output';
}

export function isConstant(node: Node): boolean {
  return node.op === 'Constant';
}
