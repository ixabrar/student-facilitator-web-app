import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Course, Profile, StudentCourse } from '@/lib/db/models'

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    await dbConnect()
    
    // Get student profile
    const student = await Profile.findOne({ userId: userId }).lean()
    
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Get student's enrolled courses via StudentCourse (enrollments)
    const enrollments = await StudentCourse.find({ 
      studentId: (student as any)._id.toString() 
    }).lean()
    
    const enrolledCourseIds = enrollments.map((e: any) => e.courseId)
    
    // Get the actual course details
    const courses = await Course.find({ 
      _id: { $in: enrolledCourseIds }
    }).sort({ createdAt: -1 }).lean()
    
    console.log('\n🔍 Student Courses API Called')
    console.log('Student:', student.fullName, '| ID:', (student as any)._id)
    console.log('Enrollments found:', enrollments.length)
    console.log('Courses found:', courses.length)
    courses.forEach((c: any) => {
      console.log('  -', c.name, '(', c.code, ') | Dept:', c.departmentId)
    })
    
    return NextResponse.json(courses)
  } catch (error: any) {
    console.error('❌ Error fetching student courses:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
