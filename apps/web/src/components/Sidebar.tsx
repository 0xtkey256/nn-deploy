'use client';

import { useCompilerStore } from '@/stores/compiler-store';
import {
  ALL_PASSES,
  OP_REGISTRY,
  getOpColor,
  formatBytes,
  formatFLOPs,
  type KernelTarget,
} from '@nn-deploy/compiler';

const BACKENDS: { value: KernelTarget; label: string }[] = [
  { value: 'js', label: 'JavaScript' },
  { value: 'webgpu', label: 'WebGPU (WGSL)' },
  { value: 'wasm', label: 'WASM' },
];

function MetricRow({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{before}</span>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>&rarr;</span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-primary)' }}>{after}</span>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const {
    history, currentStep, enabledPasses, togglePass,
    compile, targetBackend, setTargetBackend,
    selectedNodeId,
  } = useCompilerStore();

  const currentGraph = history[currentStep]?.graph;
  const selectedNode = currentGraph?.nodes.find(n => n.id === selectedNodeId);

  // Metrics comparison
  const original = history[0]?.metrics;
  const optimized = history[history.length - 1]?.metrics;

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ width: 280 }}>
      {/* Node Inspector */}
      {selectedNode && (
        <section className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Node Inspector
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-3 h-3 rounded"
              style={{ background: getOpColor(selectedNode.op) }}
            />
            <span className="text-sm font-medium">{selectedNode.op}</span>
          </div>
          <div className="space-y-1">
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Name: <span style={{ color: 'var(--text-secondary)' }}>{selectedNode.name}</span>
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {OP_REGISTRY[selectedNode.op]?.description}
            </div>
            {Object.entries(selectedNode.attributes)
              .filter(([k]) => !k.startsWith('_'))
              .map(([k, v]) => (
                <div key={k} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {k}: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{JSON.stringify(v)}</span>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Target Backend */}
      <section className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Target Backend
        </div>
        <div className="space-y-1">
          {BACKENDS.map(b => (
            <label key={b.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="backend"
                checked={targetBackend === b.value}
                onChange={() => setTargetBackend(b.value)}
                className="accent-[var(--accent)]"
              />
              <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                {b.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Optimization Passes */}
      <section className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Optimization Passes
          </span>
          <button
            onClick={compile}
            className="text-[10px] px-2 py-0.5 rounded"
            style={{ color: 'var(--accent)', border: '1px solid var(--accent)' }}
          >
            Re-run
          </button>
        </div>
        <div className="space-y-1.5">
          {ALL_PASSES.map((pass, i) => (
            <label key={i} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabledPasses[i]}
                onChange={() => togglePass(i)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <div>
                <div className="text-xs" style={{ color: 'var(--text-primary)' }}>
                  {pass.name}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {pass.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Metrics */}
      {original && optimized && (
        <section className="p-3">
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Compilation Metrics
          </div>
          <MetricRow label="Nodes" before={String(original.nodeCount)} after={String(optimized.nodeCount)} />
          <MetricRow label="Edges" before={String(original.edgeCount)} after={String(optimized.edgeCount)} />
          <MetricRow label="FLOPs" before={formatFLOPs(original.totalFLOPs)} after={formatFLOPs(optimized.totalFLOPs)} />
          <MetricRow label="Memory" before={formatBytes(original.totalMemoryBytes)} after={formatBytes(optimized.totalMemoryBytes)} />
          <MetricRow label="Params" before={String(original.totalParams)} after={String(optimized.totalParams)} />
          <MetricRow label="Depth" before={String(original.depth)} after={String(optimized.depth)} />
          {optimized.hasQuantization && (
            <div className="mt-1 text-[10px] px-2 py-1 rounded" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
              Quantized (INT8)
            </div>
          )}
        </section>
      )}
    </div>
  );
}
