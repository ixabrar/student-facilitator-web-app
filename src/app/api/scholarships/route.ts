import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Scholarship, Profile } from '@/lib/db/models'

export async function GET(request: NextRequest) {
  try {
    console.log('\n📚 SCHOLARSHIPS API - GET Request')
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const departmentId = searchParams.get('departmentId')
    const status = searchParams.get('status')

    console.log('Query params:', { studentId, departmentId, status })

    let query: any = {}

    if (studentId) {
      query.studentId = studentId
      console.log('Fetching scholarship for student:', studentId)
    }

    if (departmentId) {
      query.departmentId = departmentId
      console.log('Fetching scholarships for department:', departmentId)
    }

    if (status) {
      query.status = status
      console.log('Filtering by status:', status)
    }

    const scholarships = await Scholarship.find(query)
      .populate('studentId', 'fullName email enrollmentNumber')
      .populate('reviewedBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean()

    console.log(`✅ Found ${scholarships.length} scholarship(s)`)
    return NextResponse.json(scholarships)
  } catch (error: any) {
    console.error('❌ GET Scholarships Error:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('\n📝 SCHOLARSHIPS API - POST Request')
    await dbConnect()

    const body = await request.json()
    console.log('Request body:', {
      studentId: body.studentId,
      scholarshipCount: body.selectedScholarships?.length,
      hasDocuments: !!body.documents
    })

    const {
      studentId,
      fullName,
      aadhaarNumber,
      phoneNumber,
      address,
      selectedScholarships,
      documents
    } = body

    // Validate required fields
    if (!studentId || !fullName || !aadhaarNumber || !phoneNumber || !address || !selectedScholarships?.length) {
      console.error('❌ Missing required fields')
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate Aadhaar format
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      console.error('❌ Invalid Aadhaar number format')
      return NextResponse.json({ error: 'Aadhaar number must be 12 digits' }, { status: 400 })
    }

    // Validate Phone format
    if (!/^\d{10}$/.test(phoneNumber)) {
      console.error('❌ Invalid phone number format')
      return NextResponse.json({ error: 'Phone number must be 10 digits' }, { status: 400 })
    }

    // Get student profile to get departmentId
    console.log('Fetching student profile...')
    const profile = await Profile.findById(studentId)
    if (!profile) {
      console.error('❌ Student profile not found')
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (profile.role !== 'student') {
      console.error('❌ Profile is not a student')
      return NextResponse.json({ error: 'Only students can apply' }, { status: 403 })
    }

    console.log('Student profile found:', {
      name: profile.fullName,
      department: profile.department
    })

    // Check if already applied
    const existing = await Scholarship.findOne({ studentId })
    if (existing) {
      console.log('⚠️ Student already has an application')
      return NextResponse.json({ error: 'You have already submitted a scholarship application' }, { status: 400 })
    }

    // Create scholarship application
    console.log('Creating scholarship application...')
    const scholarship = await Scholarship.create({
      studentId,
      departmentId: profile.department,
      fullName,
      aadhaarNumber,
      phoneNumber,
      address,
      selectedScholarships,
      documents,
      status: 'pending'
    })

    console.log('✅ Scholarship application created:', scholarship._id)
    return NextResponse.json(scholarship, { status: 201 })
  } catch (error: any) {
    console.error('❌ POST Scholarship Error:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    })
    
    if (error.code === 11000) {
      return NextResponse.json({ error: 'You have already applied for scholarships' }, { status: 400 })
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
