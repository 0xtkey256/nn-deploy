import type { OptimizationPass } from './index';
import type { Graph, Node, Edge } from '../ir/graph';
import type { OpType } from '../ir/ops';
import { getInputEdges, getOutputEdges, getConsumers, genId } from '../ir/graph';

interface FusionPattern {
  sequence: OpType[];
  fusedOp: OpType;
  description: string;
}

const FUSION_PATTERNS: FusionPattern[] = [
  { sequence: ['Conv2D', 'BatchNorm', 'ReLU'], fusedOp: 'FusedConvBNReLU', description: 'Conv2D + BatchNorm + ReLU' },
  { sequence: ['Conv2D', 'BatchNorm'], fusedOp: 'FusedConvBN', description: 'Conv2D + BatchNorm' },
  { sequence: ['MatMul', 'Add', 'ReLU'], fusedOp: 'FusedLinearReLU', description: 'MatMul + Add + ReLU' },
  { sequence: ['MatMul', 'Add'], fusedOp: 'FusedMatMulAdd', description: 'MatMul + Add (Linear)' },
];

function findChain(graph: Graph, startNode: Node, pattern: OpType[]): Node[] | null {
  const chain: Node[] = [startNode];

  for (let i = 1; i < pattern.length; i++) {
    const current = chain[chain.length - 1];
    const consumers = getConsumers(graph, current.id);

    // Must have exactly one consumer for fusion
    if (consumers.length !== 1) return null;

    const next = consumers[0];
    if (next.op !== pattern[i]) return null;

    // The consumer must only have one producer from this chain
    // (other inputs like bias are allowed)
    const nextInputEdges = getInputEdges(graph, next.id);
    const fromChain = nextInputEdges.filter(e => e.sourceNodeId === current.id);
    if (fromChain.length !== 1) return null;

    chain.push(next);
  }

  return chain;
}

function fuseChain(graph: Graph, chain: Node[], pattern: FusionPattern): Graph {
  const first = chain[0];
  const last = chain[chain.length - 1];

  // Merge attributes from all nodes in chain
  const mergedAttrs = { ...first.attributes };
  for (let i = 1; i < chain.length; i++) {
    for (const [k, v] of Object.entries(chain[i].attributes)) {
      mergedAttrs[`_${chain[i].op.toLowerCase()}_${k}`] = v;
    }
  }
  mergedAttrs._fusedFrom = chain.map(n => n.op).join('+');

  // Create fused node
  const fusedId = genId('fused');
  const fusedNode: Node = {
    id: fusedId,
    op: pattern.fusedOp,
    name: `fused_${first.name}`,
    inputs: [...first.inputs],
    outputs: last.outputs.length > 0 ? [...last.outputs] : [{ name: `fused_${first.name}` }],
    attributes: mergedAttrs,
  };

  // Collect all external inputs to the chain
  const chainIds = new Set(chain.map(n => n.id));
  const externalInputEdges: Edge[] = [];
  for (const node of chain) {
    for (const edge of getInputEdges(graph, node.id)) {
      if (!chainIds.has(edge.sourceNodeId)) {
        externalInputEdges.push(edge);
      }
    }
  }

  // Rewire: external inputs → fused node
  const newInputEdges = externalInputEdges.map((e, i) => ({
    ...e,
    id: genId('e'),
    targetNodeId: fusedId,
    targetPortIndex: i,
  }));

  // Rewire: fused node → consumers of last node
  const lastOutputEdges = getOutputEdges(graph, last.id).filter(e => !chainIds.has(e.targetNodeId));
  const newOutputEdges = lastOutputEdges.map(e => ({
    ...e,
    id: genId('e'),
    sourceNodeId: fusedId,
    sourcePortIndex: 0,
  }));

  // Remove chain nodes and their internal edges
  const internalEdgeIds = new Set<string>();
  for (const node of chain) {
    for (const edge of graph.edges) {
      if (chainIds.has(edge.sourceNodeId) && chainIds.has(edge.targetNodeId)) {
        internalEdgeIds.add(edge.id);
      }
    }
  }

  return {
    ...graph,
    nodes: [
      ...graph.nodes.filter(n => !chainIds.has(n.id)),
      fusedNode,
    ],
    edges: [
      ...graph.edges.filter(e =>
        !internalEdgeIds.has(e.id) &&
        !chainIds.has(e.sourceNodeId) &&
        !chainIds.has(e.targetNodeId)
      ),
      ...newInputEdges,
      ...newOutputEdges,
    ],
  };
}

function runOperatorFusion(graph: Graph): Graph {
  let result = { ...graph };
  let changed = true;

  while (changed) {
    changed = false;
    for (const pattern of FUSION_PATTERNS) {
      for (const node of result.nodes) {
        if (node.op !== pattern.sequence[0]) continue;

        const chain = findChain(result, node, pattern.sequence);
        if (chain) {
          result = fuseChain(result, chain, pattern);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }

  return result;
}

export const operatorFusionPass: OptimizationPass = {
  name: 'Operator Fusion',
  description: 'Fuse compatible operation sequences into single optimized kernels',
  run: runOperatorFusion,
};
