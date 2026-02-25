export interface ModelExample {
  name: string;
  description: string;
  category: string;
  dsl: string;
}

export const EXAMPLES: ModelExample[] = [
  {
    name: 'MNIST MLP',
    description: 'Simple multi-layer perceptron for digit classification',
    category: 'Classic',
    dsl: `model MNIST_MLP {
  input x: Tensor<float32>[1, 784]

  // Hidden layer
  h1 = MatMul(x, w1)
  h1b = Add(h1, b1)
  a1 = ReLU(h1b)

  // Output layer
  h2 = MatMul(a1, w2)
  h2b = Add(h2, b2)
  probs = Softmax(h2b)

  output probs
}`,
  },
  {
    name: 'Tiny CNN',
    description: 'Small CNN with conv + pool + fc layers',
    category: 'CNN',
    dsl: `model TinyCNN {
  input x: Tensor<float32>[1, 3, 32, 32]

  // Conv block 1
  c1 = Conv2D(x, w1, filters=16, kernel=3, stride=1, padding=same)
  bn1 = BatchNorm(c1)
  r1 = ReLU(bn1)
  p1 = MaxPool2D(r1, kernel=2, stride=2)

  // Conv block 2
  c2 = Conv2D(p1, w2, filters=32, kernel=3, stride=1, padding=same)
  bn2 = BatchNorm(c2)
  r2 = ReLU(bn2)
  p2 = MaxPool2D(r2, kernel=2, stride=2)

  // Classifier
  gap = GlobalAvgPool(p2)
  flat = Flatten(gap)
  logits = MatMul(flat, wfc)
  out = Softmax(logits)

  output out
}`,
  },
  {
    name: 'ResNet Block',
    description: 'Residual block with skip connection',
    category: 'CNN',
    dsl: `model ResNetBlock {
  input x: Tensor<float32>[1, 64, 16, 16]

  // Main path
  c1 = Conv2D(x, w1, filters=64, kernel=3, stride=1, padding=same)
  bn1 = BatchNorm(c1)
  r1 = ReLU(bn1)

  c2 = Conv2D(r1, w2, filters=64, kernel=3, stride=1, padding=same)
  bn2 = BatchNorm(c2)

  // Residual connection
  res = Add(x, bn2)
  out = ReLU(res)

  output out
}`,
  },
  {
    name: 'Transformer Block',
    description: 'Single transformer layer with attention and FFN',
    category: 'Transformer',
    dsl: `model TransformerBlock {
  input tokens: Tensor<float32>[1, 32, 64]

  // Self-attention
  ln1 = LayerNorm(tokens)
  q = MatMul(ln1, wq)
  k = MatMul(ln1, wk)
  v = MatMul(ln1, wv)
  attn = ScaledDotProductAttention(q, k, v)
  proj = MatMul(attn, wo)
  res1 = Add(tokens, proj)

  // Feed-forward
  ln2 = LayerNorm(res1)
  ff1 = MatMul(ln2, w1)
  ff1b = Add(ff1, b1)
  act = GELU(ff1b)
  ff2 = MatMul(act, w2)
  ff2b = Add(ff2, b2)
  out = Add(res1, ff2b)

  output out
}`,
  },
  {
    name: 'Depthwise Separable Conv',
    description: 'MobileNet-style efficient convolution',
    category: 'Efficient',
    dsl: `model DepthwiseSeparable {
  input x: Tensor<float32>[1, 32, 16, 16]

  // Depthwise conv
  dw = DepthwiseConv2D(x, dw_w, kernel=3, stride=1, padding=same)
  dw_bn = BatchNorm(dw)
  dw_relu = ReLU(dw_bn)

  // Pointwise conv (1x1)
  pw = Conv2D(dw_relu, pw_w, filters=64, kernel=1, stride=1)
  pw_bn = BatchNorm(pw)
  out = ReLU(pw_bn)

  output out
}`,
  },
];

export const DEFAULT_EXAMPLE = EXAMPLES[0];
