import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { FeePayment, Profile } from '@/lib/db/models'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')
    const paymentType = searchParams.get('paymentType')
    const department = searchParams.get('department')

    console.log('Fee Payments API - Query params:', { studentId, status, paymentType, department })

    let query: any = {}
    
    if (studentId) {
      query.studentId = studentId
    }
    if (department) {
      // Match by department ID or department name
      query.department = department
    }
    if (status) {
      query.status = status
    }
    if (paymentType) {
      query.paymentType = paymentType
    }

    console.log('Fee Payments API - Query filter:', query)

    const payments = await FeePayment.find(query).sort({ createdAt: -1 }).lean()
    console.log('Fee Payments API - Found payments:', payments.length)
    
    // Debug: Show all payments if searching by department and found nothing
    if (department && payments.length === 0) {
      const allPayments = await FeePayment.find({}).limit(5).lean()
      console.log('🔍 DEBUG: Total payments in DB:', await FeePayment.countDocuments())
      if (allPayments.length > 0) {
        console.log('🔍 DEBUG: Sample payment departments:', allPayments.map(p => ({
          id: p._id,
          studentName: p.studentName,
          department: p.department,
          status: p.status
        })))
      }
    }
    
    if (payments.length > 0) {
      console.log('First payment department:', payments[0].department)
    }
    
    return NextResponse.json(payments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()

    const { studentId, amount, paymentType, semester, paymentMethod, receiptUrl } = body

    if (!studentId || !amount || !paymentType) {
      return NextResponse.json({ error: 'studentId, amount, and paymentType are required' }, { status: 400 })
    }

    // Get student profile info
    const profile = await Profile.findById(studentId)
    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
    }

    // Generate transaction ID (for demo purposes)
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const payment = new FeePayment({
      studentId,
      studentName: profile.fullName,
      studentEmail: profile.email,
      department: profile.department,
      amount,
      paymentType,
      semester: semester || null,
      paymentMethod: paymentMethod || 'online',
      transactionId,
      receiptUrl: receiptUrl || null,
      status: 'pending'
    })

    const saved = await payment.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
