import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { BonafideCertificate, StudentCourse, Course, Department, Profile } from '@/lib/db/models'
import {
  verifyAuth,
  hasPermission,
  canAccessDepartment,
  logAudit,
  canApproveAtStage,
  getNextApprovalStage,
} from '@/lib/rbac'
import { verifyToken } from '@/lib/db/auth'

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

    let query: Record<string, any> = {}

    // Students see only their own requests
    if (auth.role === 'student') {
      const student = (await Profile.findOne({ userId: decoded.userId }).lean()) as any
      if (!student) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
      }
      query.studentId = student._id.toString()
    }
    // Faculty sees requests from their department
    else if (auth.role === 'faculty') {
      query.department = auth.department
      query.$or = [
        { status: 'pending' },
        { status: 'faculty-approved' },
        { 'approvalHistory.approverId': decoded.userId },
      ]
    }
    // Admin sees all requests
    else if (auth.role === 'admin') {
      query.status = { $in: ['hod-approved', 'admin-approved'] }
    }

    const requests = await BonafideCertificate.find(query).lean()

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      auth.department,
      'list',
      'bonafide-certificates',
      null,
      { count: requests.length },
      'success'
    )

    return NextResponse.json(requests, { status: 200 })
  } catch (error) {
    console.error('Error fetching bonafide requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Only students can create requests
    if (auth.role !== 'student') {
      return NextResponse.json({ error: 'Only students can create bonafide requests' }, { status: 403 })
    }

    const body = await request.json()
    const { purpose } = body

    if (!purpose) {
      return NextResponse.json({ error: 'Purpose is required' }, { status: 400 })
    }

    const student = (await Profile.findOne({ userId: decoded.userId }).lean()) as any
    if (!student) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })
    }

    // Detect department from courses if not in profile
    let department = student.department
    if (!department) {
      const enrollment = (await StudentCourse.findOne({ studentId: student._id }).lean()) as any
      if (enrollment) {
        const course = (await Course.findById(enrollment.courseId).lean()) as any
        if (course) {
          const dept = (await Department.findById(course.departmentId).lean()) as any
          if (dept) {
            department = dept._id.toString()
          }
        }
      }
    }

    const certificate = await BonafideCertificate.create({
      studentId: student._id.toString(),
      studentName: student.fullName,
      studentEmail: student.email,
      department: department || null,
      enrollmentNumber: student.enrollmentNumber,
      purpose,
      status: 'pending',
      requestedAt: new Date(),
      approvalHistory: [],
    })

    await logAudit(
      decoded.userId,
      student.fullName,
      auth.role,
      auth.department,
      'create',
      'bonafide-certificate',
      certificate._id.toString(),
      { purpose, studentId: student._id },
      'success'
    )

    return NextResponse.json({ success: true, certificate }, { status: 201 })
  } catch (error) {
    console.error('Error creating bonafide request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect()
    const cookieStore = await cookies()
    const userId = cookieStore.get('userId')?.value

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const auth = await verifyAuth(userId)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only faculty, HOD, and admin can approve
    if (!['faculty', 'admin'].includes(auth.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { certificateId, action, comments } = body

    if (!certificateId || !action) {
      return NextResponse.json(
        { error: 'Certificate ID and action are required' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const certificate = (await BonafideCertificate.findById(certificateId)) as any
    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    // Check department isolation
    if (!canAccessDepartment(auth, certificate.department)) {
      return NextResponse.json({ error: 'Cannot access this certificate' }, { status: 403 })
    }

    // Check if user can approve at current stage
    if (!canApproveAtStage(auth, certificate.status)) {
      return NextResponse.json(
        { error: `Cannot approve at stage: ${certificate.status}` },
        { status: 400 }
      )
    }

    // Validate HOD status for HOD operations
    if (auth.role === 'faculty' && !auth.isHOD) {
      return NextResponse.json(
        { error: 'Only HOD can approve at this stage' },
        { status: 403 }
      )
    }

    const approver = (await Profile.findOne({ userId }).lean()) as any
    if (!approver) {
      return NextResponse.json({ error: 'Approver profile not found' }, { status: 404 })
    }

    if (action === 'reject') {
      certificate.status = 'rejected'
      certificate.approvalHistory.push({
        approverRole: auth.role,
        approverId: userId,
        approverName: approver.fullName,
        action: 'rejected',
        timestamp: new Date(),
        comments: comments || null,
      })
    } else {
      // Determine next stage
      const nextStatus = getNextApprovalStage(certificate.status)
      if (!nextStatus) {
        return NextResponse.json(
          { error: 'Invalid approval stage transition' },
          { status: 400 }
        )
      }

      certificate.status = nextStatus
      certificate.approvalHistory.push({
        approverRole: auth.role,
        approverId: userId,
        approverName: approver.fullName,
        action: 'approved',
        timestamp: new Date(),
        comments: comments || null,
      })
    }

    await certificate.save()

    await logAudit(
      userId,
      approver.fullName,
      auth.role,
      auth.department,
      `${action}-bonafide`,
      'bonafide-certificate',
      certificateId,
      { action, currentStatus: certificate.status, comments },
      'success'
    )

    return NextResponse.json(
      { success: true, certificate, newStatus: certificate.status },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating bonafide request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
