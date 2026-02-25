'use client';

import { useCompilerStore } from '@/stores/compiler-store';

export default function CodeView() {
  const { generatedCode, targetBackend } = useCompilerStore();

  if (!generatedCode) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        Compile a model to see generated code
      </div>
    );
  }

  const langLabel = targetBackend === 'webgpu' ? 'WGSL' : targetBackend === 'wasm' ? 'WASM Dispatch' : 'JavaScript';

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        className="flex items-center px-3 h-8 border-b"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
      >
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          Target: {langLabel}
        </span>
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {generatedCode.split('\n').length} lines
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <pre
          className="p-4 text-xs leading-relaxed"
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            color: 'var(--text-primary)',
          }}
        >
          {generatedCode}
        </pre>
      </div>
    </div>
  );
}
