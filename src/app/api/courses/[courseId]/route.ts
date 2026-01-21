import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Course, Department } from '@/lib/db/models'
import { verifyToken } from '@/lib/db/auth'
import { verifyAuth } from '@/lib/rbac'

export async function PUT(request: NextRequest, props: { params: Promise<{ courseId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    
    // Verify authentication
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

    // Validate the course exists
    const existingCourse = await Course.findById(params.courseId).lean()
    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
    // Authorization: Only admin and HOD can edit courses
    if (auth.role !== 'admin' && auth.role !== 'hod') {
      return NextResponse.json({ error: 'Only admins and HODs can edit courses' }, { status: 403 })
    }
    
    // HOD can only edit courses in their department
    if (auth.role === 'hod') {
      const courseData = existingCourse as any
      if (courseData.departmentId !== auth.department && courseData.departmentId !== auth.departmentName) {
        return NextResponse.json(
          { error: 'You can only edit courses in your department' },
          { status: 403 }
        )
      }
      
      // If changing department, ensure it's still their department
      if (body.departmentId && body.departmentId !== courseData.departmentId) {
        if (body.departmentId !== auth.department && body.departmentId !== auth.departmentName) {
          return NextResponse.json(
            { error: 'You can only assign courses to your department' },
            { status: 403 }
          )
        }
      }
    }

    // If code is being updated, check for conflicts
    if (body.code && body.code !== existingCourse.code) {
      const codeConflict = await Course.findOne({ code: body.code })
      if (codeConflict) {
        return NextResponse.json({ error: `Course with code '${body.code}' already exists` }, { status: 409 })
      }
    }

    // Verify department exists if provided
    if (body.departmentId && body.departmentId !== existingCourse.departmentId) {
      const dept = await Department.findById(body.departmentId)
      if (!dept) {
        return NextResponse.json({ error: 'Department not found' }, { status: 404 })
      }
    }

    const updated = await Course.findByIdAndUpdate(params.courseId, body, { new: true })
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ courseId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const deleted = await Course.findByIdAndDelete(params.courseId)
    if (!deleted) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Course deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
