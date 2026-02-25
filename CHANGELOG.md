# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-02-25

### Added

- Custom DSL and JSON parser for neural network model definitions
- Immutable graph IR with 38 operations across 10 categories
- 7 optimization passes:
  - Shape inference
  - Constant folding
  - Dead code elimination
  - Operator fusion (Conv+BN+ReLU, MatMul+Add, etc.)
  - INT8 quantization
  - Layout optimization (NCHW to NHWC)
  - Memory planning with liveness analysis
- 3 code generation backends: JavaScript, WebGPU (WGSL), WASM
- Runtime with Tensor class, JS engine, and WebGPU engine
- InferenceSession API with automatic engine selection
- Next.js web application:
  - Landing page with pipeline visualization
  - Interactive compiler playground with graph visualization (D3 + ELK)
  - Inference page with image classification and text generation demos
- 5 example models (MNIST MLP, Tiny CNN, ResNet Block, Transformer, Depthwise Separable Conv)
- Documentation site on GitHub Pages
- Deployed to Vercel
