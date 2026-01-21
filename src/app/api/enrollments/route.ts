import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { compareIds } from '@/lib/rbac'
import { StudentCourse, Course, Profile } from '@/lib/db/models'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')
    const studentId = searchParams.get('studentId')

    let query = StudentCourse.find()
    if (courseId) {
      query = query.where('courseId').equals(courseId)
    }
    if (studentId) {
      query = query.where('studentId').equals(studentId)
    }

    const enrollments = await query.sort({ enrolledAt: -1 }).lean()
    return NextResponse.json(enrollments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    
    const { studentId, courseId, facultyId } = body

    // Validate required fields
    if (!studentId || !courseId) {
      return NextResponse.json({ error: 'studentId and courseId are required' }, { status: 400 })
    }

    // Verify course exists and belongs to the faculty if facultyId is provided
    const course = (await Course.findById(courseId).lean()) as any
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // If facultyId is provided, verify the course is assigned to this faculty only
    if (facultyId && !compareIds(course.facultyId, facultyId)) {
      return NextResponse.json({ error: 'Unauthorized: Course is not assigned to your faculty' }, { status: 403 })
    }

    // Verify student exists
    const student = (await Profile.findById(studentId).lean()) as any
    if (!student || student.role !== 'student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    console.log('Enrollment check:', {
      studentName: student.fullName,
      studentDept: student.department,
      courseName: course.name,
      courseDept: course.departmentId
    })

    // DEPARTMENT ISOLATION: Verify course is from the same department as the student
    // Convert both to strings for comparison (handles ObjectId vs String)
    const studentDeptStr = student.department?.toString()
    const courseDeptStr = course.departmentId?.toString()
    
    if (courseDeptStr && studentDeptStr && courseDeptStr !== studentDeptStr) {
      console.log('❌ Enrollment blocked: Department mismatch')
      return NextResponse.json(
        { error: 'Cannot enroll: Course is not from student\'s department' },
        { status: 403 }
      )
    }

    // DEPARTMENT ISOLATION: If facultyId is provided, verify student is in the same department
    if (facultyId) {
      const faculty = (await Profile.findById(facultyId).lean()) as any
      if (!faculty || faculty.role !== 'faculty') {
        return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })
      }
      
      const facultyDeptStr = faculty.department?.toString()
      
      // Faculty can only enroll students from their department
      if (studentDeptStr && facultyDeptStr && studentDeptStr !== facultyDeptStr) {
        console.log('❌ Enrollment blocked: Student-Faculty department mismatch')
        return NextResponse.json(
          { error: 'Cannot enroll: Student is not in your department' },
          { status: 403 }
        )
      }

      // Verify course is from the same department as faculty
      if (courseDeptStr && facultyDeptStr && courseDeptStr !== facultyDeptStr) {
        console.log('❌ Enrollment blocked: Course-Faculty department mismatch')
        return NextResponse.json(
          { error: 'Cannot enroll: Course is not from your department' },
          { status: 403 }
        )
      }
    }

    // Check if student is already enrolled in this course
    const existingEnrollment = await StudentCourse.findOne({ studentId, courseId })
    if (existingEnrollment) {
      return NextResponse.json({ error: 'Student is already enrolled in this course' }, { status: 409 })
    }

    // Create enrollment
    const enrollment = new StudentCourse({ studentId, courseId })
    const saved = await enrollment.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
