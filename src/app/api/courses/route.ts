import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Course, Department } from '@/lib/db/models'
import { verifyToken } from '@/lib/db/auth'
import { verifyAuth } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const searchParams = request.nextUrl.searchParams
    const departmentId = searchParams.get('departmentId') || searchParams.get('department')
    const facultyId = searchParams.get('facultyId')

    let query = Course.find()
    if (departmentId) {
      query = query.where('departmentId').equals(departmentId)
    }
    if (facultyId) {
      query = query.where('facultyId').equals(facultyId)
    }

    const courses = await query.sort({ createdAt: -1 }).lean()
    return NextResponse.json(courses)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
    
    const { code, name, description, departmentId, facultyId, semester, credits } = body

    // Authorization: Only admin and HOD can create courses
    if (auth.role !== 'admin' && auth.role !== 'hod') {
      return NextResponse.json({ error: 'Only admins and HODs can create courses' }, { status: 403 })
    }
    
    // HOD can only create courses in their department
    if (auth.role === 'hod') {
      if (!departmentId || (departmentId !== auth.department && departmentId !== auth.departmentName)) {
        return NextResponse.json(
          { error: 'You can only create courses in your department' },
          { status: 403 }
        )
      }
    }

    // Validate required fields
    if (!code || !name || credits === undefined) {
      return NextResponse.json({ error: 'code, name, and credits are required' }, { status: 400 })
    }

    // Check if course code already exists
    const existingCourse = await Course.findOne({ code })
    if (existingCourse) {
      return NextResponse.json({ error: `Course with code '${code}' already exists` }, { status: 409 })
    }

    // Verify department exists if provided
    if (departmentId) {
      const dept = await Department.findById(departmentId)
      if (!dept) {
        return NextResponse.json({ error: 'Department not found' }, { status: 404 })
      }
    }

    // Check if this faculty already teaches a course with the same code in the same semester
    if (facultyId && semester) {
      const existingFacultyCourse = await Course.findOne({
        code,
        facultyId,
        semester
      })
      if (existingFacultyCourse) {
        return NextResponse.json({ error: 'Faculty already teaches this course in this semester' }, { status: 409 })
      }
    }

    // Create course
    const course = new Course({
      code,
      name,
      description: description || null,
      departmentId: departmentId || null,
      facultyId: facultyId || null,
      semester: semester || null,
      credits
    })

    const saved = await course.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
