import mongoose from 'mongoose';
import { config } from '../config.js';

export async function connectDatabase() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Successfully connected to MongoDB.');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    // Do not crash the bot, just log the error. 
    // In production, we'd alert staff logs if possible.
  }
}
