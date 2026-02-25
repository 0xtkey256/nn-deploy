# nn-deploy

Neural Network Compiler Stack & Deployment Platform

[![Live Demo](https://img.shields.io/badge/demo-nn--deploy.vercel.app-blue)](https://nn-deploy.vercel.app)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-green)](https://0xtkey256.github.io/nn-deploy/)

A full-stack neural network compiler that runs entirely in the browser. Define models with a simple DSL, compile through an optimization pipeline, generate executable code, and run inference — all client-side.

## Pipeline

```
Define → Parse → Optimize → Codegen → Deploy
 DSL     Graph    7 Passes   JS/GPU    Browser
```

## Features

- **Multi-Level IR** — Immutable graph with 38 ops across 10 categories
- **7 Optimization Passes** — Shape inference, constant folding, DCE, operator fusion, INT8 quantization, layout optimization, memory planning
- **3 Code Gen Backends** — JavaScript, WebGPU (WGSL compute shaders), WASM
- **In-Browser Inference** — Runtime with auto engine selection (WebGPU → JS fallback)
- **Interactive Playground** — Graph visualization (D3 + ELK), timeline scrubber, generated code view
- **5 Example Models** — MNIST MLP, Tiny CNN, ResNet Block, Transformer, Depthwise Separable Conv

## Quick Start

```bash
git clone https://github.com/0xtkey256/nn-deploy.git
cd nn-deploy
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000)

## DSL Example

```
model MNIST_MLP {
  input x: Tensor<float32>[1, 784]

  h1 = MatMul(x, w1)
  h1b = Add(h1, b1)
  a1 = ReLU(h1b)

  h2 = MatMul(a1, w2)
  h2b = Add(h2, b2)
  probs = Softmax(h2b)

  output probs
}
```

## Project Structure

```
nn-deploy/
├── apps/web/            # Next.js frontend
├── packages/
│   ├── compiler/        # IR, parsers, passes, codegen
│   └── runtime/         # Tensor, engines, InferenceSession
├── examples/            # JSON model definitions
└── docs/                # GitHub Pages documentation
```

## Tech Stack

TypeScript · Next.js 15 · React 19 · Turborepo · D3.js · ELK.js · WebGPU · Zustand · Tailwind CSS v4

## Links

- **Live App**: [nn-deploy.vercel.app](https://nn-deploy.vercel.app)
- **Playground**: [nn-deploy.vercel.app/playground](https://nn-deploy.vercel.app/playground)
- **Docs**: [0xtkey256.github.io/nn-deploy](https://0xtkey256.github.io/nn-deploy/)
