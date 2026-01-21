import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Profile, Department, Course } from '@/lib/db/models'
import { verifyAuth, requireAdmin } from '@/lib/rbac'
import { verifyToken } from '@/lib/db/auth'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    // Verify authentication via Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token) as any
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // BUG #29: Add authentication and admin-only requirement
    const auth = await verifyAuth(decoded.userId)
    if (!auth || !requireAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const studentsCount = await Profile.countDocuments({ role: 'student' })
    const facultyCount = await Profile.countDocuments({ role: 'faculty' })
    const adminCount = await Profile.countDocuments({ role: 'admin' })
    const departmentsCount = await Department.countDocuments()
    const coursesCount = await Course.countDocuments()

    return NextResponse.json({
      students: studentsCount,
      faculty: facultyCount,
      admin: adminCount,
      courses: coursesCount,
      departments: departmentsCount,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
