import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Profile, Department } from '@/lib/db/models'
import { verifyAuth, requireAdmin, requirePrincipal, logAudit } from '@/lib/rbac'
import { verifyToken } from '@/lib/db/auth'

/**
 * POST /api/admin/assign-hod
 * Assign a faculty member as HOD for a department
 * Admin can assign to any faculty
 * Principal can assign to any faculty in any department
 */
export async function POST(request: NextRequest) {
  try {
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

    const userId = decoded.userId
    const auth = await verifyAuth(userId)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin and Principal can assign HOD
    if (auth.role !== 'admin' && auth.role !== 'principal') {
      return NextResponse.json(
        { error: 'Only Admin or Principal can assign HOD' },
        { status: 403 }
      )
    }

    const { facultyId, departmentId } = await request.json()

    if (!facultyId || !departmentId) {
      return NextResponse.json(
        { error: 'facultyId and departmentId are required' },
        { status: 400 }
      )
    }

    // Get faculty member
    const faculty = await Profile.findById(facultyId)
    if (!faculty || faculty.role !== 'faculty') {
      return NextResponse.json(
        { error: 'Faculty member not found' },
        { status: 404 }
      )
    }

    // Get department
    const department = await Department.findById(departmentId)
    if (!department) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      )
    }

    // If there's an existing HOD for this department, demote them to faculty
    if (department.hodId) {
      await Profile.findByIdAndUpdate(department.hodId, { role: 'faculty' }, { new: true })
    }

    // Update faculty to HOD and assign to department
    const updatedFaculty = await Profile.findByIdAndUpdate(
      facultyId,
      {
        role: 'hod',
        department: departmentId.toString(),
        departmentName: department.name,
      },
      { new: true }
    )

    // Update department with new HOD
    const updatedDepartment = await Department.findByIdAndUpdate(
      departmentId,
      {
        hodId: facultyId,
        hodName: faculty.fullName,
      },
      { new: true }
    )

    // Log audit
    await logAudit(
      userId,
      auth.fullName,
      auth.role,
      auth.department,
      'assign-hod',
      'hod-assignment',
      departmentId,
      {
        faculty: {
          userId: faculty.userId,
          name: faculty.fullName,
          email: faculty.email,
        },
        department: {
          name: department.name,
          abbreviation: department.abbreviation,
        },
      },
      'success'
    )

    return NextResponse.json(
      {
        message: 'HOD assigned successfully',
        data: {
          faculty: {
            userId: updatedFaculty?.userId,
            fullName: updatedFaculty?.fullName,
            email: updatedFaculty?.email,
            role: updatedFaculty?.role,
            department: updatedFaculty?.department,
          },
          department: {
            _id: updatedDepartment?._id,
            name: updatedDepartment?.name,
            hodId: updatedDepartment?.hodId,
            hodName: updatedDepartment?.hodName,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error assigning HOD:', error)
    return NextResponse.json({ error: 'Failed to assign HOD' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/assign-hod
 * Remove HOD designation from a faculty member
 */
export async function DELETE(request: NextRequest) {
  try {
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

    const userId = decoded.userId
    const auth = await verifyAuth(userId)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin and Principal can remove HOD
    if (auth.role !== 'admin' && auth.role !== 'principal') {
      return NextResponse.json(
        { error: 'Only Admin or Principal can remove HOD' },
        { status: 403 }
      )
    }

    const { facultyId, departmentId } = await request.json()

    if (!facultyId || !departmentId) {
      return NextResponse.json(
        { error: 'facultyId and departmentId are required' },
        { status: 400 }
      )
    }

    // Verify HOD exists
    const hod = await Profile.findById(facultyId)
    if (!hod || hod.role !== 'hod') {
      return NextResponse.json(
        { error: 'HOD not found' },
        { status: 404 }
      )
    }

    // Demote HOD back to faculty
    const demotedFaculty = await Profile.findByIdAndUpdate(
      facultyId,
      { role: 'faculty' },
      { new: true }
    )

    // Remove HOD from department
    const updatedDepartment = await Department.findByIdAndUpdate(
      departmentId,
      {
        hodId: null,
        hodName: null,
      },
      { new: true }
    )

    // Log audit
    await logAudit(
      userId,
      auth.fullName,
      auth.role,
      auth.department,
      'remove-hod',
      'hod-removal',
      facultyId,
      {
        faculty: {
          userId: hod.userId,
          name: hod.fullName,
        },
        department: departmentId,
      },
      'success'
    )

    return NextResponse.json(
      {
        message: 'HOD removed successfully',
        data: {
          faculty: {
            userId: demotedFaculty?.userId,
            fullName: demotedFaculty?.fullName,
            role: demotedFaculty?.role,
          },
          department: {
            _id: updatedDepartment?._id,
            name: updatedDepartment?.name,
            hodId: updatedDepartment?.hodId,
          },
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error removing HOD:', error)
    return NextResponse.json({ error: 'Failed to remove HOD' }, { status: 500 })
  }
}
