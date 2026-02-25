// nn-deploy Documentation - SVG Diagrams

const COLORS = {
  accent: '#58a6ff',
  purple: '#bc8cff',
  orange: '#f0883e',
  pink: '#f778ba',
  success: '#3fb950',
  warning: '#d29922',
  danger: '#f85149',
  cyan: '#39d2c0',
  bgSecondary: '#161b22',
  bgTertiary: '#1c2128',
  border: '#30363d',
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
  textMuted: '#484f58',
};

function svg(tag, attrs = {}, children = []) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const c of children) {
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else el.appendChild(c);
  }
  return el;
}

// Compilation Pipeline
function renderPipelineDiagram(container) {
  const steps = [
    { icon: '{ }', label: 'Define', desc: 'DSL / JSON', color: COLORS.accent },
    { icon: '\u25C7', label: 'Parse', desc: 'Build IR Graph', color: COLORS.purple },
    { icon: '\u26A1', label: 'Optimize', desc: '7 Passes', color: COLORS.orange },
    { icon: '\u2699', label: 'Codegen', desc: 'JS / WGSL / WASM', color: COLORS.pink },
    { icon: '\u25B6', label: 'Deploy', desc: 'Browser Runtime', color: COLORS.success },
  ];

  const w = 680, h = 90;
  const stepW = 100, stepH = 60, gap = 40;
  const startX = (w - (steps.length * stepW + (steps.length - 1) * gap)) / 2;

  const root = svg('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}` });

  steps.forEach((step, i) => {
    const x = startX + i * (stepW + gap);
    const y = (h - stepH) / 2;

    // Box
    root.appendChild(svg('rect', {
      x, y, width: stepW, height: stepH, rx: '8',
      fill: COLORS.bgTertiary, stroke: step.color, 'stroke-width': '1.5',
    }));

    // Icon
    root.appendChild(svg('text', {
      x: x + stepW / 2, y: y + 20, 'text-anchor': 'middle',
      fill: step.color, 'font-size': '14', 'font-weight': '600',
    }, [step.icon]));

    // Label
    root.appendChild(svg('text', {
      x: x + stepW / 2, y: y + 36, 'text-anchor': 'middle',
      fill: COLORS.textPrimary, 'font-size': '11', 'font-weight': '600',
      'font-family': 'system-ui, sans-serif',
    }, [step.label]));

    // Desc
    root.appendChild(svg('text', {
      x: x + stepW / 2, y: y + 50, 'text-anchor': 'middle',
      fill: COLORS.textMuted, 'font-size': '9',
      'font-family': 'system-ui, sans-serif',
    }, [step.desc]));

    // Arrow
    if (i < steps.length - 1) {
      const ax = x + stepW + 4;
      const ay = h / 2;
      root.appendChild(svg('line', {
        x1: ax, y1: ay, x2: ax + gap - 8, y2: ay,
        stroke: COLORS.textMuted, 'stroke-width': '1.5',
        'marker-end': 'url(#arrow)',
      }));
    }
  });

  // Arrow marker
  const defs = svg('defs');
  const marker = svg('marker', {
    id: 'arrow', viewBox: '0 0 10 6', refX: '10', refY: '3',
    markerWidth: '8', markerHeight: '6', orient: 'auto',
  });
  marker.appendChild(svg('path', { d: 'M0,0 L10,3 L0,6', fill: COLORS.textMuted }));
  defs.appendChild(marker);
  root.insertBefore(defs, root.firstChild);

  container.appendChild(root);
}

// Operator Fusion Before/After
function renderFusionDiagram(container) {
  const w = 600, h = 200;
  const root = svg('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}` });

  const defs = svg('defs');
  const marker = svg('marker', {
    id: 'arrow2', viewBox: '0 0 10 6', refX: '10', refY: '3',
    markerWidth: '7', markerHeight: '5', orient: 'auto',
  });
  marker.appendChild(svg('path', { d: 'M0,0 L10,3 L0,6', fill: COLORS.textMuted }));
  defs.appendChild(marker);
  root.appendChild(defs);

  // Before side
  const bx = 40;
  root.appendChild(svg('text', {
    x: bx + 60, y: 18, 'text-anchor': 'middle',
    fill: COLORS.textMuted, 'font-size': '11', 'font-weight': '600',
    'font-family': 'system-ui, sans-serif',
  }, ['Before']));

  const beforeNodes = [
    { label: 'Conv2D', color: '#8b5cf6', y: 35 },
    { label: 'BatchNorm', color: '#ec4899', y: 95 },
    { label: 'ReLU', color: '#10b981', y: 155 },
  ];

  beforeNodes.forEach((n, i) => {
    root.appendChild(svg('rect', {
      x: bx, y: n.y, width: 120, height: 40, rx: '6',
      fill: COLORS.bgTertiary, stroke: n.color, 'stroke-width': '1.5',
    }));
    root.appendChild(svg('text', {
      x: bx + 60, y: n.y + 24, 'text-anchor': 'middle',
      fill: n.color, 'font-size': '12', 'font-weight': '600',
      'font-family': 'system-ui, sans-serif',
    }, [n.label]));
    if (i < beforeNodes.length - 1) {
      root.appendChild(svg('line', {
        x1: bx + 60, y1: n.y + 40, x2: bx + 60, y2: n.y + 60,
        stroke: COLORS.textMuted, 'stroke-width': '1.2', 'marker-end': 'url(#arrow2)',
      }));
    }
  });

  // Arrow in middle
  const mx = 220;
  root.appendChild(svg('line', {
    x1: mx, y1: 100, x2: mx + 70, y2: 100,
    stroke: COLORS.accent, 'stroke-width': '2', 'stroke-dasharray': '6,4',
  }));
  root.appendChild(svg('polygon', {
    points: `${mx + 70},95 ${mx + 82},100 ${mx + 70},105`,
    fill: COLORS.accent,
  }));
  root.appendChild(svg('text', {
    x: mx + 40, y: 88, 'text-anchor': 'middle',
    fill: COLORS.accent, 'font-size': '10', 'font-weight': '600',
    'font-family': 'system-ui, sans-serif',
  }, ['Fuse']));

  // After side
  const ax = 340;
  root.appendChild(svg('text', {
    x: ax + 90, y: 18, 'text-anchor': 'middle',
    fill: COLORS.textMuted, 'font-size': '11', 'font-weight': '600',
    'font-family': 'system-ui, sans-serif',
  }, ['After']));

  root.appendChild(svg('rect', {
    x: ax, y: 70, width: 180, height: 56, rx: '8',
    fill: COLORS.bgTertiary, stroke: COLORS.orange, 'stroke-width': '2',
  }));
  root.appendChild(svg('text', {
    x: ax + 90, y: 95, 'text-anchor': 'middle',
    fill: COLORS.orange, 'font-size': '13', 'font-weight': '700',
    'font-family': 'system-ui, sans-serif',
  }, ['FusedConvBNReLU']));
  root.appendChild(svg('text', {
    x: ax + 90, y: 113, 'text-anchor': 'middle',
    fill: COLORS.textMuted, 'font-size': '10',
    'font-family': 'system-ui, sans-serif',
  }, ['3 ops \u2192 1 fused kernel']));

  container.appendChild(root);
}

// Memory Planning Timeline
function renderMemoryDiagram(container) {
  const w = 600, h = 180;
  const root = svg('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}` });

  // Axis labels
  root.appendChild(svg('text', {
    x: 30, y: 15, fill: COLORS.textMuted, 'font-size': '10',
    'font-family': 'system-ui, sans-serif',
  }, ['Memory Offset']));
  root.appendChild(svg('text', {
    x: w - 30, y: h - 5, 'text-anchor': 'end',
    fill: COLORS.textMuted, 'font-size': '10',
    'font-family': 'system-ui, sans-serif',
  }, ['Execution Time \u2192']));

  const ox = 50, oy = 30, cw = w - 80, ch = h - 55;

  // Grid
  root.appendChild(svg('rect', {
    x: ox, y: oy, width: cw, height: ch, rx: '4',
    fill: 'none', stroke: COLORS.border, 'stroke-width': '1',
  }));

  // Memory blocks (simulated)
  const blocks = [
    { name: 'x', x: 0, w: 0.20, y: 0, h: 0.3, color: COLORS.accent },
    { name: 'h1', x: 0.15, w: 0.30, y: 0.35, h: 0.25, color: COLORS.purple },
    { name: 'a1', x: 0.35, w: 0.25, y: 0, h: 0.3, color: COLORS.success },
    { name: 'h2', x: 0.50, w: 0.25, y: 0.35, h: 0.25, color: COLORS.orange },
    { name: 'out', x: 0.65, w: 0.30, y: 0, h: 0.3, color: COLORS.pink },
  ];

  blocks.forEach(b => {
    const bx = ox + b.x * cw;
    const by = oy + b.y * ch;
    const bw = b.w * cw;
    const bh = b.h * ch;
    root.appendChild(svg('rect', {
      x: bx, y: by, width: bw, height: bh, rx: '3',
      fill: b.color, opacity: '0.2', stroke: b.color, 'stroke-width': '1',
    }));
    root.appendChild(svg('text', {
      x: bx + bw / 2, y: by + bh / 2 + 4, 'text-anchor': 'middle',
      fill: b.color, 'font-size': '10', 'font-weight': '600',
      'font-family': 'system-ui, sans-serif',
    }, [b.name]));
  });

  // Peak memory line
  const peakY = oy + 0.6 * ch;
  root.appendChild(svg('line', {
    x1: ox, y1: peakY, x2: ox + cw, y2: peakY,
    stroke: COLORS.danger, 'stroke-width': '1', 'stroke-dasharray': '4,3',
  }));
  root.appendChild(svg('text', {
    x: ox + cw + 5, y: peakY + 4,
    fill: COLORS.danger, 'font-size': '9',
    'font-family': 'system-ui, sans-serif',
  }, ['peak']));

  container.appendChild(root);
}

// Architecture Overview
function renderArchDiagram(container) {
  const w = 600, h = 260;
  const root = svg('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}` });

  const defs = svg('defs');
  const marker = svg('marker', {
    id: 'arrow3', viewBox: '0 0 10 6', refX: '10', refY: '3',
    markerWidth: '7', markerHeight: '5', orient: 'auto',
  });
  marker.appendChild(svg('path', { d: 'M0,0 L10,3 L0,6', fill: COLORS.textMuted }));
  defs.appendChild(marker);
  root.appendChild(defs);

  function drawPkg(x, y, w, h, title, color, items) {
    root.appendChild(svg('rect', { x, y, width: w, height: h, rx: '8', fill: COLORS.bgTertiary, stroke: color, 'stroke-width': '1.5' }));
    root.appendChild(svg('text', {
      x: x + w / 2, y: y + 18, 'text-anchor': 'middle',
      fill: color, 'font-size': '12', 'font-weight': '700',
      'font-family': 'system-ui, sans-serif',
    }, [title]));
    items.forEach((item, i) => {
      root.appendChild(svg('text', {
        x: x + w / 2, y: y + 36 + i * 16, 'text-anchor': 'middle',
        fill: COLORS.textMuted, 'font-size': '10',
        'font-family': 'system-ui, sans-serif',
      }, [item]));
    });
  }

  // Compiler package
  drawPkg(30, 20, 240, 110, '@nn-deploy/compiler', COLORS.purple,
    ['Parser (DSL / JSON)', 'IR (Graph, Ops, Types)', 'Passes (7 optimizations)', 'Codegen (JS / WGSL / WASM)']);

  // Runtime package
  drawPkg(330, 20, 240, 95, '@nn-deploy/runtime', COLORS.orange,
    ['Tensor', 'JS Engine / WebGPU Engine', 'InferenceSession']);

  // Web app
  drawPkg(150, 170, 300, 75, 'apps/web (Next.js)', COLORS.accent,
    ['Playground / Inference / Landing', 'Graph Visualization (D3 + ELK)', 'Zustand State Management']);

  // Arrows: compiler -> web
  root.appendChild(svg('line', {
    x1: 150, y1: 130, x2: 240, y2: 170,
    stroke: COLORS.textMuted, 'stroke-width': '1.2', 'marker-end': 'url(#arrow3)',
  }));
  // runtime -> web
  root.appendChild(svg('line', {
    x1: 450, y1: 115, x2: 370, y2: 170,
    stroke: COLORS.textMuted, 'stroke-width': '1.2', 'marker-end': 'url(#arrow3)',
  }));
  // compiler -> runtime
  root.appendChild(svg('line', {
    x1: 270, y1: 65, x2: 330, y2: 65,
    stroke: COLORS.textMuted, 'stroke-width': '1.2', 'marker-end': 'url(#arrow3)',
  }));

  container.appendChild(root);
}

// Initialize diagrams
document.addEventListener('DOMContentLoaded', () => {
  const targets = {
    'diagram-pipeline': renderPipelineDiagram,
    'diagram-fusion': renderFusionDiagram,
    'diagram-memory': renderMemoryDiagram,
    'diagram-arch': renderArchDiagram,
  };

  for (const [id, fn] of Object.entries(targets)) {
    const el = document.getElementById(id);
    if (el) fn(el);
  }
});
