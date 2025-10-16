import { Schema, model, Types, Document } from "mongoose";

export interface ViewDoc extends Document {
  postId: Types.ObjectId;
  userId?: Types.ObjectId | null;
  day?: string | null; // "YYYY-MM-DD"
  createdAt: Date;
  updatedAt: Date;
}

const ViewSchema = new Schema<ViewDoc>(
  {
    postId: { type: Schema.Types.ObjectId, ref: "Post", index: true, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    day: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

// unique “mềm” theo (postId, userId, day)
ViewSchema.index({ postId: 1, userId: 1, day: 1 }, { unique: true, sparse: true });

export const View = model<ViewDoc>("View", ViewSchema);
