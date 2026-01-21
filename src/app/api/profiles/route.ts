import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Profile } from '@/lib/db/models'
import { verifyAuth, requireAdmin } from '@/lib/rbac'
import { verifyToken } from '@/lib/db/auth'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')
    const roles = searchParams.getAll('role') // Support multiple role parameters
    const search = searchParams.get('search')
    const department = searchParams.get('department') // Filter by specific department
    const allUsers = searchParams.get('allUsers') === 'true' // Admin can request all users

    // Check if this is an admin/principal request for all users
    if (allUsers && auth.role !== 'admin' && auth.role !== 'principal') {
      return NextResponse.json({ error: 'Admin/Principal access required' }, { status: 403 })
    }

    // Build query filter object
    const filter: any = { $and: [] }
    
    // If department parameter is provided, filter by it (for admin/principal ONLY)
    if (department && (auth.role === 'admin' || auth.role === 'principal')) {
      // Department is stored as ObjectId in DB
      // Try to match as ObjectId first, fallback to string and name
      try {
        const deptObjId = new mongoose.Types.ObjectId(department)
        filter.$and.push({
          $or: [
            { department: deptObjId },
            { department: department },
            { departmentName: department }
          ]
        })
      } catch (e) {
        // Invalid ObjectId, just match as string
        filter.$and.push({
          $or: [
            { department: department },
            { departmentName: department }
          ]
        })
      }
    }
    
    // Apply role-based filtering for non-admin/principal users
    // HOD should always have their department restriction applied, even when passing department param
    const shouldApplyRoleFilter = auth.role !== 'admin' && auth.role !== 'principal'
    if (shouldApplyRoleFilter) {
      // Non-admin users can only see users from their department or specific roles
      if (auth.role === 'student') {
        // Students see faculty and admin from their department
        filter.$and.push({
          $or: [
            { department: auth.department },
            { departmentName: auth.departmentName },
            { department: auth.departmentName },
            { departmentName: auth.department }
          ]
        })
        filter.$and.push({ role: { $in: ['faculty', 'admin', 'hod', 'principal'] } })
      } else if (auth.role === 'faculty') {
        // Faculty see their department's users
        // Build OR conditions dynamically, only including non-null values
        const deptConditions = []
        if (auth.department) {
          deptConditions.push(
            { department: auth.department },
            { departmentName: auth.department }
          )
        }
        if (auth.departmentName && auth.departmentName !== auth.department) {
          deptConditions.push(
            { department: auth.departmentName },
            { departmentName: auth.departmentName }
          )
        }
        
        if (deptConditions.length > 0) {
          filter.$and.push({ $or: deptConditions })
        }
      } else if (auth.role === 'hod') {
        // HOD see their department's users
        // Build OR conditions dynamically, only including non-null values
        const deptConditions = []
        
        console.log('HOD Department Check:', {
          authDept: auth.department,
          authDeptName: auth.departmentName
        })
        
        if (auth.department) {
          deptConditions.push(
            { department: auth.department },
            { departmentName: auth.department }
          )
        }
        if (auth.departmentName && auth.departmentName !== auth.department) {
          deptConditions.push(
            { department: auth.departmentName },
            { departmentName: auth.departmentName }
          )
        }
        
        console.log('HOD Filter Conditions:', deptConditions)
        
        if (deptConditions.length > 0) {
          filter.$and.push({ $or: deptConditions })
        } else {
          console.warn('⚠️ HOD has no department set! Cannot filter users.')
        }
      } else if (auth.role === 'principal') {
        // Principal see all users (no department filter)
        // No filter needed
      }
    }

    if (role) {
      filter.$and.push({ role: role })
    } else if (roles && roles.length > 0) {
      // Support multiple roles
      filter.$and.push({ role: { $in: roles } })
    }
    if (search) {
      filter.$and.push({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      })
    }

    // If no conditions in $and, remove it
    const finalFilter = filter.$and.length > 0 ? filter : {}

    // Server-side logging
    console.log('\n🔍 Profiles API Called')
    console.log('Auth:', { role: auth.role, dept: auth.department || auth.departmentName })
    console.log('Params:', { role, roles, department, search, allUsers })
    console.log('Filter:', JSON.stringify(finalFilter, null, 2))

    const profiles = await Profile.find(finalFilter).sort({ createdAt: -1 }).lean()
    console.log(`✅ Profiles found: ${profiles.length}`)
    
    if (profiles.length > 0) {
      console.log('First 3 results:')
      profiles.slice(0, 3).forEach((p: any, i) => {
        console.log(`  ${i + 1}. ${p.fullName} - Role: ${p.role}, Dept: ${p.department || p.departmentName}`)
      })
    } else {
      console.warn('⚠️ No profiles found!')
      const allProfiles = await Profile.find().lean()
      console.log(`Total profiles in DB: ${allProfiles.length}`)
      
      // Show all students
      const allStudents = allProfiles.filter((p: any) => p.role === 'student')
      console.log(`\nAll students in DB: ${allStudents.length}`)
      allStudents.forEach((s: any, i) => {
        console.log(`  ${i + 1}. ${s.fullName} - Dept: ${s.department} (type: ${typeof s.department}), DeptName: ${s.departmentName}`)
      })
      
      console.log('\nSample profiles:')
      if (allProfiles.length > 0) {
        console.log('Sample profiles:')
        allProfiles.slice(0, 3).forEach((p: any, i) => {
          console.log(`  ${i + 1}. ${p.fullName} - Role: ${p.role}, Dept: ${p.department}, DeptName: ${p.departmentName}`)
        })
      }
    }
    
    return NextResponse.json(profiles)
  } catch (error: any) {
    console.error('Profiles API Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch users',
        details: error.message 
      }, 
      { status: 500 }
    )
  }
}
