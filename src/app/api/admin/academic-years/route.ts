import { NextRequest, NextResponse } from 'next/server'
import { AcademicYear, AuditLog } from '@/lib/db/models'
import { verifyAuth, hasPermission, requireAdmin, logAudit } from '@/lib/rbac'
import { dbConnect } from '@/lib/db/connect'
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

    // Faculty and Students can view academic years
    const academicYears = await AcademicYear.find({}).lean()

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      auth.department,
      'list',
      'academic-years',
      null,
      { count: academicYears.length },
      'success'
    )

    return NextResponse.json(academicYears, { status: 200 })
  } catch (error) {
    console.error('Error fetching academic years:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    if (!hasPermission(auth, 'academicYear', 'create')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { year, startDate, endDate } = body

    if (!year || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Year, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    // Check if year already exists
    const existing = await AcademicYear.findOne({ year })
    if (existing) {
      return NextResponse.json({ error: 'Academic year already exists' }, { status: 400 })
    }

    const academicYear = await AcademicYear.create({
      year,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: false,
    })

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      null,
      'create',
      'academic-year',
      academicYear._id.toString(),
      { year, startDate, endDate },
      'success'
    )

    return NextResponse.json({ success: true, academicYear }, { status: 201 })
  } catch (error) {
    console.error('Error creating academic year:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { academicYearId, isActive } = body

    if (!academicYearId) {
      return NextResponse.json({ error: 'Academic Year ID is required' }, { status: 400 })
    }

    // If activating, deactivate all others
    if (isActive) {
      await AcademicYear.updateMany({ isActive: true }, { isActive: false })
    }

    const academicYear = await AcademicYear.findByIdAndUpdate(
      academicYearId,
      { isActive },
      { new: true }
    )

    if (!academicYear) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 })
    }

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      null,
      'update',
      'academic-year',
      academicYearId,
      { isActive },
      'success'
    )

    return NextResponse.json({ success: true, academicYear }, { status: 200 })
  } catch (error) {
    console.error('Error updating academic year:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
