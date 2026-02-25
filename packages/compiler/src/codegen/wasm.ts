import type { Graph, Node } from '../ir/graph';
import type { GeneratedCode, GeneratedKernel } from './types';
import { topologicalSort, getInputEdges } from '../ir/graph';

function generateWasmDispatch(node: Node): string {
  switch (node.op) {
    case 'MatMul': case 'FusedMatMulAdd': case 'FusedLinearReLU':
      return `ops.matmul(inputs[0], inputs[1]${node.op !== 'MatMul' ? ', inputs[2]' : ''}${node.op === 'FusedLinearReLU' ? ', true' : ''})`;

    case 'Conv2D': case 'FusedConvBNReLU': case 'FusedConvBN':
      return `ops.conv2d(inputs[0], inputs[1], { kernel: ${node.attributes.kernel ?? 3}, stride: ${node.attributes.stride ?? 1}, filters: ${node.attributes.filters ?? 'null'}, relu: ${node.op.includes('ReLU')} })`;

    case 'ReLU': return `ops.relu(inputs[0])`;
    case 'GELU': return `ops.gelu(inputs[0])`;
    case 'Sigmoid': return `ops.sigmoid(inputs[0])`;
    case 'Tanh': return `ops.tanh(inputs[0])`;
    case 'SiLU': return `ops.silu(inputs[0])`;
    case 'Softmax': return `ops.softmax(inputs[0])`;

    case 'Add': return `ops.add(inputs[0], inputs[1])`;
    case 'Sub': return `ops.sub(inputs[0], inputs[1])`;
    case 'Mul': return `ops.mul(inputs[0], inputs[1])`;
    case 'Div': return `ops.div(inputs[0], inputs[1])`;

    case 'BatchNorm': case 'LayerNorm': case 'GroupNorm': case 'InstanceNorm':
      return `ops.normalize(inputs[0], '${node.op}')`;

    case 'MaxPool2D': return `ops.maxPool2d(inputs[0], { kernel: ${node.attributes.kernel ?? 2}, stride: ${node.attributes.stride ?? node.attributes.kernel ?? 2} })`;
    case 'AvgPool2D': return `ops.avgPool2d(inputs[0], { kernel: ${node.attributes.kernel ?? 2}, stride: ${node.attributes.stride ?? node.attributes.kernel ?? 2} })`;
    case 'GlobalAvgPool': return `ops.globalAvgPool(inputs[0])`;

    case 'Reshape': return `ops.reshape(inputs[0], ${JSON.stringify(node.attributes.shape ?? [])})`;
    case 'Transpose': return `ops.transpose(inputs[0], ${JSON.stringify(node.attributes.perm ?? [])})`;
    case 'Flatten': return `ops.flatten(inputs[0])`;
    case 'Concat': return `ops.concat(inputs, ${node.attributes.axis ?? 0})`;

    default: return `ops.identity(inputs[0])`;
  }
}

export function generateWASM(graph: Graph): GeneratedCode {
  const sorted = topologicalSort(graph);
  const kernels: GeneratedKernel[] = [];
  const dispatches: string[] = [];

  for (const node of sorted) {
    if (node.op === 'Input' || node.op === 'Output' || node.op === 'Constant') continue;

    const inputEdges = getInputEdges(graph, node.id);
    const inputNames = inputEdges.map(e => {
      const src = graph.nodes.find(n => n.id === e.sourceNodeId);
      return src?.name ?? 'unknown';
    });

    const dispatch = generateWasmDispatch(node);
    dispatches.push(`  // ${node.op}: ${node.name}
  tensors['${node.name}'] = (function() {
    const inputs = [${inputNames.map(n => `tensors['${n}']`).join(', ')}];
    return ${dispatch};
  })();`);

    kernels.push({
      name: node.name,
      source: dispatch,
      op: node.op,
    });
  }

  const source = `// Auto-generated WASM dispatch schedule
// Model: ${graph.name}
// Uses pre-compiled WASM kernels via ops module
//
// Required WASM ops: ${[...new Set(sorted.filter(n => n.op !== 'Input' && n.op !== 'Output' && n.op !== 'Constant').map(n => n.op))].join(', ')}

import { createOps } from '@nn-deploy/runtime/wasm-ops';

export async function run(inputTensors) {
  const ops = await createOps();
  const tensors = { ...inputTensors };

${dispatches.join('\n\n')}

  return tensors;
}
`;

  return {
    target: 'wasm',
    source,
    kernels,
    entryPoint: 'run',
  };
}
