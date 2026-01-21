import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Profile, Department } from '@/lib/db/models'
import { verifyAuth, hasPermission, canAccessDepartment, logAudit, requireHOD, compareIds } from '@/lib/rbac'
import { verifyToken } from '@/lib/db/auth'
import mongoose from 'mongoose'

/**
 * GET /api/faculties
 * Get faculties (students see dept faculties, HOD sees own dept, principal/admin see all)
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

    const searchParams = request.nextUrl.searchParams
    const departmentParam = searchParams.get('department')
    const roleParam = searchParams.get('role')
    const departmentId = searchParams.get('departmentId')

    // Default to faculty role if not specified, but allow querying for HODs
    let query: Record<string, any> = { 
      role: roleParam || 'faculty'
    }

    // If department parameter is provided, use it
    if (departmentParam) {
      // Department is stored as ObjectId in DB
      try {
        const deptObjId = new mongoose.Types.ObjectId(departmentParam)
        query.$and = [
          {
            $or: [
              { department: deptObjId },
              { department: departmentParam }
            ]
          },
          { role: query.role }
        ]
        delete query.department
        delete query.role
      } catch (e) {
        // Invalid ObjectId, use string match
        query.department = departmentParam
      }
    }
    // Otherwise apply role-based filtering
    else {
      // Students see faculties from their department
      if (auth.role === 'student') {
        query.department = auth.department
      }
      // HOD sees faculties in their department
      else if (auth.role === 'hod') {
        query.department = auth.department
      }
      // Principal sees all faculties
      else if (auth.role === 'principal') {
        // No filter - see all
      }
      // Admin sees all faculties
      else if (auth.role === 'admin') {
        // No filter - see all
      }
    }

    console.log('\n🔍 Faculties API Query:', JSON.stringify(query, null, 2))
    
    const faculties = await Profile.find(query).select('userId email fullName full_name department departmentName phone avatarUrl role').lean()
    console.log(`✅ Faculties found: ${faculties.length}`)
    if (faculties.length > 0) {
      console.log('First 3 results:')
      faculties.slice(0, 3).forEach((f: any, i) => {
        console.log(`  ${i + 1}. ${f.fullName} - Role: ${f.role}, Dept: ${f.department}`)  
      })
    }

    return NextResponse.json(faculties, { status: 200 })
  } catch (error) {
    console.error('Error fetching faculties:', error)
    return NextResponse.json({ error: 'Failed to fetch faculties' }, { status: 500 })
  }
}

/**
 * POST /api/faculties
 * HOD adds a faculty to their department
 * Principal/Admin can add to any department
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

    const userId = decoded.userId

    // Only HOD, Principal, and Admin can add faculties
    if (auth.role !== 'hod' && auth.role !== 'principal' && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Only HOD, Principal, or Admin can add faculties' }, { status: 403 })
    }

    const { email, fullName, department, departmentName } = await request.json()

    if (!email || !fullName || !department) {
      return NextResponse.json(
        { error: 'email, fullName, and department are required' },
        { status: 400 }
      )
    }

    // HOD can only add to their own department
    if (auth.role === 'hod' && !compareIds(auth.department, department)) {
      return NextResponse.json(
        { error: 'HOD can only add faculties to their own department' },
        { status: 403 }
      )
    }

    // Check if faculty already exists
    const existingFaculty = await Profile.findOne({ email })
    if (existingFaculty && existingFaculty.role === 'faculty') {
      return NextResponse.json(
        { error: 'Faculty with this email already exists' },
        { status: 409 }
      )
    }

    // Create new faculty profile
    const newFaculty = await Profile.create({
      email,
      fullName,
      role: 'faculty',
      department,
      departmentName,
      userId: email.split('@')[0] + '-' + Date.now(),
      approvalStatus: 'pending',
      isApprovalPending: true,
    })

    // Add faculty to department's faculty list
    await Department.findByIdAndUpdate(
      department,
      { $addToSet: { faculties: newFaculty.userId } },
      { new: true }
    )

    // Log audit
    await logAudit(
      userId,
      auth.fullName,
      auth.role,
      auth.department,
      'add-faculty',
      'faculty',
      newFaculty._id.toString(),
      { email, fullName, department },
      'success'
    )

    return NextResponse.json(
      {
        message: 'Faculty added successfully',
        faculty: {
          userId: newFaculty.userId,
          email: newFaculty.email,
          fullName: newFaculty.fullName,
          department: newFaculty.department,
          departmentName: newFaculty.departmentName,
          approvalStatus: newFaculty.approvalStatus,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error adding faculty:', error)
    return NextResponse.json({ error: 'Failed to add faculty' }, { status: 500 })
  }
}
