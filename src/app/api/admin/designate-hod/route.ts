import { NextRequest, NextResponse } from 'next/server'
import { Profile, Department } from '@/lib/db/models'
import { verifyAuth, hasPermission, requireAdmin, logAudit } from '@/lib/rbac'
import { dbConnect } from '@/lib/db/connect'
import { verifyToken } from '@/lib/db/auth'

export async function POST(request: NextRequest) {
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
    if (!auth || !requireAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    if (!hasPermission(auth, 'faculty', 'assign-department')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { facultyId, departmentId } = body

    if (!facultyId || !departmentId) {
      return NextResponse.json(
        { error: 'Faculty ID and Department ID are required' },
        { status: 400 }
      )
    }

    const faculty = await Profile.findById(facultyId)
    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })
    }

    // BUG #22: Validate role is faculty
    if (faculty.role !== 'faculty') {
      return NextResponse.json(
        { error: 'Only faculty members can be designated as HOD' },
        { status: 400 }
      )
    }

    const department = await Department.findById(departmentId)
    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    // Remove HOD status from current HOD (if any)
    if (department.hodId) {
      const currentHOD = await Profile.findById(department.hodId)
      if (currentHOD) {
        currentHOD.isHOD = false
        await currentHOD.save()
      }
    }

    // Assign new HOD
    faculty.isHOD = true
    faculty.department = departmentId
    faculty.approvalStatus = 'approved'
    faculty.isApprovalPending = false
    await faculty.save()

    // Update department
    department.hodId = facultyId
    await department.save()

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      null,
      'designate-hod',
      'hod-designation',
      facultyId,
      { facultyId, departmentId, facultyName: faculty.fullName, departmentName: department.name },
      'success'
    )

    return NextResponse.json(
      {
        success: true,
        message: `${faculty.fullName} designated as HOD of ${department.name}`,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error designating HOD:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    if (!auth || !requireAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all HODs with their departments
    const hods = await Profile.find({ isHOD: true, role: 'faculty' }).lean()
    
    const hodsWithDepartments = await Promise.all(
      hods.map(async (hod: any) => ({
        ...hod,
        department: await Department.findById(hod.department).lean(),
      }))
    )

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      null,
      'list',
      'hods',
      null,
      { count: hodsWithDepartments.length },
      'success'
    )

    return NextResponse.json(hodsWithDepartments, { status: 200 })
  } catch (error) {
    console.error('Error fetching HODs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
