import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { AssignmentSubmission, Assignment, Course } from '@/lib/db/models'
import { verifyAuth, canAccessDepartment } from '@/lib/rbac'
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

    const auth = await verifyAuth(decoded.userId)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const assignmentId = searchParams.get('assignmentId')
    const studentId = searchParams.get('studentId')

    let query = AssignmentSubmission.find()
    if (assignmentId) {
      query = query.where('assignmentId').equals(assignmentId)
    }
    if (studentId) {
      query = query.where('studentId').equals(studentId)
    }

    // BUG #26: Add department isolation - non-admin users see only their department's submissions
    if (auth.role !== 'admin') {
      if (assignmentId) {
        const assignment = (await Assignment.findById(assignmentId).lean()) as any
        if (!assignment) {
          return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
        }
        const course = (await Course.findById(assignment.courseId).lean()) as any
        if (!course || !canAccessDepartment(auth, course.departmentId)) {
          return NextResponse.json({ error: 'Cannot access submissions from other departments' }, { status: 403 })
        }
      }
    }

    const submissions = await query.sort({ submittedAt: -1 }).lean()
    return NextResponse.json(submissions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    const submission = new AssignmentSubmission(body)
    const saved = await submission.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
