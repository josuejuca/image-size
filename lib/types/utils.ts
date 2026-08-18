const decoder = new TextDecoder()
export const toUTF8String = (
  input: Uint8Array,
  start = 0,
  end = input.length,
) => {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    return input.toString('utf8', start, end)
  }
  const slice = input.subarray ? input.subarray(start, end) : input.slice(start, end)
  return decoder.decode(new Uint8Array(slice.buffer, slice.byteOffset, slice.byteLength))
}

export const toHexString = (input: Uint8Array, start = 0, end = input.length) => {
  const slice = input.subarray ? input.subarray(start, end) : input.slice(start, end)
  let memo = ''
  for (let i = 0; i < slice.length; i++) {
    memo += `0${slice[i].toString(16)}`.slice(-2)
  }
  return memo
}

export const readInt16LE = (input: Uint8Array, offset = 0) => {
  const val = input[offset] | (input[offset + 1] << 8)
  return (val << 16) >> 16
}

export const readUInt16BE = (input: Uint8Array, offset = 0) =>
  ((input[offset] << 8) | input[offset + 1]) >>> 0

export const readUInt16LE = (input: Uint8Array, offset = 0) =>
  (input[offset] | (input[offset + 1] << 8)) >>> 0

export const readUInt24LE = (input: Uint8Array, offset = 0) =>
  (input[offset] | (input[offset + 1] << 8) | (input[offset + 2] << 16)) >>> 0

export const readInt32LE = (input: Uint8Array, offset = 0) =>
  (input[offset] | (input[offset + 1] << 8) | (input[offset + 2] << 16) | (input[offset + 3] << 24))

export const readUInt32BE = (input: Uint8Array, offset = 0) =>
  ((input[offset] * 0x1000000) + ((input[offset + 1] << 16) | (input[offset + 2] << 8) | input[offset + 3])) >>> 0

export const readUInt32LE = (input: Uint8Array, offset = 0) =>
  ((input[offset]) | (input[offset + 1] << 8) | (input[offset + 2] << 16) | (input[offset + 3] * 0x1000000)) >>> 0

export const readUInt64 = (
  input: Uint8Array,
  offset: number,
  isBigEndian: boolean,
): bigint => {
  const first = readUInt32BE(input, isBigEndian ? offset : offset + 4)
  const second = readUInt32BE(input, isBigEndian ? offset + 4 : offset)
  return (BigInt(first) << 32n) | BigInt(second)
}

// Abstract reading multi-byte unsigned integers
const methods = {
  readUInt16BE,
  readUInt16LE,
  readUInt32BE,
  readUInt32LE,
} as const

type MethodName = keyof typeof methods
export function readUInt(
  input: Uint8Array,
  bits: 16 | 32,
  offset = 0,
  isBigEndian = false,
): number {
  const endian = isBigEndian ? 'BE' : 'LE'
  const methodName = `readUInt${bits}${endian}` as MethodName
  return methods[methodName](input, offset)
}

function readBox(input: Uint8Array, offset: number) {
  if (input.length - offset < 8) return
  const boxSize = readUInt32BE(input, offset)
  if (boxSize < 8 && boxSize !== 0) return
  if (boxSize > 0 && input.length - offset < boxSize) return
  return {
    name: toUTF8String(input, 4 + offset, 8 + offset),
    offset,
    size: boxSize,
  }
}

export function findBox(
  input: Uint8Array,
  boxName: string,
  currentOffset: number,
) {
  while (currentOffset + 8 <= input.length) {
    const box = readBox(input, currentOffset)
    if (!box) break
    if (box.name === boxName) return box
    const increment = box.size > 0 ? box.size : 8
    currentOffset += increment
  }
}
