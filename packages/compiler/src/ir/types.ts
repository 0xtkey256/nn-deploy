// Primitive data types supported by the compiler
export type DataType = 'float32' | 'float16' | 'int32' | 'int64' | 'int8' | 'uint8' | 'bool';

// Memory layout for multi-dimensional tensors
export type Layout = 'NCHW' | 'NHWC';

// Tensor type with shape and layout information
export interface TensorType {
  dtype: DataType;
  shape: number[];
  layout?: Layout;
}

// Quantization configuration for deployment optimization
export interface QuantizationConfig {
  scheme: 'symmetric' | 'asymmetric';
  bits: 4 | 8;
  scale?: number;
  zeroPoint?: number;
  perChannel?: boolean;
}

// Byte sizes for each data type
const DTYPE_BYTES: Record<DataType, number> = {
  float32: 4,
  float16: 2,
  int32: 4,
  int64: 8,
  int8: 1,
  uint8: 1,
  bool: 1,
};

export function dtypeBytes(dtype: DataType): number {
  return DTYPE_BYTES[dtype];
}

export function shapeNumel(shape: number[]): number {
  return shape.reduce((a, b) => a * b, 1);
}

export function tensorByteSize(t: TensorType): number {
  return shapeNumel(t.shape) * dtypeBytes(t.dtype);
}

export function shapeToString(shape: number[]): string {
  return `[${shape.join(', ')}]`;
}

export function tensorTypeToString(t: TensorType): string {
  const layout = t.layout ? `, ${t.layout}` : '';
  return `Tensor<${t.dtype}>${shapeToString(t.shape)}${layout}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatFLOPs(flops: number): string {
  if (flops < 1e3) return `${flops}`;
  if (flops < 1e6) return `${(flops / 1e3).toFixed(1)}K`;
  if (flops < 1e9) return `${(flops / 1e6).toFixed(1)}M`;
  if (flops < 1e12) return `${(flops / 1e9).toFixed(1)}G`;
  return `${(flops / 1e12).toFixed(2)}T`;
}
