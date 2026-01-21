import { NextRequest, NextResponse } from 'next/server'
import { Profile, AuditLog } from '@/lib/db/models'
import { verifyAuth, hasPermission, requireAdmin, logAudit, getDepartmentFilter, canManageFaculty } from '@/lib/rbac'
import { dbConnect } from '@/lib/db/connect'
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

    // Only admin, HOD, or Principal can view pending approvals
    if (!requireAdmin(auth) && auth.role !== 'hod' && auth.role !== 'principal') {
      return NextResponse.json({ error: 'Admin, HOD, or Principal access required' }, { status: 403 })
    }

    // Get pending faculty approvals
    let query: Record<string, any> = {
      role: 'faculty',
      approvalStatus: 'pending',
    }

    // HOD can only see faculty in their department
    if (auth.role === 'hod' && !requireAdmin(auth)) {
      query.department = auth.department
    }

    const pendingFaculty = await Profile.find(query).lean()

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      auth.department || null,
      'list',
      'pending-faculty-approvals',
      null,
      { count: pendingFaculty.length },
      'success'
    )

    return NextResponse.json(pendingFaculty, { status: 200 })
  } catch (error) {
    console.error('Error fetching pending faculty:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    // Only admin, HOD, or Principal can approve faculty
    if (!requireAdmin(auth) && auth.role !== 'hod' && auth.role !== 'principal') {
      return NextResponse.json({ error: 'Admin, HOD, or Principal access required' }, { status: 403 })
    }

    const body = await request.json()
    const { facultyId, status, comments } = body

    if (!facultyId || !status) {
      return NextResponse.json(
        { error: 'Faculty ID and status are required' },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const faculty = await Profile.findById(facultyId)
    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })
    }

    // HOD can only approve faculty in their department
    if (auth.role === 'hod' && !requireAdmin(auth) && faculty.department !== auth.department) {
      return NextResponse.json(
        { error: 'Cannot approve faculty from other departments' },
        { status: 403 }
      )
    }

    const updated = await Profile.findByIdAndUpdate(
      facultyId,
      {
        approvalStatus: status,
        isApprovalPending: false,
      },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update faculty approval status' }, { status: 500 })
    }

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      auth.department || null,
      'approve-faculty',
      'faculty-account',
      facultyId,
      { status, comments },
      'success'
    )

    return NextResponse.json({ success: true, faculty: updated }, { status: 200 })
  } catch (error) {
    console.error('Error updating faculty approval status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
