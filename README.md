# nn-deploy

Neural Network Compiler Stack & Deployment Platform

[![Live Demo](https://img.shields.io/badge/demo-nn--deploy.vercel.app-blue)](https://nn-deploy.vercel.app)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-green)](https://0xtkey256.github.io/nn-deploy/)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](./CONTRIBUTING.md)

A full-stack, open-source neural network compiler that runs entirely in the browser. Define models with a simple DSL, compile through an optimization pipeline, generate executable code, and run inference — all client-side.

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

| Technology | Role | Link |
|---|---|---|
| [TypeScript](https://www.typescriptlang.org/) | Language | Strict mode, ES2022 target |
| [Next.js](https://nextjs.org/) 15 | Web framework | App Router, React Server Components |
| [React](https://react.dev/) 19 | UI library | Client components for interactive views |
| [Turborepo](https://turbo.build/repo) | Monorepo build | Parallel builds, task caching |
| [D3.js](https://d3js.org/) | Visualization | Graph rendering, zoom/pan interaction |
| [ELK.js](https://www.eclipse.org/elk/) | Graph layout | Layered layout algorithm for IR graphs |
| [WebGPU](https://www.w3.org/TR/webgpu/) | GPU compute | WGSL compute shaders for inference |
| [Zustand](https://zustand.docs.pmnd.rs/) | State management | Compiler store, UI state |
| [Tailwind CSS](https://tailwindcss.com/) v4 | Styling | Utility-first CSS |
| [Vercel](https://vercel.com/) | Deployment | Production hosting |

## Contributing

Contributions are welcome! Please read the [Contributing Guide](./CONTRIBUTING.md) before submitting a PR.

## License

This project is licensed under the [MIT License](./LICENSE).

## Links

- **Live App**: [nn-deploy.vercel.app](https://nn-deploy.vercel.app)
- **Playground**: [nn-deploy.vercel.app/playground](https://nn-deploy.vercel.app/playground)
- **Documentation**: [0xtkey256.github.io/nn-deploy](https://0xtkey256.github.io/nn-deploy/)
