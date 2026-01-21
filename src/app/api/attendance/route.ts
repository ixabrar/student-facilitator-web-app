import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Attendance, Course, Profile, StudentCourse } from '@/lib/db/models'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')
    const studentId = searchParams.get('studentId')
    const facultyId = searchParams.get('facultyId')

    let query = Attendance.find()
    
    if (courseId) {
      // Verify course exists
      const course = (await Course.findById(courseId).lean()) as any
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }

      // If facultyId provided, verify they own the course
      if (facultyId && !compareIds(course.facultyId, facultyId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      query = query.where('courseId').equals(courseId)
    }

    if (studentId) {
      query = query.where('studentId').equals(studentId)
    }

    const records = await query.sort({ date: -1 }).lean()
    return NextResponse.json(records)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    const { courseId, studentId, date, status, facultyId } = body

    // Validate required fields
    if (!courseId || !studentId || !date || !status) {
      return NextResponse.json(
        { error: 'courseId, studentId, date, and status are required' },
        { status: 400 }
      )
    }

    // Validate status
    if (!['present', 'absent', 'late'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be present, absent, or late' },
        { status: 400 }
      )
    }

    // Verify course exists
    const course = (await Course.findById(courseId).lean()) as any
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // If facultyId provided, verify it matches the course faculty
    if (facultyId && course.facultyId !== facultyId) {
      return NextResponse.json({ error: 'Unauthorized: Not the course faculty' }, { status: 403 })
    }

    // Verify student exists and is enrolled in the course
    const student = (await Profile.findOne({ userId: studentId }).lean()) as any
    if (!student || student.role !== 'student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // DEPARTMENT ISOLATION: Verify student is in same department as course
    if (!student.department || !course.departmentId) {
      return NextResponse.json(
        { error: 'Student or course missing department information' },
        { status: 400 }
      )
    }
    
    if (student.department.toString() !== course.departmentId.toString()) {
      return NextResponse.json(
        { error: 'Student is not in the same department as this course' },
        { status: 403 }
      )
    }

    // If facultyId provided, verify it matches
    if (facultyId) {
      const faculty = (await Profile.findById(facultyId).lean()) as any
      if (!faculty || faculty.role !== 'faculty' || faculty.department.toString() !== student.department.toString()) {
        return NextResponse.json(
          { error: 'Cannot mark attendance: Student is not in your department' },
          { status: 403 }
        )
      }
    }

    // Check if attendance already marked for this date
    const existingRecord = await Attendance.findOne({
      courseId,
      studentId,
      date: new Date(date)
    })
    
    if (existingRecord) {
      // Update existing record
      existingRecord.status = status
      existingRecord.markedAt = new Date()
      const updated = await existingRecord.save()
      return NextResponse.json(updated, { status: 200 })
    }

    // Create new attendance record
    const record = new Attendance({
      courseId,
      studentId,
      date: new Date(date),
      status
    })
    const saved = await record.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
