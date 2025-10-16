import { Schema, model, Types, Document } from "mongoose";

export type ImageMeta = { url: string; w?: number; h?: number; mime?: string };

export interface PostDoc extends Document {
  courtId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  images: ImageMeta[];
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema = new Schema<ImageMeta>({
  url: { type: String, required: true },
  w: Number,
  h: Number,
  mime: String,
});

const PostSchema = new Schema<PostDoc>(
  {
    courtId: { type: Schema.Types.ObjectId, ref: "Court", index: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    content: { type: String, default: "" },
    images: { type: [ImageSchema], default: [] },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Post = model<PostDoc>("Post", PostSchema);
