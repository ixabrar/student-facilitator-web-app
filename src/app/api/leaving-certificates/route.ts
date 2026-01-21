import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { LeavingCertificate, Profile, StudentCourse, Course, Department } from '@/lib/db/models'
import { verifyToken } from '@/lib/db/auth'
import { verifyAuth } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token) as any
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const auth = await verifyAuth(decoded.userId)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')
    const department = searchParams.get('department')

    let query = LeavingCertificate.find()
    
    if (studentId) {
      query = query.where('studentId').equals(studentId)
    }
    if (department) {
      query = query.where('department').equals(department)
    }
    if (status) {
      query = query.where('status').equals(status)
    }

    const certificates = await query.sort({ requestedAt: -1 }).lean()
    return NextResponse.json(certificates)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token) as any
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const auth = await verifyAuth(decoded.userId)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()

    const { studentId, reason } = body

    if (!studentId || !reason) {
      return NextResponse.json({ error: 'studentId and reason are required' }, { status: 400 })
    }

    // Get student profile info
    const profile = (await Profile.findById(studentId).lean()) as any
    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Check if student already has pending request
    const existingRequest = await LeavingCertificate.findOne({
      studentId,
      status: { $in: ['pending', 'approved'] }
    })
    if (existingRequest) {
      return NextResponse.json({ error: 'You already have an active leaving certificate request' }, { status: 409 })
    }

    // Get student's department
    let department = profile.department
    
    // If student profile doesn't have department, try to get it from their courses
    if (!department) {
      const studentCourse = (await StudentCourse.findOne({ studentId }).lean()) as any
      if (studentCourse) {
        const course = (await Course.findById(studentCourse.courseId).lean()) as any
        if (course && course.departmentId) {
          const dept = (await Department.findById(course.departmentId).lean()) as any
          if (dept && dept.name) {
            department = dept.name
          }
        }
      }
    }

    const certificate = new LeavingCertificate({
      studentId,
      studentName: profile.fullName,
      studentEmail: profile.email,
      department: department || null,
      reason,
      status: 'pending'
    })

    const saved = await certificate.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
