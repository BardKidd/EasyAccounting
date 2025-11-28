import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.MONGODB_URL as string;

const mongoConnection = async () => {
  try {
    await mongoose.connect(url);
    console.log('Connected to MongoDB via Mongoose');
    return mongoose.connection;
  } catch (err) {
    console.log('Failed to connect to MongoDB', err);
    throw err;
  }
};

export const getDb = () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection.db;
  }
  throw 'Database not connected!';
};

export default mongoConnection;
