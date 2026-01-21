import { NextRequest, NextResponse } from 'next/server'
import { Department, Profile, AuditLog } from '@/lib/db/models'
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
    if (!auth || !requireAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const departments = await Department.find({}).lean()
    
    // Populate HOD names
    const departmentsWithHOD = await Promise.all(
      departments.map(async (dept: any) => ({
        ...dept,
        hodName: dept.hodId ? (await Profile.findById(dept.hodId).lean() as any)?.fullName : null,
      }))
    )

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      null,
      'list',
      'departments',
      null,
      { count: departmentsWithHOD.length },
      'success'
    )

    return NextResponse.json(departmentsWithHOD, { status: 200 })
  } catch (error) {
    console.error('Error fetching departments:', error)
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

    if (!hasPermission(auth, 'department', 'create')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, abbreviation } = body

    // Validate required fields
    if (!name?.trim() || !abbreviation?.trim()) {
      return NextResponse.json({ error: 'Name and abbreviation are required' }, { status: 400 })
    }

    // Validate abbreviation format
    if (abbreviation.length < 2 || abbreviation.length > 4) {
      return NextResponse.json({ error: 'Abbreviation must be 2-4 characters' }, { status: 400 })
    }

    if (!/^[A-Z]+$/.test(abbreviation)) {
      return NextResponse.json({ error: 'Abbreviation must contain only uppercase letters' }, { status: 400 })
    }

    const department = await Department.create({
      name,
      abbreviation,
      description: description || null,
    })

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      null,
      'create',
      'department',
      department._id.toString(),
      { name, abbreviation, description },
      'success'
    )

    return NextResponse.json({ success: true, department }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating department:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errors: error.errors,
    })

    // Handle duplicate key error (E11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 409 }
      )
    }

    // Handle validation errors
    if (error.errors) {
      const messages = Object.values(error.errors).map((e: any) => e.message).join(', ')
      return NextResponse.json(
        { error: messages },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
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

    if (!hasPermission(auth, 'department', 'update')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const body = await request.json()
    const { departmentId, name, description, abbreviation } = body

    if (!departmentId) {
      return NextResponse.json({ error: 'Department ID is required' }, { status: 400 })
    }

    const department = await Department.findByIdAndUpdate(
      departmentId,
      { name, abbreviation, description },
      { new: true }
    )

    if (!department) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      null,
      'update',
      'department',
      departmentId,
      { name, abbreviation, description },
      'success'
    )

    return NextResponse.json({ success: true, department }, { status: 200 })
  } catch (error) {
    console.error('Error updating department:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
