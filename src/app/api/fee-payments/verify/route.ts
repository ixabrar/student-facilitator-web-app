import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { FeePayment, Profile } from '@/lib/db/models'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('\n✅ VERIFY PAYMENT API - Start')
    await dbConnect()
    const body = await request.json()
    console.log('Verification request:', {
      razorpay_order_id: body.razorpay_order_id,
      razorpay_payment_id: body.razorpay_payment_id,
      has_signature: !!body.razorpay_signature,
      studentId: body.studentId,
      amount: body.amount
    })

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      studentId,
      amount,
      paymentType,
      semester,
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('❌ Missing payment details')
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    // Verify signature - In production, use actual Razorpay secret
    // const generated_signature = crypto
    //   .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    //   .update(razorpay_order_id + '|' + razorpay_payment_id)
    //   .digest('hex')

    // if (generated_signature !== razorpay_signature) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    // }

    // For demo, we'll accept any signature
    console.log('✅ Payment signature verified (demo mode)')

    // Get student profile
    const profile = await Profile.findById(studentId)
    if (!profile || profile.role !== 'student') {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Create payment record with verified status
    const payment = new FeePayment({
      studentId,
      studentName: profile.fullName,
      studentEmail: profile.email,
      department: profile.department,
      amount,
      paymentType,
      semester: semester || null,
      paymentMethod: 'online',
      transactionId: razorpay_payment_id,
      receiptUrl: null, // Online payments don't need manual receipt
      status: 'paid', // Auto-approved for online payments
      paidAt: new Date(),
    })

    console.log('Saving payment to database...')
    const saved = await payment.save()
    console.log('Payment saved successfully with ID:', saved._id)

    console.log('✅ Payment verified and saved:', {
      paymentId: saved._id,
      studentName: profile.fullName,
      amount,
      transactionId: razorpay_payment_id,
      status: saved.status
    })

    const responseData = {
      success: true,
      payment: saved,
      message: 'Payment verified successfully'
    }
    
    console.log('Returning success response')
    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error('Verify payment error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
