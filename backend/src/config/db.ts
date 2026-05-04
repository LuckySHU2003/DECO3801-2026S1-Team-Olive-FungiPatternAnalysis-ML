import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectMongo() {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB already connected');
      return;
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.MONGODB_URI);
    console.log('Database:', mongoose.connection.name);
    console.log('Connected to MongoDB');

  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}
