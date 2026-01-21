import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { StudentCourse, Course, Profile } from '@/lib/db/models'
import { verifyToken } from '@/lib/db/auth'
import { verifyAuth, requireAdmin } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    // Verify admin access
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
    if (!auth || !requireAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Find all enrollments
    const enrollments = await StudentCourse.find().lean()
    const mismatches = []

    for (const enrollment of enrollments) {
      const student = await Profile.findOne({ userId: enrollment.studentId }).lean()
      const course = await Course.findById(enrollment.courseId).lean()

      if (student && course) {
        // Check if course department matches student department
        if (
          course.departmentId &&
          student.department &&
          course.departmentId !== student.department &&
          course.departmentId !== student.departmentName
        ) {
          mismatches.push({
            enrollmentId: enrollment._id,
            studentName: student.fullName,
            studentDepartment: student.department || student.departmentName,
            courseName: course.name,
            courseCode: course.code,
            courseDepartment: course.departmentId,
          })
        }
      }
    }

    return NextResponse.json({
      totalEnrollments: enrollments.length,
      mismatches: mismatches.length,
      details: mismatches,
    })
  } catch (error: any) {
    console.error('Cleanup enrollments API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect()

    // Verify admin access
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
    if (!auth || !requireAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Find and delete mismatched enrollments
    const enrollments = await StudentCourse.find().lean()
    const deletedIds = []

    for (const enrollment of enrollments) {
      const student = await Profile.findOne({ userId: enrollment.studentId }).lean()
      const course = await Course.findById(enrollment.courseId).lean()

      if (student && course) {
        // Check if course department matches student department
        if (
          course.departmentId &&
          student.department &&
          course.departmentId !== student.department &&
          course.departmentId !== student.departmentName
        ) {
          await StudentCourse.findByIdAndDelete(enrollment._id)
          deletedIds.push(enrollment._id)
        }
      }
    }

    return NextResponse.json({
      message: 'Mismatched enrollments cleaned up',
      deletedCount: deletedIds.length,
      deletedIds,
    })
  } catch (error: any) {
    console.error('Cleanup enrollments API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
