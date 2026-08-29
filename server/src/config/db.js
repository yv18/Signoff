import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI, { autoIndex: !env.isProd });
  console.log('MongoDB connected');
}

export async function disconnectDb() {
  await mongoose.connection.close();
}
