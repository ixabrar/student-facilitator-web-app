import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, generateToken } from '@/lib/db/auth'
import { User, Profile } from '@/lib/db/models'
import { dbConnect } from '@/lib/db/connect'
import { generateEnrollmentNumber } from '@/lib/db/enrollment-id'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, fullName, role, department } = body

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Email, password, fullName, and role are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // BUG #15: Validate role - only student and faculty can self-register
    // HOD and Principal must be assigned by Admin via API
    if (!['student', 'faculty'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Only students and faculty can self-register. Admin must create HOD, Principal, and Admin accounts.' },
        { status: 400 }
      )
    }

    // BUG #10: Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter' },
        { status: 400 }
      )
    }

    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one number' },
        { status: 400 }
      )
    }

    if (!/[!@#$%^&*]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one special character (!@#$%^&*)' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
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
    let enrollmentNumber: string | null = null
    if (department && (role === 'student' || role === 'faculty')) {
      try {
        enrollmentNumber = await generateEnrollmentNumber(department, role)
      } catch (err) {
        console.error('Error generating enrollment number:', err)
      }
    }

    // Faculty accounts start as pending and need approval by Admin or HOD
    const approvalStatus = role === 'faculty' ? 'pending' : 'approved'
    const isApprovalPending = role === 'faculty' ? true : false

    const profile = new Profile({
      userId: savedUser._id.toString(),
      email: email.toLowerCase(),
      fullName,
      role: role as 'student' | 'faculty' | 'hod' | 'principal' | 'admin',
      department: department || null,
      enrollmentNumber,
      approvalStatus,
      isApprovalPending,
    })
    await profile.save()

    // Generate token
    const token = generateToken(savedUser._id.toString(), email.toLowerCase(), role)

    return NextResponse.json(
      {
        success: true,
        user: {
          userId: savedUser._id.toString(),
          email: email.toLowerCase(),
          role,
        },
        token,
      },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
