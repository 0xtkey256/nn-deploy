'use client';

import Link from 'next/link';
import Header from '@/components/Header';

const PIPELINE_STEPS = [
  { icon: '{}', title: 'Define', desc: 'Model DSL or ONNX JSON', color: 'var(--accent)' },
  { icon: '\u25C6', title: 'Parse', desc: 'Build computation graph IR', color: 'var(--purple)' },
  { icon: '\u26A1', title: 'Optimize', desc: '7 compilation passes', color: 'var(--orange)' },
  { icon: '\u2699', title: 'Codegen', desc: 'WebGPU / WASM / JS', color: 'var(--pink)' },
  { icon: '\u25B6', title: 'Deploy', desc: 'In-browser inference', color: 'var(--success)' },
];

const FEATURES = [
  {
    title: 'Multi-Level IR',
    desc: 'High-level graph IR for optimization, low-level scheduled IR for code generation. Immutable data structures for full pipeline history.',
    color: 'var(--accent)',
  },
  {
    title: '7 Optimization Passes',
    desc: 'Shape inference, constant folding, dead code elimination, operator fusion, quantization, layout optimization, and memory planning.',
    color: 'var(--orange)',
  },
  {
    title: '3 Code Generation Backends',
    desc: 'Generate WebGPU WGSL compute shaders, WASM dispatch schedules, or pure JavaScript for maximum compatibility.',
    color: 'var(--purple)',
  },
  {
    title: 'In-Browser Inference',
    desc: 'Run compiled models directly in the browser with WebGPU acceleration, WASM fallback, and JS reference execution.',
    color: 'var(--success)',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-4 leading-tight">
            <span className="gradient-text">Neural Network</span>
            <br />
            Compiler & Deployment
          </h1>
          <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
            From model definition to in-browser inference. Compile, optimize, and deploy
            neural networks with a full compiler stack.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/playground"
              className="px-6 py-3 rounded-lg text-sm font-medium"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Open Playground
            </Link>
            <Link
              href="/inference"
              className="px-6 py-3 rounded-lg text-sm font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              Try Inference
            </Link>
          </div>

          {/* Pipeline visualization */}
          <div className="flex items-center justify-center gap-2 mb-20">
            {PIPELINE_STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg pipeline-active"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    animationDelay: `${i * 0.4}s`,
                  }}
                >
                  <span className="text-lg" style={{ color: step.color }}>{step.icon}</span>
                  <span className="text-xs font-medium">{step.title}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {step.desc}
                  </span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-4">
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              className="p-5 rounded-lg"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-2 h-2 rounded-full mb-3"
                style={{ background: feature.color }}
              />
              <h3 className="text-sm font-semibold mb-1">{feature.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Tech stack */}
        <div className="mt-16 text-center">
          <div className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Built with
          </div>
          <div className="flex items-center gap-6" style={{ color: 'var(--text-secondary)' }}>
            {['TypeScript', 'Next.js', 'D3.js', 'WebGPU', 'Turborepo'].map(tech => (
              <span key={tech} className="text-xs">{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="px-6 py-4 border-t text-center"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        <span className="text-xs">nn-deploy &mdash; Neural Network Compiler Stack</span>
      </footer>
    </div>
  );
}
