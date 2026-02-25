'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useCompilerStore } from '@/stores/compiler-store';
import { getOpColor, OP_REGISTRY, type Graph, type Node as GraphNode } from '@nn-deploy/compiler';
import * as d3 from 'd3';

interface ElkNode {
  id: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  labels?: { text: string }[];
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
  sections?: { startPoint: { x: number; y: number }; endPoint: { x: number; y: number }; bendPoints?: { x: number; y: number }[] }[];
}

interface ElkGraph {
  id: string;
  children: ElkNode[];
  edges: ElkEdge[];
  layoutOptions?: Record<string, string>;
}

async function layoutGraph(graph: Graph): Promise<ElkGraph> {
  const ELK = (await import('elkjs/lib/elk.bundled.js')).default;
  const elk = new ELK();

  const elkGraph: ElkGraph = {
    id: 'root',
    children: graph.nodes.map(n => ({
      id: n.id,
      width: 180,
      height: 56,
      labels: [{ text: n.name }],
    })),
    edges: graph.edges.map(e => ({
      id: e.id,
      sources: [e.sourceNodeId],
      targets: [e.targetNodeId],
    })),
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '20',
      'elk.layered.spacing.nodeNodeBetweenLayers': '40',
      'elk.edgeRouting': 'ORTHOGONAL',
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await elk.layout(elkGraph as any)) as unknown as ElkGraph;
}

export default function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { history, currentStep, selectNode, selectedNodeId } = useCompilerStore();

  const currentGraph = useMemo(
    () => (history.length > 0 ? history[currentStep]?.graph : null),
    [history, currentStep]
  );

  useEffect(() => {
    if (!currentGraph || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    layoutGraph(currentGraph).then(layout => {
      if (!layout.children) return;

      // Define arrow marker
      svg.append('defs')
        .append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 0 10 6')
        .attr('refX', 10)
        .attr('refY', 3)
        .attr('markerWidth', 8)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,0 L10,3 L0,6')
        .attr('fill', 'var(--text-muted)');

      // Draw edges
      if (layout.edges) {
        for (const edge of layout.edges) {
          if (!edge.sections) continue;
          for (const section of edge.sections) {
            const points: [number, number][] = [
              [section.startPoint.x, section.startPoint.y],
              ...(section.bendPoints?.map(p => [p.x, p.y] as [number, number]) ?? []),
              [section.endPoint.x, section.endPoint.y],
            ];
            const line = d3.line().curve(d3.curveBasis);
            g.append('path')
              .attr('d', line(points))
              .attr('fill', 'none')
              .attr('stroke', 'var(--text-muted)')
              .attr('stroke-width', 1.5)
              .attr('marker-end', 'url(#arrow)')
              .attr('class', 'graph-edge');
          }
        }
      }

      // Draw nodes
      for (const elkNode of layout.children) {
        const node = currentGraph.nodes.find(n => n.id === elkNode.id);
        if (!node || elkNode.x === undefined || elkNode.y === undefined) continue;

        const color = getOpColor(node.op);
        const isSelected = node.id === selectedNodeId;
        const nodeG = g.append('g')
          .attr('class', `graph-node ${isSelected ? 'selected' : ''}`)
          .attr('transform', `translate(${elkNode.x}, ${elkNode.y})`)
          .on('click', () => selectNode(node.id));

        // Background rect
        nodeG.append('rect')
          .attr('width', elkNode.width)
          .attr('height', elkNode.height)
          .attr('rx', 6)
          .attr('fill', 'var(--bg-secondary)')
          .attr('stroke', isSelected ? 'var(--accent)' : 'var(--border)')
          .attr('stroke-width', isSelected ? 2 : 1);

        // Color bar
        nodeG.append('rect')
          .attr('width', 4)
          .attr('height', elkNode.height)
          .attr('rx', 2)
          .attr('fill', color);

        // Op type label
        nodeG.append('text')
          .attr('x', 14)
          .attr('y', 22)
          .attr('fill', color)
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .text(node.op);

        // Node name
        nodeG.append('text')
          .attr('x', 14)
          .attr('y', 40)
          .attr('fill', 'var(--text-secondary)')
          .attr('font-size', '10px')
          .text(node.name);

        // Shape badge
        const outEdge = currentGraph.edges.find(e => e.sourceNodeId === node.id);
        if (outEdge?.tensorType) {
          const shapeStr = `[${outEdge.tensorType.shape.join(',')}]`;
          nodeG.append('text')
            .attr('x', elkNode.width - 8)
            .attr('y', 14)
            .attr('text-anchor', 'end')
            .attr('fill', 'var(--text-muted)')
            .attr('font-size', '9px')
            .attr('font-family', 'var(--font-geist-mono), monospace')
            .text(shapeStr);
        }
      }

      // Auto-fit
      const bounds = (g.node() as SVGGElement).getBBox();
      const scale = Math.min(
        (width - 40) / bounds.width,
        (height - 40) / bounds.height,
        1.5
      );
      const tx = (width - bounds.width * scale) / 2 - bounds.x * scale;
      const ty = (height - bounds.height * scale) / 2 - bounds.y * scale;
      svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    });
  }, [currentGraph, selectedNodeId, selectNode]);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 relative">
      {!currentGraph ? (
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
          <div className="text-center">
            <div className="text-lg mb-2">No graph to display</div>
            <div className="text-sm">Write a model DSL and click Compile</div>
          </div>
        </div>
      ) : (
        <svg ref={svgRef} className="w-full h-full" />
      )}
      {currentGraph && (
        <div
          className="absolute bottom-3 left-3 text-xs px-2 py-1 rounded"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          {currentGraph.nodes.length} nodes &middot; {currentGraph.edges.length} edges
        </div>
      )}
    </div>
  );
}
