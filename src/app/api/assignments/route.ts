import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Assignment, Course } from '@/lib/db/models'
import { verifyAuth, canAccessDepartment } from '@/lib/rbac'
import { verifyToken } from '@/lib/db/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('\n🔍 Assignments API - GET Request')
    await dbConnect()
    
    // Verify authentication via Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    console.log('Token present:', !!token)
    
    if (!token) {
      console.log('❌ No token provided')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = verifyToken(token) as any
    if (!decoded) {
      console.log('❌ Invalid token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('✅ Token decoded, userId:', decoded.userId)

    const auth = await verifyAuth(decoded.userId)
    if (!auth) {
      console.log('❌ Auth verification failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('✅ Auth verified, role:', auth.role)

    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')
    const courseIds = searchParams.get('courseIds')
    
    console.log('Query params - courseId:', courseId, 'courseIds:', courseIds)

    let query = Assignment.find()
    
    // Handle multiple course IDs
    if (courseIds) {
      const courseIdArray = courseIds.split(',')
      console.log('Querying for multiple courses:', courseIdArray.length)
      query = query.where('courseId').in(courseIdArray)
    } else if (courseId) {
      console.log('Querying for single course:', courseId)
      query = query.where('courseId').equals(courseId)
    } else {
      console.log('No course filter applied')
    }

    // BUG #25: Add department isolation - non-admin users see only their department's assignments
    if (auth.role !== 'admin') {
      console.log('🔒 Checking department access for role:', auth.role)
      console.log('Faculty dept:', auth.department)
      
      // Get course(s) and verify department access
      if (courseId) {
        const course = (await Course.findById(courseId).lean()) as any
        if (!course) {
          console.log('❌ Course not found:', courseId)
          return NextResponse.json({ error: 'Course not found' }, { status: 404 })
        }
        console.log('Course dept:', course.departmentId)
        if (!canAccessDepartment(auth, course.departmentId)) {
          console.log('❌ Department access denied for single course')
          return NextResponse.json({ error: 'Cannot access assignments from other departments' }, { status: 403 })
        }
      } else if (courseIds) {
        // For multiple courses, verify all are accessible
        const courseIdArray = courseIds.split(',')
        const courses = await Course.find({ _id: { $in: courseIdArray } }).lean()
        
        console.log('Found', courses.length, 'courses for verification')
        for (const course of courses as any[]) {
          console.log('Checking course:', course.name, '| Course dept:', course.departmentId, '| Faculty dept:', auth.department)
          const courseDeptStr = course.departmentId?.toString()
          const facultyDeptStr = auth.department?.toString()
          console.log('Dept comparison:', courseDeptStr, '===', facultyDeptStr, '=', courseDeptStr === facultyDeptStr)
          
          if (!canAccessDepartment(auth, course.departmentId)) {
            console.log('❌ Department access denied for course:', course.name)
            return NextResponse.json({ error: 'Cannot access assignments from other departments' }, { status: 403 })
          }
        }
        console.log('✅ Department access verified for all courses')
      }
    }

    const assignments = await query.sort({ dueDate: 1 }).lean()
    console.log('✅ Found', assignments.length, 'assignments')
    return NextResponse.json(assignments)
  } catch (error: any) {
    console.error('❌ Assignments API Error:', error.message)
    console.error('Stack:', error.stack)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    const assignment = new Assignment(body)
    const saved = await assignment.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
