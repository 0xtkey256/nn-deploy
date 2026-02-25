'use client';

import Header from '@/components/Header';
import Editor from '@/components/Editor';
import PipelineView from '@/components/PipelineView';
import Sidebar from '@/components/Sidebar';

export default function PlaygroundPage() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 min-h-0">
        {/* Left: Editor */}
        <div className="border-r" style={{ borderColor: 'var(--border)' }}>
          <Editor />
        </div>

        {/* Center: Pipeline View */}
        <PipelineView />

        {/* Right: Sidebar */}
        <div className="border-l" style={{ borderColor: 'var(--border)' }}>
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
