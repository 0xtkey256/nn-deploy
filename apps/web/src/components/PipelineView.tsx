'use client';

import { useState } from 'react';
import { useCompilerStore } from '@/stores/compiler-store';
import GraphView from './GraphView';
import CodeView from './CodeView';
import ScheduleView from './ScheduleView';

type Tab = 'graph' | 'optimized' | 'schedule' | 'code';

const TABS: { id: Tab; label: string }[] = [
  { id: 'graph', label: 'Graph IR' },
  { id: 'optimized', label: 'Optimized' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'code', label: 'Generated Code' },
];

export default function PipelineView() {
  const [activeTab, setActiveTab] = useState<Tab>('graph');
  const { history, currentStep, setStep } = useCompilerStore();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-3 h-10 border-b"
        style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'graph' && history.length > 0) setStep(0);
              if (tab.id === 'optimized' && history.length > 1) setStep(history.length - 1);
            }}
            className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
            style={{
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}

        {/* Timeline scrubber */}
        {history.length > 1 && (activeTab === 'graph' || activeTab === 'optimized') && (
          <div className="ml-auto flex items-center gap-2">
            {history.map((entry, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="px-2 py-0.5 rounded text-[10px] transition-colors"
                style={{
                  color: currentStep === i ? 'var(--accent)' : 'var(--text-muted)',
                  background: currentStep === i ? 'var(--accent-subtle)' : 'transparent',
                  border: currentStep === i ? '1px solid var(--accent)' : '1px solid transparent',
                }}
              >
                {i === 0 ? 'Original' : entry.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 tab-content">
        {(activeTab === 'graph' || activeTab === 'optimized') && <GraphView />}
        {activeTab === 'schedule' && <ScheduleView />}
        {activeTab === 'code' && <CodeView />}
      </div>
    </div>
  );
}
