const table = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
export function crc32(bytes: Uint8Array, start = 0, end = bytes.length) {
  let value = 0xffffffff;
  for (let index = start; index < end; index++)
    value = table[(value ^ bytes[index]!) & 255]! ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
