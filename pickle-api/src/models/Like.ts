import { Schema, model, Types, Document } from "mongoose";

export interface LikeDoc extends Document {
  postId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LikeSchema = new Schema<LikeDoc>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", index: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
  },
  { timestamps: true }
);

LikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const Like = model<LikeDoc>("Like", LikeSchema);
