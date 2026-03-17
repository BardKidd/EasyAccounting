import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledgeChunk extends Document {
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    section: string;
  };
  createdAt: Date;
}

const KnowledgeChunkSchema: Schema = new Schema(
  {
    content: { type: String, required: true },
    embedding: { type: [Number], required: true },
    metadata: {
      source: { type: String, required: true },
      section: { type: String, required: true },
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

// Mongoose doesn't natively support vector search indexes defined via Schema in Atlas M0,
// but we still define the schema here for strongly-typed operations.
// The index itself needs to be created in the Atlas UI or via the seed script.

export default mongoose.model<IKnowledgeChunk>(
  'KnowledgeChunk',
  KnowledgeChunkSchema,
);
