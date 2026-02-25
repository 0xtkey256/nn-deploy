import type { OptimizationPass } from './index';
import type { Graph, Node } from '../ir/graph';
import { topologicalSort, getInputEdges, getOutputEdges } from '../ir/graph';
import { tensorByteSize } from '../ir/types';

interface MemoryAllocation {
  nodeId: string;
  outputIndex: number;
  offset: number;
  size: number;
  firstUse: number;
  lastUse: number;
}

function runMemoryPlanning(graph: Graph): Graph {
  const sorted = topologicalSort(graph);
  const nodeOrder = new Map<string, number>();
  sorted.forEach((node, i) => nodeOrder.set(node.id, i));

  // Compute liveness: for each edge, when is it first produced and last consumed
  const allocations: MemoryAllocation[] = [];

  for (const node of sorted) {
    if (node.op === 'Input' || node.op === 'Output') continue;

    const outputEdges = getOutputEdges(graph, node.id);
    for (let oi = 0; oi < Math.max(1, outputEdges.length); oi++) {
      const relevantEdges = outputEdges.filter(e => e.sourcePortIndex === oi);
      if (relevantEdges.length === 0) continue;

      const tensorType = relevantEdges[0].tensorType;
      if (!tensorType) continue;

      const firstUse = nodeOrder.get(node.id) ?? 0;
      let lastUse = firstUse;
      for (const edge of relevantEdges) {
        const consumerOrder = nodeOrder.get(edge.targetNodeId) ?? 0;
        lastUse = Math.max(lastUse, consumerOrder);
      }

      allocations.push({
        nodeId: node.id,
        outputIndex: oi,
        offset: 0,
        size: tensorByteSize(tensorType),
        firstUse,
        lastUse,
      });
    }
  }

  // Greedy offset assignment (first-fit decreasing)
  allocations.sort((a, b) => b.size - a.size);

  const assigned: MemoryAllocation[] = [];
  for (const alloc of allocations) {
    // Find the smallest offset where this allocation doesn't overlap with live allocations
    let offset = 0;
    const conflicts = assigned.filter(a =>
      a.lastUse >= alloc.firstUse && a.firstUse <= alloc.lastUse
    ).sort((a, b) => a.offset - b.offset);

    for (const conflict of conflicts) {
      if (offset + alloc.size <= conflict.offset) break;
      offset = conflict.offset + conflict.size;
    }

    alloc.offset = offset;
    assigned.push(alloc);
  }

  // Compute peak memory
  const peakMemory = assigned.reduce((max, a) => Math.max(max, a.offset + a.size), 0);

  // Store memory plan in graph attributes via nodes
  const memoryMap = new Map<string, { offset: number; size: number; peak: number }>();
  for (const alloc of assigned) {
    memoryMap.set(`${alloc.nodeId}:${alloc.outputIndex}`, {
      offset: alloc.offset,
      size: alloc.size,
      peak: peakMemory,
    });
  }

  // Annotate nodes with memory offsets
  const newNodes: Node[] = graph.nodes.map(node => {
    const memInfo = memoryMap.get(`${node.id}:0`);
    if (!memInfo) return node;
    return {
      ...node,
      attributes: {
        ...node.attributes,
        _memOffset: memInfo.offset,
        _memSize: memInfo.size,
        _peakMemory: memInfo.peak,
      },
    };
  });

  return { ...graph, nodes: newNodes };
}

export const memoryPlanningPass: OptimizationPass = {
  name: 'Memory Planning',
  description: 'Analyze tensor lifetimes and assign memory offsets to minimize peak usage',
  run: runMemoryPlanning,
};
