import type { OptimizationPass } from './index';
import type { Graph } from '../ir/graph';
import { getInputEdges } from '../ir/graph';

function runDeadCodeElimination(graph: Graph): Graph {
  // Backward reachability from Output nodes
  const reachable = new Set<string>();
  const queue: string[] = [];

  // Start from all Output nodes
  for (const node of graph.nodes) {
    if (node.op === 'Output') {
      reachable.add(node.id);
      queue.push(node.id);
    }
  }

  // BFS backward through edges
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const inputEdges = getInputEdges(graph, nodeId);
    for (const edge of inputEdges) {
      if (!reachable.has(edge.sourceNodeId)) {
        reachable.add(edge.sourceNodeId);
        queue.push(edge.sourceNodeId);
      }
    }
  }

  // Remove unreachable nodes and their edges
  return {
    ...graph,
    nodes: graph.nodes.filter(n => reachable.has(n.id)),
    edges: graph.edges.filter(e => reachable.has(e.sourceNodeId) && reachable.has(e.targetNodeId)),
  };
}

export const deadCodeEliminationPass: OptimizationPass = {
  name: 'Dead Code Elimination',
  description: 'Remove operations not reachable from any output',
  run: runDeadCodeElimination,
};
