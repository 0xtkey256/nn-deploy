import type { OptimizationPass } from './index';
import type { Graph, Node } from '../ir/graph';
import { getInputEdges, getOutputEdges, genId, isConstant } from '../ir/graph';

function runConstantFolding(graph: Graph): Graph {
  let changed = true;
  let result = { ...graph };

  while (changed) {
    changed = false;

    for (const node of result.nodes) {
      if (node.op === 'Input' || node.op === 'Output' || isConstant(node)) continue;

      // Check if all inputs are constants
      const inputEdges = getInputEdges(result, node.id);
      const allConstant = inputEdges.length > 0 &&
        inputEdges.every(e => {
          const src = result.nodes.find(n => n.id === e.sourceNodeId);
          return src && isConstant(src);
        });

      if (!allConstant) continue;

      // Get output tensor type from outgoing edges
      const outEdges = getOutputEdges(result, node.id);
      const outType = outEdges[0]?.tensorType;

      // Replace with a constant node
      const constId = genId('const');
      const constNode: Node = {
        id: constId,
        op: 'Constant',
        name: `folded_${node.name}`,
        inputs: [],
        outputs: [{ name: `folded_${node.name}`, tensorType: outType }],
        attributes: { _foldedFrom: node.op, _originalName: node.name },
      };

      // Rewire edges: all consumers of this node now consume the constant
      const newEdges = result.edges
        .filter(e => e.sourceNodeId !== node.id && e.targetNodeId !== node.id)
        .concat(
          outEdges
            .flatMap(e =>
              result.edges
                .filter(e2 => e2.sourceNodeId === node.id)
                .map(e2 => ({
                  ...e2,
                  id: genId('e'),
                  sourceNodeId: constId,
                  sourcePortIndex: 0,
                }))
            )
        );

      // Remove original node and its constant inputs (if orphaned)
      const removedIds = new Set([node.id]);
      for (const e of inputEdges) {
        const src = result.nodes.find(n => n.id === e.sourceNodeId);
        if (src && isConstant(src)) {
          const otherConsumers = result.edges.filter(
            e2 => e2.sourceNodeId === src.id && !removedIds.has(e2.targetNodeId)
          );
          if (otherConsumers.length === 0) {
            removedIds.add(src.id);
          }
        }
      }

      result = {
        ...result,
        nodes: [
          ...result.nodes.filter(n => !removedIds.has(n.id)),
          constNode,
        ],
        edges: newEdges.filter(
          e => !removedIds.has(e.sourceNodeId) && !removedIds.has(e.targetNodeId)
        ),
      };

      changed = true;
      break; // restart iteration after mutation
    }
  }

  return result;
}

export const constantFoldingPass: OptimizationPass = {
  name: 'Constant Folding',
  description: 'Evaluate operations with all-constant inputs at compile time',
  run: runConstantFolding,
};
