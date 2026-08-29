/** D1 may return BLOB as ArrayBuffer, Uint8Array, or number[]. */
export function toArrayBuffer(value: unknown): ArrayBuffer | null {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return view.buffer.slice(
      view.byteOffset,
      view.byteOffset + view.byteLength,
    ) as ArrayBuffer;
  }
  if (Array.isArray(value)) {
    return new Uint8Array(value).buffer;
  }
  return null;
}
