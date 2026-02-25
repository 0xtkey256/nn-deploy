'use client';

import { useState, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import { parseDSL, compileModel, shapeInferencePass, type KernelTarget } from '@nn-deploy/compiler';
import { InferenceSession, Tensor } from '@nn-deploy/runtime';
import { EXAMPLES } from '@/lib/examples';

type DemoTab = 'classification' | 'generation';

interface InferenceResult {
  outputs: Record<string, number[]>;
  latencyMs: number;
  backend: string;
}

export default function InferencePage() {
  const [activeTab, setActiveTab] = useState<DemoTab>('classification');
  const [selectedModel, setSelectedModel] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const runInference = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const example = EXAMPLES[selectedModel];
      const graph = parseDSL(example.dsl);

      // Compile with shape inference only for reliable inference
      const compiled = compileModel(graph, {
        target: 'js',
        passes: [shapeInferencePass],
      });

      // Find input node and its shape from the parsed graph
      const inputNode = graph.nodes.find(n => n.op === 'Input');
      const inputName = inputNode?.name ?? 'x';

      // Get shape from the output port or from the edge
      let shape = inputNode?.outputs[0]?.tensorType?.shape;
      if (!shape) {
        // Try finding shape from outgoing edges
        const outEdge = graph.edges.find(e => e.sourceNodeId === inputNode?.id);
        shape = outEdge?.tensorType?.shape ?? [1, 784];
      }

      const inputTensor = Tensor.rand(shape);

      // Measure compile + run time
      const startTime = performance.now();
      const session = await InferenceSession.create(compiled.model);
      const inferResult = await session.run({ [inputName]: inputTensor });
      const totalTime = performance.now() - startTime;

      const outputs: Record<string, number[]> = {};
      for (const [name, tensor] of Object.entries(inferResult.outputs)) {
        if (tensor instanceof Tensor) {
          outputs[name] = tensor.toArray().slice(0, 20);
        }
      }

      setResult({
        outputs,
        latencyMs: totalTime,
        backend: inferResult.backend,
      });

      session.dispose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsRunning(false);
    }
  }, [selectedModel]);

  // Canvas drawing handlers for digit classification
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.stroke();
  }, [isDrawing]);

  const stopDrawing = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Live Inference</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Compile and run neural networks directly in your browser
          </p>

          {/* Demo tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('classification')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: activeTab === 'classification' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                color: activeTab === 'classification' ? 'var(--accent)' : 'var(--text-secondary)',
                border: `1px solid ${activeTab === 'classification' ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              Image Classification
            </button>
            <button
              onClick={() => setActiveTab('generation')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: activeTab === 'generation' ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                color: activeTab === 'generation' ? 'var(--accent)' : 'var(--text-secondary)',
                border: `1px solid ${activeTab === 'generation' ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              Text Generation
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Input panel */}
            <div
              className="rounded-lg p-4"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Input
              </div>

              {activeTab === 'classification' ? (
                <div>
                  <canvas
                    ref={canvasRef}
                    width={280}
                    height={280}
                    className="rounded-lg cursor-crosshair mb-3 mx-auto block"
                    style={{ background: '#000', border: '1px solid var(--border)' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={clearCanvas}
                      className="flex-1 py-2 rounded text-xs"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <textarea
                    className="w-full h-40 rounded-lg p-3 text-sm resize-none"
                    style={{
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                    placeholder="Enter seed text for generation..."
                    defaultValue="The neural network"
                  />
                </div>
              )}

              {/* Model selector */}
              <div className="mt-4">
                <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-muted)' }}>
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded text-xs"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {EXAMPLES.map((ex, i) => (
                    <option key={i} value={i}>{ex.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={runInference}
                disabled={isRunning}
                className="w-full py-3 rounded-lg text-sm font-medium mt-4 transition-colors"
                style={{
                  background: isRunning ? 'var(--bg-elevated)' : 'var(--accent)',
                  color: '#fff',
                  opacity: isRunning ? 0.6 : 1,
                }}
              >
                {isRunning ? 'Running...' : 'Run Inference'}
              </button>
            </div>

            {/* Output panel */}
            <div
              className="rounded-lg p-4"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Output
              </div>

              {error && (
                <div
                  className="p-3 rounded-lg text-xs mb-3"
                  style={{ background: 'rgba(248, 81, 73, 0.1)', color: 'var(--danger)' }}
                >
                  {error}
                </div>
              )}

              {result ? (
                <div>
                  {/* Performance */}
                  <div className="flex gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                        {result.latencyMs.toFixed(1)}ms
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Latency</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold" style={{ color: 'var(--success)' }}>
                        {result.backend}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Backend</div>
                    </div>
                  </div>

                  {/* Output values */}
                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Predictions
                  </div>
                  {Object.entries(result.outputs).map(([name, values]) => (
                    <div key={name} className="mb-2">
                      <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                        {name}
                      </div>
                      <div className="space-y-1">
                        {values.slice(0, 10).map((val, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-[10px] w-4 text-right font-mono" style={{ color: 'var(--text-muted)' }}>
                              {i}
                            </span>
                            <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                              <div
                                className="h-full rounded"
                                style={{
                                  width: `${Math.max(Math.abs(val) * 100, 1)}%`,
                                  background: val >= 0 ? 'var(--accent)' : 'var(--danger)',
                                  opacity: 0.7,
                                }}
                              />
                            </div>
                            <span className="text-[10px] w-16 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {val.toFixed(4)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48" style={{ color: 'var(--text-muted)' }}>
                  <span className="text-sm">Run inference to see results</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
