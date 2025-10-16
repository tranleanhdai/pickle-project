// pickle-courts/src/api/cloudinary.ts
import Constants from "expo-constants";

type Uploaded = { url: string; w?: number; h?: number };

function getCfg(key: string): string {
  // Ưu tiên đọc từ app.json -> extra
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, any>;
  const v = extra[key] ?? (process.env as any)[key]; // fallback nếu bạn chuyển sang EXPO_PUBLIC_*
  if (!v) throw new Error(`Missing ${key}. Hãy khai báo ${key} trong app.json (extra) hoặc ENV Expo.`);
  return String(v);
}

function guessMime(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

export async function uploadToCloudinary(fileUri: string): Promise<Uploaded> {
  // Với app.json hiện tại, 2 key này nằm trong "extra"
  const cloud = getCfg("EXPO_PUBLIC_CLOUDINARY_CLOUD");     // dqtssbmtq
  const preset = getCfg("EXPO_PUBLIC_CLOUDINARY_PRESET");   // pickle_unsigned

  const data = new FormData();
  const filename = fileUri.split("/").pop() || "upload.jpg";
  const mime = guessMime(filename);

  // @ts-ignore: RN FormData chấp nhận object { uri, name, type }
  data.append("file", { uri: fileUri, name: filename, type: mime } as any);
  data.append("upload_preset", preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: data,
  });

  let text = "";
  try { text = await res.text(); } catch {}

  if (!res.ok) {
    try {
      const j = JSON.parse(text);
      const msg = j?.error?.message || text || `HTTP ${res.status}`;
      throw new Error(`Cloudinary error: ${msg}`);
    } catch {
      throw new Error(`Cloudinary error: ${text || `HTTP ${res.status}`}`);
    }
  }

  const json = JSON.parse(text);
  return { url: json.secure_url as string, w: json.width, h: json.height };
}
