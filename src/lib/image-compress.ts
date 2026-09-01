/**
 * SHARED image compression utility — the single place any uploaded image is
 * shrunk before it is sent to the backend.
 *
 * Full-resolution camera photos are far larger than text extraction needs and
 * slow down both the upload and the model, so images are capped to
 * MAX_EDGE on the longest side and re-encoded as moderately compressed JPEG.
 */

export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.72;

export type CompressedImage = { data: string; mimeType: string; base64Bytes: number };

/** Reads a Blob/File as a bare base64 string (no data: prefix). */
export function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result ?? "");
      resolve(r.slice(r.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes + compresses an image file and returns base64 ready for upload.
 * Falls back to the original bytes if the browser can't decode/encode it.
 */
export async function compressImage(
  file: File,
  opts?: { maxEdge?: number; quality?: number },
): Promise<CompressedImage> {
  const maxEdge = opts?.maxEdge ?? MAX_EDGE;
  const quality = opts?.quality ?? JPEG_QUALITY;

  const fallback = async (): Promise<CompressedImage> => {
    const data = await toBase64(file);
    return { data, mimeType: file.type, base64Bytes: data.length };
  };

  if (typeof document === "undefined") return fallback();

  let url: string | null = null;
  try {
    url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url as string;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
    const wasResized = scale < 1;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fallback();
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );
    // Always keep the resized version even when the source JPEG happened to be
    // smaller in bytes — sending the original would undo the dimension cap.
    if (!blob || (!wasResized && blob.size >= file.size)) return fallback();
    const data = await toBase64(blob);
    console.log(
      `[image] compressed ${file.name} ${img.naturalWidth}x${img.naturalHeight} -> ${w}x${h} ${Math.round(
        file.size / 1024,
      )}KB -> ${Math.round(blob.size / 1024)}KB`,
    );
    return { data, mimeType: "image/jpeg", base64Bytes: data.length };
  } catch (e) {
    console.error("[image] compression failed, sending original", e);
    return fallback();
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}
