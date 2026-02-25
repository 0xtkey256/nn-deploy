# Contributing to nn-deploy

Thanks for your interest in contributing! This guide will help you get started.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/nn-deploy.git
   cd nn-deploy
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Start** the dev server:
   ```bash
   npm run dev
   ```

## Project Structure

```
nn-deploy/
├── apps/web/            # Next.js frontend (pages, components, stores)
├── packages/
│   ├── compiler/        # Core compiler (IR, parsers, passes, codegen)
│   ├── runtime/         # Inference runtime (Tensor, engines, session)
│   └── ui/              # Shared UI components
├── examples/            # JSON model definitions
└── docs/                # GitHub Pages documentation
```

## Development Workflow

### Branch Naming

- `feat/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation changes
- `refactor/description` — Code refactoring

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new optimization pass for loop tiling
fix: resolve shape inference for transposed convolutions
docs: update DSL guide with new operations
refactor: simplify memory planning algorithm
```

### Build & Verify

```bash
# Build all packages
npm run build

# Build a specific package
npm run build --workspace=@nn-deploy/compiler
```

## Where to Contribute

### Good First Issues

- Add a new activation function (e.g., Mish, HardSwish)
- Improve error messages in the DSL parser
- Add more example models
- Fix typos or improve documentation

### Compiler

- **New Operations**: Add to `packages/compiler/src/ir/ops.ts`, implement shape inference in `packages/compiler/src/passes/shape-inference.ts`, and add codegen in the backend files
- **Optimization Passes**: Create a new file in `packages/compiler/src/passes/` implementing the `OptimizationPass` interface
- **Code Generation**: Improve existing backends or add new ones in `packages/compiler/src/codegen/`

### Runtime

- **Engine Improvements**: Optimize the JS engine kernels or extend WebGPU shader support
- **Tensor Operations**: Add utility methods to `packages/runtime/src/tensor.ts`

### Web App

- **UI/UX**: Improve the playground, graph visualization, or inference page
- **Accessibility**: Improve keyboard navigation and screen reader support

### Documentation

- **Docs Site**: Edit files in `docs/` (pure HTML/CSS/JS, no build step)
- **Code Comments**: Add JSDoc comments to exported functions

## Pull Request Process

1. Create a branch from `main`
2. Make your changes
3. Ensure `npm run build` passes
4. Write a clear PR description explaining:
   - **What** you changed
   - **Why** you changed it
   - **How** to test it
5. Submit the PR

## Code Style

- TypeScript strict mode
- Functional, immutable patterns for compiler code (each pass returns a new Graph)
- React functional components with hooks
- Descriptive variable names over comments

## Reporting Bugs

Open an [issue](https://github.com/0xtkey256/nn-deploy/issues) with:

- Steps to reproduce
- Expected vs actual behavior
- Browser and OS version
- Console errors (if any)

## Feature Requests

Open an [issue](https://github.com/0xtkey256/nn-deploy/issues) with:

- Description of the feature
- Use case / motivation
- Suggested implementation approach (optional)

## Questions?

Open a [Discussion](https://github.com/0xtkey256/nn-deploy/discussions) or reach out via issues.
