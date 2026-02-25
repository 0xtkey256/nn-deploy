'use client';

import { useCompilerStore } from '@/stores/compiler-store';
import { EXAMPLES } from '@/lib/examples';
import { useRef, useCallback } from 'react';

export default function Editor() {
  const { source, setSource, compile, parseError, loadExample } = useCompilerStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        compile();
      }
      // Tab support
      if (e.key === 'Tab') {
        e.preventDefault();
        const ta = textareaRef.current;
        if (!ta) return;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const val = ta.value;
        setSource(val.substring(0, start) + '  ' + val.substring(end));
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
    },
    [compile, setSource]
  );

  return (
    <div className="flex flex-col h-full" style={{ width: 340 }}>
      <div
        className="flex items-center justify-between px-3 h-10 border-b"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
      >
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          Model DSL
        </span>
        <select
          className="text-xs px-2 py-1 rounded border"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
          onChange={e => loadExample(Number(e.target.value))}
          defaultValue=""
        >
          <option value="" disabled>
            Load example...
          </option>
          {EXAMPLES.map((ex, i) => (
            <option key={i} value={i}>
              {ex.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 relative">
        <textarea
          ref={textareaRef}
          value={source}
          onChange={e => setSource(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="w-full h-full resize-none p-3 text-sm leading-relaxed focus:outline-none"
          style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
          placeholder="Enter model DSL..."
        />
      </div>

      {parseError && (
        <div
          className="px-3 py-2 text-xs border-t"
          style={{ background: 'rgba(248, 81, 73, 0.1)', borderColor: 'var(--danger)', color: 'var(--danger)' }}
        >
          {parseError}
        </div>
      )}

      <div className="px-3 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={compile}
          className="w-full py-2 rounded-md text-sm font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Compile & Optimize
        </button>
        <div className="text-[10px] mt-1 text-center" style={{ color: 'var(--text-muted)' }}>
          Cmd+Enter
        </div>
      </div>
    </div>
  );
}
