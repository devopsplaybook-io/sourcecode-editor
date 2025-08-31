import * as zlib from "zlib";
import * as util from "util";

const gzip = util.promisify(zlib.gzip);
const deflate = util.promisify(zlib.deflate);
const brotliCompress = util.promisify(zlib.brotliCompress);
const gunzip = util.promisify(zlib.gunzip);
const inflate = util.promisify(zlib.inflate);
const brotliDecompress = util.promisify(zlib.brotliDecompress);

export async function ApiUtilsCompressJson(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonData: any,
  method = "gzip"
): Promise<string> {
  const jsonString = JSON.stringify(jsonData);
  let compressedBuffer;
  switch (method) {
    case "deflate":
      compressedBuffer = await deflate(jsonString);
      break;
    case "brotli":
      compressedBuffer = await brotliCompress(jsonString);
      break;
    case "gzip":
    default:
      compressedBuffer = await gzip(jsonString);
  }
  return compressedBuffer.toString("base64");
}

export async function ApiUtilsDecompress(
  compressedBase64: string,
  method = "gzip"
): Promise<string> {
  const compressedBuffer = Buffer.from(compressedBase64, "base64");
  let decompressedBuffer;
  switch (method) {
    case "deflate":
      decompressedBuffer = await inflate(compressedBuffer);
      break;
    case "brotli":
      decompressedBuffer = await brotliDecompress(compressedBuffer);
      break;
    case "gzip":
    default:
      decompressedBuffer = await gunzip(compressedBuffer);
  }
  return decompressedBuffer.toString();
}
