import { NextRequest, NextResponse } from 'next/server'
import { signIn, generateToken, verifyPassword } from '@/lib/db/auth'
import { User, Profile } from '@/lib/db/models'
import { dbConnect } from '@/lib/db/connect'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    await dbConnect()

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Get profile
    const profile = await Profile.findOne({ userId: user._id.toString() })
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // BUG #23: Validate faculty have department and approved status
    if (profile.role === 'faculty') {
      if (profile.approvalStatus !== 'approved') {
        return NextResponse.json(
          { error: 'Faculty account is not approved yet' },
          { status: 403 }
        )
      }
      if (!profile.department) {
        return NextResponse.json(
          { error: 'Faculty account has no department assigned' },
          { status: 400 }
        )
      }
    }

    // Generate token
    const token = generateToken(user._id.toString(), email.toLowerCase(), profile.role)

    return NextResponse.json({
      success: true,
      user: {
        userId: user._id.toString(),
        email: email.toLowerCase(),
        role: profile.role,
      },
      token,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
