import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/student-webapp'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

export async function dbConnect() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB connected successfully')
        return mongoose
      })
      .catch((err) => {
        cached.promise = null
        console.error('MongoDB connection failed:', {
          message: err.message,
          uri: MONGODB_URI.replace(/password:[^@]+/, 'password:***'),
        })
        throw err
      })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export async function dbDisconnect() {
  if (cached.conn) {
    await mongoose.disconnect()
    cached.conn = null
  }
}
