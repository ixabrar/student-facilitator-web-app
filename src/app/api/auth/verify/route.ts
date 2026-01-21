import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/db/auth'
import { verifyAuth } from '@/lib/rbac'
import { dbConnect } from '@/lib/db/connect'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const token = request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Fetch full user profile from database
    const auth = await verifyAuth((decoded as any).userId)
    if (!auth) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Return complete user data
    return NextResponse.json({
      userId: (decoded as any).userId,
      email: auth.email,
      role: auth.role,
      fullName: auth.fullName,
      department: auth.department,
      departmentName: auth.departmentName,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
