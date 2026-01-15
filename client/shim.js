import { Buffer } from "buffer";

if (typeof globalThis !== "undefined") {
  globalThis.Buffer = globalThis.Buffer || Buffer;
}
if (typeof global !== "undefined") {
  global.Buffer = global.Buffer || Buffer;
}
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
}
