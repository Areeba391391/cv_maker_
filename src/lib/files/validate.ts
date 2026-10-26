const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 15 * 1024 * 1024);

const ALLOWED: Record<string, string[]> = {
  voice: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg", "audio/x-m4a", "audio/mp3"],
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  photo: ["image/jpeg", "image/png", "image/webp"],
};

const EXT_MAP: Record<string, keyof typeof ALLOWED> = {
  ".mp3": "voice",
  ".wav": "voice",
  ".webm": "voice",
  ".ogg": "voice",
  ".m4a": "voice",
  ".mp4": "voice",
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
  ".webp": "image",
  ".gif": "image",
  ".pdf": "pdf",
  ".doc": "doc",
  ".docx": "docx",
};

export type UploadKind = keyof typeof ALLOWED | "cv_file";

export interface FileValidationResult {
  ok: boolean;
  error?: string;
  kind?: keyof typeof ALLOWED;
  mime?: string;
  extension?: string;
}

export function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

export async function validateUpload(
  file: File | Blob,
  filename: string,
  expected?: UploadKind,
): Promise<FileValidationResult> {
  if (file.size <= 0) return { ok: false, error: "Empty file" };
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `File too large (max ${Math.round(MAX_BYTES / (1024 * 1024))}MB)` };
  }

  const extension = getExtension(filename);
  const kindFromExt = EXT_MAP[extension];
  if (!kindFromExt) {
    return { ok: false, error: "Unsupported file type" };
  }

  if (expected && expected !== "cv_file") {
    if (expected === "photo" && kindFromExt !== "image" && kindFromExt !== "photo") {
      return { ok: false, error: "Profile photo must be an image" };
    }
    if (expected !== "photo" && expected !== kindFromExt && !(expected === "image" && kindFromExt === "photo")) {
      // allow image category for photo-like
      if (!(expected === "image" && ["image", "photo"].includes(kindFromExt))) {
        // soft check — still verify mime below
      }
    }
  }

  const mime = (file.type || "").toLowerCase() || guessMime(extension);
  const allowedMimes = ALLOWED[kindFromExt] || [];
  if (mime && !allowedMimes.includes(mime) && !allowedMimes.some((m) => mime.startsWith(m.split("/")[0]))) {
    // Some browsers send empty type — allow if extension is known
    if (file.type) {
      return { ok: false, error: `MIME type not allowed: ${mime}` };
    }
  }

  if (expected === "cv_file" && !["pdf", "doc", "docx", "image"].includes(kindFromExt)) {
    return { ok: false, error: "Existing CV must be PDF, DOC, DOCX, or image" };
  }

  return { ok: true, kind: kindFromExt, mime, extension };
}

function guessMime(ext: string): string {
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
  };
  return map[ext] || "application/octet-stream";
}

export { MAX_BYTES, ALLOWED };
