import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  type: 'maintenance' | 'news';
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['maintenance', 'news'],
      default: 'news',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      index: { expires: 0 }, // TTL Index: 時間到 MongoDB 會自動幫我們刪除刪除
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAnnouncement>(
  'Announcement',
  announcementSchema
);
