import { registerPlugin, Capacitor } from "@capacitor/core";

interface VideoSaverPlugin {
  startSave(options: { fileName: string; mimeType: string; album?: string }): Promise<{ sessionId: string }>;
  appendChunk(options: { sessionId: string; data: string }): Promise<void>;
  finishSave(options: { sessionId: string }): Promise<{ uri: string }>;
  abortSave(options: { sessionId: string }): Promise<void>;
}

const VideoSaver = registerPlugin<VideoSaverPlugin>("VideoSaver");

/** True only inside the Capacitor Android shell, and only once the native plugin is actually registered. */
export function hasNativeVideoSaver() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("VideoSaver");
}

function blobChunkToBase64(chunk: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(chunk);
  });
}

/**
 * Saves a video Blob directly to the device's shared Movies library via
 * Android's MediaStore — Movies/<album> — with no share sheet, chooser, or
 * destination prompt. See VideoSaverPlugin.java for the native side.
 *
 * The blob is sent in small sequential chunks rather than as one giant
 * base64 string: a single multi-ten-megabyte bridge message is a known way
 * to make the Capacitor JS↔native bridge choke or fail outright, so this
 * keeps every individual call small regardless of the overall file size,
 * and never holds more than one chunk's worth of base64 text in memory at
 * a time.
 */
export async function saveVideoToDevice(
  blob: Blob,
  fileName: string,
  mimeType: string,
  album?: string
): Promise<{ uri: string }> {
  const CHUNK_SIZE = 1_000_000; // ~1MB raw per bridge call
  const { sessionId } = await VideoSaver.startSave({ fileName, mimeType, album });
  try {
    for (let offset = 0; offset < blob.size; offset += CHUNK_SIZE) {
      const chunk = blob.slice(offset, offset + CHUNK_SIZE);
      const data = await blobChunkToBase64(chunk);
      await VideoSaver.appendChunk({ sessionId, data });
    }
    return await VideoSaver.finishSave({ sessionId });
  } catch (err) {
    await VideoSaver.abortSave({ sessionId }).catch(() => {});
    throw err;
  }
}

export default VideoSaver;
