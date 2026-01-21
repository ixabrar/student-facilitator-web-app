import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Scholarship } from '@/lib/db/models'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { scholarshipId: string } }
) {
  try {
    console.log('\n🔄 SCHOLARSHIP UPDATE API - PATCH Request')
    await dbConnect()

    const { scholarshipId } = params
    console.log('Scholarship ID:', scholarshipId)

    const body = await request.json()
    console.log('Update data:', body)

    const scholarship = await Scholarship.findById(scholarshipId)
    if (!scholarship) {
      console.error('❌ Scholarship not found')
      return NextResponse.json({ error: 'Scholarship not found' }, { status: 404 })
    }

    // Update fields - Allow updating application details for rejected applications
    if (body.fullName !== undefined) scholarship.fullName = body.fullName
    if (body.aadhaarNumber !== undefined) scholarship.aadhaarNumber = body.aadhaarNumber
    if (body.phoneNumber !== undefined) scholarship.phoneNumber = body.phoneNumber
    if (body.address !== undefined) scholarship.address = body.address
    if (body.selectedScholarships !== undefined) scholarship.selectedScholarships = body.selectedScholarships
    if (body.documents !== undefined) scholarship.documents = body.documents
    
    // Faculty/Admin updates
    if (body.status) scholarship.status = body.status
    if (body.reviewedBy) scholarship.reviewedBy = body.reviewedBy
    if (body.remarks !== undefined) scholarship.remarks = body.remarks
    if (body.status === 'approved' || body.status === 'rejected' || body.status === 'under_review') {
      scholarship.reviewedAt = new Date()
    }

    scholarship.updatedAt = new Date()
    await scholarship.save()

    console.log('✅ Scholarship updated successfully')
    return NextResponse.json(scholarship)
  } catch (error: any) {
    console.error('❌ PATCH Scholarship Error:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { scholarshipId: string } }
) {
  try {
    console.log('\n📖 SCHOLARSHIP DETAIL API - GET Request')
    await dbConnect()

    const { scholarshipId } = params
    console.log('Scholarship ID:', scholarshipId)

    const scholarship = await Scholarship.findById(scholarshipId)
      .populate('studentId', 'fullName email enrollmentNumber phone')
      .populate('reviewedBy', 'fullName')
      .lean()

    if (!scholarship) {
      console.error('❌ Scholarship not found')
      return NextResponse.json({ error: 'Scholarship not found' }, { status: 404 })
    }

    console.log('✅ Scholarship found')
    return NextResponse.json(scholarship)
  } catch (error: any) {
    console.error('❌ GET Scholarship Detail Error:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
