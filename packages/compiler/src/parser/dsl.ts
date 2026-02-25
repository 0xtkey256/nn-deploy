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

// --- Tokenizer ---

type TokenType =
  | 'keyword' | 'ident' | 'number' | 'string' | 'arrow'
  | 'lbrace' | 'rbrace' | 'lparen' | 'rparen' | 'lbracket' | 'rbracket'
  | 'colon' | 'comma' | 'equals' | 'lt' | 'gt' | 'eof';

interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

const KEYWORDS = new Set(['model', 'input', 'output', 'deploy']);

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  while (i < source.length) {
    // Skip whitespace
    if (/\s/.test(source[i])) {
      if (source[i] === '\n') { line++; col = 1; } else { col++; }
      i++;
      continue;
    }

    // Skip comments
    if (source[i] === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    const startCol = col;

    // Arrow →
    if (source[i] === '\u2192' || (source[i] === '-' && source[i + 1] === '>')) {
      const len = source[i] === '\u2192' ? 1 : 2;
      tokens.push({ type: 'arrow', value: '->', line, col: startCol });
      i += len; col += len;
      continue;
    }

    // Single-char tokens
    const singleChars: Record<string, TokenType> = {
      '{': 'lbrace', '}': 'rbrace', '(': 'lparen', ')': 'rparen',
      '[': 'lbracket', ']': 'rbracket', ':': 'colon', ',': 'comma',
      '=': 'equals', '<': 'lt', '>': 'gt',
    };
    if (singleChars[source[i]]) {
      tokens.push({ type: singleChars[source[i]], value: source[i], line, col: startCol });
      i++; col++;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(source[i]) || (source[i] === '-' && /[0-9]/.test(source[i + 1] ?? ''))) {
      let num = '';
      if (source[i] === '-') { num += '-'; i++; col++; }
      while (i < source.length && /[0-9.]/.test(source[i])) {
        num += source[i]; i++; col++;
      }
      tokens.push({ type: 'number', value: num, line, col: startCol });
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-Z_]/.test(source[i])) {
      let ident = '';
      while (i < source.length && /[a-zA-Z0-9_]/.test(source[i])) {
        ident += source[i]; i++; col++;
      }
      const type: TokenType = KEYWORDS.has(ident) ? 'keyword' : 'ident';
      tokens.push({ type, value: ident, line, col: startCol });
      continue;
    }

    // String literals
    if (source[i] === '"' || source[i] === "'") {
      const quote = source[i];
      i++; col++;
      let str = '';
      while (i < source.length && source[i] !== quote) {
        str += source[i]; i++; col++;
      }
      i++; col++; // closing quote
      tokens.push({ type: 'string', value: str, line, col: startCol });
      continue;
    }

    throw new Error(`Unexpected character '${source[i]}' at line ${line}:${col}`);
  }

  tokens.push({ type: 'eof', value: '', line, col });
  return tokens;
}

// --- Parser ---

interface ParsedInput {
  name: string;
  tensorType: TensorType;
}

interface ParsedOp {
  target: string;
  op: string;
  args: string[];
  kwargs: Record<string, string | number | boolean | number[]>;
}

interface ParsedOutput {
  name: string;
}

interface ParsedModel {
  name: string;
  inputs: ParsedInput[];
  ops: ParsedOp[];
  outputs: ParsedOutput[];
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: TokenType, value?: string): Token {
    const tok = this.advance();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new Error(
        `Expected ${type}${value ? ` '${value}'` : ''} but got ${tok.type} '${tok.value}' at line ${tok.line}:${tok.col}`
      );
    }
    return tok;
  }

  private match(type: TokenType, value?: string): boolean {
    const tok = this.peek();
    return tok.type === type && (value === undefined || tok.value === value);
  }

  parse(): ParsedModel {
    this.expect('keyword', 'model');
    const name = this.expect('ident').value;
    this.expect('lbrace');

    const inputs: ParsedInput[] = [];
    const ops: ParsedOp[] = [];
    const outputs: ParsedOutput[] = [];

    while (!this.match('rbrace') && !this.match('eof')) {
      if (this.match('keyword', 'input')) {
        inputs.push(this.parseInput());
      } else if (this.match('keyword', 'output')) {
        outputs.push(this.parseOutput());
      } else {
        ops.push(this.parseOp());
      }
    }

    this.expect('rbrace');
    return { name, inputs, ops, outputs };
  }

  private parseInput(): ParsedInput {
    this.expect('keyword', 'input');
    const name = this.expect('ident').value;
    this.expect('colon');
    const tensorType = this.parseTensorType();
    return { name, tensorType };
  }

  private parseTensorType(): TensorType {
    this.expect('ident', 'Tensor');
    this.expect('lt');
    const dtype = this.expect('ident').value as DataType;
    this.expect('gt');
    const shape = this.parseShape();
    return { dtype, shape };
  }

  private parseShape(): number[] {
    this.expect('lbracket');
    const dims: number[] = [];
    while (!this.match('rbracket')) {
      dims.push(Number(this.expect('number').value));
      if (this.match('comma')) this.advance();
    }
    this.expect('rbracket');
    return dims;
  }

  private parseOutput(): ParsedOutput {
    this.expect('keyword', 'output');
    const name = this.expect('ident').value;
    return { name };
  }

  private parseOp(): ParsedOp {
    const target = this.expect('ident').value;
    this.expect('equals');
    const op = this.expect('ident').value;
    this.expect('lparen');

    const args: string[] = [];
    const kwargs: Record<string, string | number | boolean | number[]> = {};

    while (!this.match('rparen') && !this.match('eof')) {
      // Check for kwarg (ident = value)
      if (this.peek().type === 'ident' && this.tokens[this.pos + 1]?.type === 'equals') {
        const key = this.advance().value;
        this.advance(); // =
        kwargs[key] = this.parseValue();
      } else {
        args.push(this.expect('ident').value);
      }
      if (this.match('comma')) this.advance();
    }

    this.expect('rparen');
    return { target, op, args, kwargs };
  }

  private parseValue(): string | number | boolean | number[] {
    if (this.match('lbracket')) {
      return this.parseShape();
    }
    if (this.match('number')) {
      return Number(this.advance().value);
    }
    if (this.match('ident')) {
      const val = this.advance().value;
      if (val === 'true') return true;
      if (val === 'false') return false;
      return val;
    }
    if (this.match('string')) {
      return this.advance().value;
    }
    throw new Error(`Unexpected token ${this.peek().type} at line ${this.peek().line}:${this.peek().col}`);
  }
}

// --- Graph builder ---

export function parseDSL(source: string): Graph {
  resetIdCounter();
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  const model = parser.parse();

  let graph = createGraph(model.name);
  const nameToNodeId = new Map<string, string>();

  // Add input nodes
  for (const inp of model.inputs) {
    const result = addNode(graph, {
      op: 'Input',
      name: inp.name,
      inputs: [],
      outputs: [{ name: inp.name, tensorType: inp.tensorType }],
      attributes: {},
    });
    graph = result.graph;
    nameToNodeId.set(inp.name, result.nodeId);
  }

  // Add operation nodes
  for (const op of model.ops) {
    const attrs: Record<string, string | number | boolean | number[]> = {};
    for (const [k, v] of Object.entries(op.kwargs)) {
      attrs[k] = v;
    }

    const inputs = op.args.map(arg => ({ name: arg }));
    const result = addNode(graph, {
      op: op.op as OpType,
      name: op.target,
      inputs,
      outputs: [{ name: op.target }],
      attributes: attrs,
    });
    graph = result.graph;
    nameToNodeId.set(op.target, result.nodeId);

    // Add edges from args to this node (auto-create Constant for undefined refs)
    for (let i = 0; i < op.args.length; i++) {
      let sourceId = nameToNodeId.get(op.args[i]);
      if (!sourceId) {
        // Auto-create a Constant node for undefined weight/bias references
        const constResult = addNode(graph, {
          op: 'Constant',
          name: op.args[i],
          inputs: [],
          outputs: [{ name: op.args[i] }],
          attributes: { _autoCreated: true },
        });
        graph = constResult.graph;
        sourceId = constResult.nodeId;
        nameToNodeId.set(op.args[i], sourceId);
      }
      const edgeResult = addEdge(graph, sourceId, 0, result.nodeId, i);
      graph = edgeResult.graph;
    }
  }

  // Add output nodes
  for (const out of model.outputs) {
    const result = addNode(graph, {
      op: 'Output',
      name: `out_${out.name}`,
      inputs: [{ name: out.name }],
      outputs: [],
      attributes: {},
    });
    graph = result.graph;

    const sourceId = nameToNodeId.get(out.name);
    if (sourceId) {
      const edgeResult = addEdge(graph, sourceId, 0, result.nodeId, 0);
      graph = edgeResult.graph;
    }
  }

  return graph;
}

// Parse DSL with implicit output (last assignment becomes output)
export function parseDSLWithImplicitOutput(source: string): Graph {
  resetIdCounter();
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  const model = parser.parse();

  // If no explicit outputs, use the last op target
  if (model.outputs.length === 0 && model.ops.length > 0) {
    model.outputs.push({ name: model.ops[model.ops.length - 1].target });
  }

  // Re-parse with outputs now set
  resetIdCounter();
  return parseDSL(source);
}
