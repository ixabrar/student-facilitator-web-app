import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Profile } from '@/lib/db/models'
import { verifyAuth, requireAdmin, logAudit } from '@/lib/rbac'
import { verifyToken } from '@/lib/db/auth'

export async function GET(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    await dbConnect()

    const profile = await Profile.findById(profileId).lean()
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    await dbConnect()

    // Get token from Authorization header
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

    // Get the target user
    const targetUser = await Profile.findById(profileId)
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Permission check: Only admin or HOD (managing their department) can update users
    if (auth.role === 'admin') {
      // Admin can update anyone
    } else if (auth.role === 'hod') {
      // HOD can only update faculty in their department
      if (targetUser.role !== 'faculty' || targetUser.department !== auth.department) {
        return NextResponse.json(
          { error: 'You can only manage faculty in your department' },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json({ error: 'Admin or HOD access required' }, { status: 403 })
    }

    const body = await request.json()
    const { role, department, departmentName } = body

    // Build update object
    const updateData: any = {}
    if (role) updateData.role = role
    if (department) updateData.department = department
    if (departmentName) updateData.departmentName = departmentName

    // Update the user
    const updated = await Profile.findByIdAndUpdate(
      profileId,
      updateData,
      { new: true }
    )

    // Log audit trail
    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      auth.department || null,
      'update-user',
      'user-profile',
      profileId,
      updateData,
      'success'
    )

    return NextResponse.json(updated, { status: 200 })
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ profileId: string }> }) {
  try {
    const { profileId } = await params
    await dbConnect()

    // Get token from Authorization header
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

    // Get the target user
    const targetUser = await Profile.findById(profileId)
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Permission check: Only admin can delete users
    if (auth.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Delete the user
    await Profile.findByIdAndDelete(profileId)

    // Log audit trail
    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      auth.department || null,
      'delete-user',
      'user-profile',
      profileId,
      { name: targetUser.fullName, email: targetUser.email },
      'success'
    )

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
