import { Schema, model, Types, Document } from "mongoose";

export interface CommentDoc extends Document {
  postId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  parentId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<CommentDoc>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", index: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
  },
  { timestamps: true }
);

export const Comment = model<CommentDoc>("Comment", CommentSchema);
