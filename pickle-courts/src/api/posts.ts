import { api } from "./client";

export type PostImage = { url: string; w?: number; h?: number; mime?: string };
export type PostDTO = {
  id: string; courtId: string; userId: string;
  content: string; images: PostImage[];
  likeCount: number; commentCount: number; viewCount: number;
  createdAt: string; updatedAt: string; liked?: boolean;
};

export async function listPosts(courtId: string, cursor?: string, limit = 20) {
  const { data } = await api.get("/posts", { params: { courtId, cursor, limit } });
  return data as { items: PostDTO[]; nextCursor: string | null };
}

export async function createPost(body: { courtId: string; content: string; images: PostImage[] }) {
  const { data } = await api.post("/posts", body);
  return data as PostDTO;
}

export async function likePost(id: string) {
  const { data } = await api.post(`/posts/${id}/like`, {});
  return data as { ok: true; duplicated?: boolean };
}
export async function unlikePost(id: string) {
  const { data } = await api.delete(`/posts/${id}/like`);
  return data as { ok: true };
}

export async function addComment(id: string, content: string, parentId?: string) {
  const { data } = await api.post(`/posts/${id}/comments`, { content, parentId });
  return data as {
    id: string; postId: string; userId: string; content: string;
    parentId: string | null; createdAt: string;
  };
}
export async function listComments(id: string, cursor?: string, limit = 50) {
  const { data } = await api.get(`/posts/${id}/comments`, { params: { cursor, limit } });
  return data as { items: any[]; nextCursor: string | null };
}

export async function addView(id: string, day?: string) {
  const { data } = await api.post(`/posts/${id}/view`, { day });
  return data as { ok: true; duplicated?: boolean };
}
