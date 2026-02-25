'use client';

import { useMemo } from 'react';
import { useCompilerStore } from '@/stores/compiler-store';
import { topologicalSort, getOutputEdges, getOpColor, tensorByteSize, formatBytes } from '@nn-deploy/compiler';

export default function ScheduleView() {
  const { history, currentStep } = useCompilerStore();

  const scheduleData = useMemo(() => {
    if (history.length === 0) return null;
    const graph = history[currentStep]?.graph;
    if (!graph) return null;

    const sorted = topologicalSort(graph);
    const ops = sorted
      .filter(n => n.op !== 'Input' && n.op !== 'Output' && n.op !== 'Constant')
      .map((node, i) => {
        const outEdges = getOutputEdges(graph, node.id);
        const tensorType = outEdges[0]?.tensorType;
        const memSize = tensorType ? tensorByteSize(tensorType) : 0;
        const memOffset = typeof node.attributes._memOffset === 'number' ? node.attributes._memOffset : i * memSize;

        return {
          order: i,
          name: node.name,
          op: node.op,
          color: getOpColor(node.op),
          memOffset,
          memSize,
          shape: tensorType ? tensorType.shape : [],
        };
      });

    const peakMem = ops.reduce((max, op) => Math.max(max, op.memOffset + op.memSize), 0);
    return { ops, peakMem };
  }, [history, currentStep]);

  if (!scheduleData) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        Compile a model to see the execution schedule
      </div>
    );
  }

  const { ops, peakMem } = scheduleData;
  const barWidth = peakMem > 0 ? 600 : 0;

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="mb-4 flex items-center gap-4">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Execution Order
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {ops.length} ops &middot; Peak memory: {formatBytes(peakMem)}
        </span>
      </div>

      {/* Schedule timeline */}
      <div className="space-y-1">
        {ops.map(op => (
          <div key={op.order} className="flex items-center gap-3">
            {/* Order number */}
            <span
              className="w-6 text-right text-[10px] font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              {op.order}
            </span>

            {/* Op name */}
            <div className="flex items-center gap-2 w-48">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: op.color }}
              />
              <span className="text-xs font-medium truncate">{op.name}</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {op.op}
              </span>
            </div>

            {/* Memory bar */}
            <div className="flex-1 h-5 relative" style={{ maxWidth: barWidth }}>
              <div
                className="absolute h-full rounded-sm"
                style={{
                  left: peakMem > 0 ? `${(op.memOffset / peakMem) * 100}%` : 0,
                  width: peakMem > 0 ? `${Math.max((op.memSize / peakMem) * 100, 1)}%` : '100%',
                  background: op.color,
                  opacity: 0.6,
                }}
              />
            </div>

            {/* Shape & size */}
            <span
              className="text-[10px] font-mono w-24 text-right"
              style={{ color: 'var(--text-muted)' }}
            >
              {op.shape.length > 0 ? `[${op.shape.join(',')}]` : ''}
            </span>
            <span
              className="text-[10px] w-16 text-right"
              style={{ color: 'var(--text-muted)' }}
            >
              {formatBytes(op.memSize)}
            </span>
          </div>
        ))}
      </div>

      {/* Memory pool visualization */}
      {peakMem > 0 && (
        <div className="mt-6">
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Memory Pool
          </div>
          <div
            className="h-8 rounded relative overflow-hidden"
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
          >
            {ops.map(op => (
              <div
                key={op.order}
                className="absolute h-full"
                style={{
                  left: `${(op.memOffset / peakMem) * 100}%`,
                  width: `${Math.max((op.memSize / peakMem) * 100, 0.5)}%`,
                  background: op.color,
                  opacity: 0.5,
                }}
                title={`${op.name}: ${formatBytes(op.memSize)} @ offset ${formatBytes(op.memOffset)}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>0</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {formatBytes(peakMem)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
