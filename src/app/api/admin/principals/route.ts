import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Profile, Department } from '@/lib/db/models'
import { verifyAuth, requirePrincipal, requireAdmin, logAudit } from '@/lib/rbac'
import { verifyToken } from '@/lib/db/auth'

/**
 * GET /api/admin/principals
 * Get all principals or assign HODs (Admin/Principal only)
 */
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

    // Only Principal and Admin can view principals management
    if (auth.role !== 'principal' && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all principals
    const principals = await Profile.find({ role: 'principal' })
      .select('userId email fullName department departmentName createdAt')
      .lean()

    // Get all HODs with their departments
    const hods = await Profile.find({ role: 'hod' })
      .select('userId email fullName department departmentName createdAt')
      .lean()

    return NextResponse.json({ principals, hods }, { status: 200 })
  } catch (error) {
    console.error('Error fetching principals/HODs:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

/**
 * POST /api/admin/principals
 * Create a new principal (Admin only)
 */
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
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin can create principals
    if (!requireAdmin(auth)) {
      return NextResponse.json({ error: 'Only Admin can create principals' }, { status: 403 })
    }

    const { email, fullName } = await request.json()

    if (!email || !fullName) {
      return NextResponse.json(
        { error: 'email and fullName are required' },
        { status: 400 }
      )
    }

    // Check if principal already exists
    const existingPrincipal = await Profile.findOne({ email })
    if (existingPrincipal) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create new principal
    const newPrincipal = await Profile.create({
      userId: email.split('@')[0] + '-principal-' + Date.now(),
      email,
      fullName,
      role: 'principal',
      department: null,
      approvalStatus: 'approved',
      isApprovalPending: false,
    })

    // Log audit
    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      auth.department,
      'create-principal',
      'principal',
      newPrincipal._id.toString(),
      { email, fullName },
      'success'
    )

    return NextResponse.json(
      {
        message: 'Principal created successfully',
        principal: {
          userId: newPrincipal.userId,
          email: newPrincipal.email,
          fullName: newPrincipal.fullName,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating principal:', error)
    return NextResponse.json({ error: 'Failed to create principal' }, { status: 500 })
  }
}
