import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { User, Profile } from './models'
import { dbConnect } from './connect'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const TOKEN_EXPIRY = '7d'

export interface AuthSession {
  userId: string
  email: string
  role: 'student' | 'faculty' | 'admin'
}

export interface AuthResponse {
  success: boolean
  error?: string
  data?: {
    user: AuthSession
    token: string
  }
}

/**
 * Hash password using bcrypt-like approach
 */
export async function hashPassword(password: string): Promise<string> {
  // In production, use bcrypt package
  // For now, using Node's crypto
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex')
  return `${salt}$${hash}`
}

/**
 * Verify password
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split('$')
  const keyBuffer = Buffer.from(key, 'hex')
  const derivedKey = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512')
  return crypto.timingSafeEqual(keyBuffer, derivedKey)
}

/**
 * Generate JWT token
 */
export function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  )
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): AuthSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthSession
    return decoded
  } catch {
    return null
  }
}

/**
 * Sign up a new user
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: 'student' | 'faculty' | 'admin',
  department?: string
): Promise<AuthResponse> {
  try {
    await dbConnect()

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return { success: false, error: 'User already exists' }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
    })
    const savedUser = await user.save()

    // Create profile
    const profile = new Profile({
      userId: savedUser._id.toString(),
      email: email.toLowerCase(),
      fullName,
      role,
      department: department || null,
    })
    await profile.save()

    // Generate token
    const token = generateToken(savedUser._id.toString(), email.toLowerCase(), role)

    return {
      success: true,
      data: {
        user: {
          userId: savedUser._id.toString(),
          email: email.toLowerCase(),
          role,
        },
        token,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Sign in a user
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    await dbConnect()

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return { success: false, error: 'Invalid email or password' }
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email or password' }
    }

    // Get profile
    const profile = await Profile.findOne({ userId: user._id.toString() })
    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Generate token
    const token = generateToken(user._id.toString(), email.toLowerCase(), profile.role)

    return {
      success: true,
      data: {
        user: {
          userId: user._id.toString(),
          email: email.toLowerCase(),
          role: profile.role,
        },
        token,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string) {
  try {
    await dbConnect()
    const profile = await Profile.findOne({ userId })
    return profile
  } catch (error) {
    return null
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, updates: any) {
  try {
    await dbConnect()
    const profile = await Profile.findOneAndUpdate(
      { userId },
      { ...updates, updatedAt: new Date() },
      { new: true }
    )
    return profile
  } catch (error) {
    return null
  }
}
