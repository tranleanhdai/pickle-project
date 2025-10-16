export type ImageMeta = { url: string; w?: number; h?: number; mime?: string };

export type Post = {
  id: string;
  courtId: string;
  userId: string;
  content: string;
  images: ImageMeta[];
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  liked?: boolean; // ✅ NEW
};

export type Comment = {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentId: string | null;
  createdAt: string;
};
