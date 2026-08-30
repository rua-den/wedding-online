import { extname } from "node:path";

export const MAX_AUDIO_BYTES = 30 * 1024 * 1024;
const mp3MimeTypes = new Set(["audio/mpeg", "audio/mp3"]);

function looksLikeMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 3) return false;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true; // ID3
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
}

export async function validateAudioFile(file: File): Promise<".mp3"> {
  if (file.size <= 0) throw new Error("Tệp nhạc đang trống.");
  if (file.size > MAX_AUDIO_BYTES) throw new Error("Nhạc không được vượt quá 30 MB.");
  if (extname(file.name).toLowerCase() !== ".mp3" || !mp3MimeTypes.has(file.type.toLowerCase())) {
    throw new Error("Hiện tại chỉ hỗ trợ tệp MP3.");
  }
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  if (!looksLikeMp3(header)) throw new Error("Tệp không có định dạng MP3 hợp lệ.");
  return ".mp3";
}
