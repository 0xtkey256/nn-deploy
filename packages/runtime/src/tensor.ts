import type { DataType, TensorType } from '@nn-deploy/compiler';
import { dtypeBytes, shapeNumel } from '@nn-deploy/compiler';

const TYPED_ARRAY_MAP = {
  float32: Float32Array,
  float16: Float32Array, // Use float32 storage for float16
  int32: Int32Array,
  int64: BigInt64Array,
  int8: Int8Array,
  uint8: Uint8Array,
  bool: Uint8Array,
} as const;

type TypedArrayFor<D extends DataType> = InstanceType<(typeof TYPED_ARRAY_MAP)[D]>;

export class Tensor {
  readonly data: Float32Array | Int32Array | Int8Array | Uint8Array;
  readonly shape: number[];
  readonly dtype: DataType;
  readonly strides: number[];

  constructor(data: ArrayLike<number> | Float32Array | Int32Array | Int8Array | Uint8Array, shape: number[], dtype: DataType = 'float32') {
    this.shape = shape;
    this.dtype = dtype;

    const expectedSize = shapeNumel(shape);
    if (data instanceof Float32Array || data instanceof Int32Array || data instanceof Int8Array || data instanceof Uint8Array) {
      this.data = data;
    } else {
      const Ctor = TYPED_ARRAY_MAP[dtype];
      if (Ctor === BigInt64Array) {
        this.data = new Int32Array(expectedSize);
        for (let i = 0; i < Math.min(data.length, expectedSize); i++) {
          this.data[i] = Number(data[i]);
        }
      } else {
        this.data = new (Ctor as new (size: number) => Float32Array | Int32Array | Int8Array | Uint8Array)(expectedSize);
        for (let i = 0; i < Math.min(data.length, expectedSize); i++) {
          (this.data as Float32Array)[i] = data[i];
        }
      }
    }

    // Compute strides (row-major)
    this.strides = new Array(shape.length);
    let stride = 1;
    for (let i = shape.length - 1; i >= 0; i--) {
      this.strides[i] = stride;
      stride *= shape[i];
    }
  }

  get numel(): number {
    return shapeNumel(this.shape);
  }

  get byteSize(): number {
    return this.numel * dtypeBytes(this.dtype);
  }

  get ndim(): number {
    return this.shape.length;
  }

  get tensorType(): TensorType {
    return { dtype: this.dtype, shape: this.shape };
  }

  static zeros(shape: number[], dtype: DataType = 'float32'): Tensor {
    const size = shapeNumel(shape);
    return new Tensor(new Float32Array(size), shape, dtype);
  }

  static ones(shape: number[], dtype: DataType = 'float32'): Tensor {
    const size = shapeNumel(shape);
    const data = new Float32Array(size).fill(1);
    return new Tensor(data, shape, dtype);
  }

  static rand(shape: number[], dtype: DataType = 'float32'): Tensor {
    const size = shapeNumel(shape);
    const data = new Float32Array(size);
    for (let i = 0; i < size; i++) data[i] = Math.random();
    return new Tensor(data, shape, dtype);
  }

  static randn(shape: number[], dtype: DataType = 'float32'): Tensor {
    const size = shapeNumel(shape);
    const data = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      // Box-Muller transform
      const u1 = Math.random();
      const u2 = Math.random();
      data[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    return new Tensor(data, shape, dtype);
  }

  reshape(newShape: number[]): Tensor {
    return new Tensor(this.data, newShape, this.dtype);
  }

  clone(): Tensor {
    const newData = (this.data as Float32Array).slice();
    return new Tensor(newData, [...this.shape], this.dtype);
  }

  toArray(): number[] {
    return Array.from(this.data as Float32Array);
  }

  toString(): string {
    return `Tensor<${this.dtype}>[${this.shape.join(', ')}]`;
  }
}
