import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Profile, Department } from '@/lib/db/models'
import { verifyAuth, canAccessDepartment, logAudit, compareIds } from '@/lib/rbac'
import { verifyToken } from '@/lib/db/auth'

/**
 * PUT /api/faculties/[facultyId]
 * Update faculty details (HOD can update faculty in own dept, Admin/Principal can update any)
 */
export async function PUT(request: NextRequest, { params }: { params: { facultyId: string } }) {
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

    // Only HOD, Principal, and Admin can update faculties
    if (auth.role !== 'hod' && auth.role !== 'principal' && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const faculty = await Profile.findById(params.facultyId)
    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })
    }

    // Verify it's actually a faculty
    if (faculty.role !== 'faculty') {
      return NextResponse.json({ error: 'User is not a faculty member' }, { status: 400 })
    }

    // HOD can only update faculties in their department
    if (auth.role === 'hod' && !compareIds(faculty.department, auth.department)) {
      return NextResponse.json(
        { error: 'HOD can only update faculties in their own department' },
        { status: 403 }
      )
    }

    const { fullName, phone, avatarUrl, department, departmentName } = await request.json()

    const updateData: Record<string, any> = {}
    if (fullName) updateData.fullName = fullName
    if (phone) updateData.phone = phone
    if (avatarUrl) updateData.avatarUrl = avatarUrl

    // Only Admin/Principal can change department
    if ((auth.role === 'admin' || auth.role === 'principal') && department) {
      updateData.department = department
      updateData.departmentName = departmentName
    }

    const oldData = faculty.toObject()
    const updatedFaculty = await Profile.findByIdAndUpdate(params.facultyId, updateData, {
      new: true,
    })

    // Log audit
    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      auth.department,
      'update-faculty',
      'faculty',
      params.facultyId,
      { old: oldData, new: updateData },
      'success'
    )

    return NextResponse.json(
      {
        message: 'Faculty updated successfully',
        faculty: updatedFaculty,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating faculty:', error)
    return NextResponse.json({ error: 'Failed to update faculty' }, { status: 500 })
  }
}

/**
 * DELETE /api/faculties/[facultyId]
 * Remove faculty from department (HOD removes from own dept, Admin/Principal can remove any)
 */
export async function DELETE(request: NextRequest, { params }: { params: { facultyId: string } }) {
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

    // Only HOD, Principal, and Admin can remove faculties
    if (auth.role !== 'hod' && auth.role !== 'principal' && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const faculty = await Profile.findById(params.facultyId)
    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found' }, { status: 404 })
    }

    // HOD can only remove from their department
    if (auth.role === 'hod' && !compareIds(faculty.department, auth.department)) {
      return NextResponse.json(
        { error: 'HOD can only remove faculties from their own department' },
        { status: 403 }
      )
    }

    // Remove faculty from department's faculty list
    if (faculty.department) {
      await Department.findByIdAndUpdate(
        faculty.department,
        { $pull: { faculties: faculty.userId } },
        { new: true }
      )
    }

    // Actually delete the faculty profile
    await Profile.findByIdAndDelete(params.facultyId)

    // Log audit
    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      auth.department,
      'delete-faculty',
      'faculty',
      params.facultyId,
      { faculty: faculty.toObject() },
      'success'
    )

    return NextResponse.json(
      { message: 'Faculty removed successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error removing faculty:', error)
    return NextResponse.json({ error: 'Failed to remove faculty' }, { status: 500 })
  }
}
