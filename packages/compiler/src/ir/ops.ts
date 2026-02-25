// Operation type enumeration
export type OpType =
  // I/O
  | 'Input' | 'Output' | 'Constant'
  // Linear algebra
  | 'MatMul' | 'Add' | 'Sub' | 'Mul' | 'Div'
  // Convolution
  | 'Conv2D' | 'DepthwiseConv2D' | 'ConvTranspose2D'
  // Normalization
  | 'BatchNorm' | 'LayerNorm' | 'GroupNorm' | 'InstanceNorm'
  // Activation
  | 'ReLU' | 'GELU' | 'Sigmoid' | 'Tanh' | 'Softmax' | 'SiLU'
  // Pooling
  | 'MaxPool2D' | 'AvgPool2D' | 'GlobalAvgPool' | 'AdaptiveAvgPool'
  // Shape
  | 'Reshape' | 'Transpose' | 'Flatten' | 'Concat' | 'Split' | 'Squeeze' | 'Unsqueeze'
  // Reduction
  | 'ReduceSum' | 'ReduceMean' | 'ReduceMax'
  // Embedding / Attention
  | 'Embedding' | 'ScaledDotProductAttention'
  // Fused
  | 'FusedConvBNReLU' | 'FusedConvBN' | 'FusedMatMulAdd' | 'FusedLinearReLU';

export type OpCategory =
  | 'io'
  | 'linear'
  | 'conv'
  | 'norm'
  | 'activation'
  | 'pooling'
  | 'shape'
  | 'reduce'
  | 'embedding'
  | 'fused';

export interface OpSignature {
  minInputs: number;
  maxInputs: number;
  numOutputs: number;
  description: string;
  category: OpCategory;
}

export const OP_REGISTRY: Record<OpType, OpSignature> = {
  // I/O
  Input:    { minInputs: 0, maxInputs: 0, numOutputs: 1, description: 'Model input tensor', category: 'io' },
  Output:   { minInputs: 1, maxInputs: 1, numOutputs: 0, description: 'Model output tensor', category: 'io' },
  Constant: { minInputs: 0, maxInputs: 0, numOutputs: 1, description: 'Constant tensor value', category: 'io' },

  // Linear algebra
  MatMul: { minInputs: 2, maxInputs: 2, numOutputs: 1, description: 'Matrix multiplication', category: 'linear' },
  Add:    { minInputs: 2, maxInputs: 2, numOutputs: 1, description: 'Element-wise addition', category: 'linear' },
  Sub:    { minInputs: 2, maxInputs: 2, numOutputs: 1, description: 'Element-wise subtraction', category: 'linear' },
  Mul:    { minInputs: 2, maxInputs: 2, numOutputs: 1, description: 'Element-wise multiplication', category: 'linear' },
  Div:    { minInputs: 2, maxInputs: 2, numOutputs: 1, description: 'Element-wise division', category: 'linear' },

  // Convolution
  Conv2D:          { minInputs: 2, maxInputs: 3, numOutputs: 1, description: '2D convolution', category: 'conv' },
  DepthwiseConv2D: { minInputs: 2, maxInputs: 3, numOutputs: 1, description: 'Depthwise separable convolution', category: 'conv' },
  ConvTranspose2D: { minInputs: 2, maxInputs: 3, numOutputs: 1, description: 'Transposed 2D convolution', category: 'conv' },

  // Normalization
  BatchNorm:    { minInputs: 1, maxInputs: 5, numOutputs: 1, description: 'Batch normalization', category: 'norm' },
  LayerNorm:    { minInputs: 1, maxInputs: 3, numOutputs: 1, description: 'Layer normalization', category: 'norm' },
  GroupNorm:    { minInputs: 1, maxInputs: 3, numOutputs: 1, description: 'Group normalization', category: 'norm' },
  InstanceNorm: { minInputs: 1, maxInputs: 3, numOutputs: 1, description: 'Instance normalization', category: 'norm' },

  // Activation
  ReLU:    { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Rectified linear unit', category: 'activation' },
  GELU:    { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Gaussian error linear unit', category: 'activation' },
  Sigmoid: { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Sigmoid activation', category: 'activation' },
  Tanh:    { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Hyperbolic tangent', category: 'activation' },
  Softmax: { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Softmax normalization', category: 'activation' },
  SiLU:    { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Sigmoid linear unit (Swish)', category: 'activation' },

  // Pooling
  MaxPool2D:      { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Max pooling 2D', category: 'pooling' },
  AvgPool2D:      { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Average pooling 2D', category: 'pooling' },
  GlobalAvgPool:  { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Global average pooling', category: 'pooling' },
  AdaptiveAvgPool:{ minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Adaptive average pooling', category: 'pooling' },

  // Shape
  Reshape:   { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Reshape tensor dimensions', category: 'shape' },
  Transpose: { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Transpose tensor axes', category: 'shape' },
  Flatten:   { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Flatten to 2D', category: 'shape' },
  Concat:    { minInputs: 2, maxInputs: 16, numOutputs: 1, description: 'Concatenate tensors along axis', category: 'shape' },
  Split:     { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Split tensor along axis', category: 'shape' },
  Squeeze:   { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Remove size-1 dimensions', category: 'shape' },
  Unsqueeze: { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Insert size-1 dimension', category: 'shape' },

  // Reduction
  ReduceSum:  { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Sum reduction along axes', category: 'reduce' },
  ReduceMean: { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Mean reduction along axes', category: 'reduce' },
  ReduceMax:  { minInputs: 1, maxInputs: 1, numOutputs: 1, description: 'Max reduction along axes', category: 'reduce' },

  // Embedding / Attention
  Embedding:                  { minInputs: 2, maxInputs: 2, numOutputs: 1, description: 'Embedding lookup', category: 'embedding' },
  ScaledDotProductAttention:  { minInputs: 3, maxInputs: 4, numOutputs: 1, description: 'Scaled dot-product attention (Q, K, V)', category: 'embedding' },

  // Fused operations
  FusedConvBNReLU: { minInputs: 2, maxInputs: 5, numOutputs: 1, description: 'Fused Conv2D + BatchNorm + ReLU', category: 'fused' },
  FusedConvBN:     { minInputs: 2, maxInputs: 5, numOutputs: 1, description: 'Fused Conv2D + BatchNorm', category: 'fused' },
  FusedMatMulAdd:  { minInputs: 3, maxInputs: 3, numOutputs: 1, description: 'Fused MatMul + Add (linear layer)', category: 'fused' },
  FusedLinearReLU: { minInputs: 3, maxInputs: 3, numOutputs: 1, description: 'Fused MatMul + Add + ReLU', category: 'fused' },
};

export const OP_COLORS: Record<OpCategory, string> = {
  io:         '#6366f1', // indigo
  linear:     '#3b82f6', // blue
  conv:       '#8b5cf6', // violet
  norm:       '#ec4899', // pink
  activation: '#10b981', // emerald
  pooling:    '#f59e0b', // amber
  shape:      '#6b7280', // gray
  reduce:     '#ef4444', // red
  embedding:  '#06b6d4', // cyan
  fused:      '#f97316', // orange
};

export function getOpCategory(op: OpType): OpCategory {
  return OP_REGISTRY[op].category;
}

export function getOpColor(op: OpType): string {
  return OP_COLORS[getOpCategory(op)];
}
