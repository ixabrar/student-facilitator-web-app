import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Profile } from '@/lib/db/models'
import Razorpay from 'razorpay'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('\n💰 CREATE ORDER API - Start')
    await dbConnect()
    const body = await request.json()
    console.log('Request body:', { studentId: body.studentId, amount: body.amount, paymentType: body.paymentType, semester: body.semester })

    const { studentId, amount, paymentType, semester } = body

    if (!studentId || !amount || !paymentType) {
      console.error('❌ Missing required fields:', { studentId, amount, paymentType })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get student profile
    console.log('Fetching profile for studentId:', studentId)
    const profile = await Profile.findById(studentId)
    console.log('Profile found:', profile ? { name: profile.fullName, role: profile.role } : 'null')
    
    if (!profile || profile.role !== 'student') {
      console.error('❌ Invalid profile - Not a student or not found')
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    console.log('Razorpay config check:', {
      hasKeyId: !!keyId,
      hasKeySecret: !!keySecret,
      keyIdPrefix: keyId?.substring(0, 15)
    })

    // Check if we have valid Razorpay credentials
    if (!keyId || !keySecret || keyId.includes('your_key')) {
      console.log('⚠️ No valid Razorpay credentials - using demo mode')
      const orderId = `order_demo_${crypto.randomBytes(12).toString('hex')}`
      
      return NextResponse.json({
        orderId,
        amount,
        currency: 'INR',
        studentName: profile.fullName,
        studentEmail: profile.email,
        key: 'rzp_test_demo_key',
      })
    }

    // Initialize Razorpay with real credentials
    console.log('🔑 Initializing Razorpay SDK...')
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    // Create real Razorpay order
    console.log('📝 Creating Razorpay order...')
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paisa
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        studentId,
        studentName: profile.fullName,
        paymentType,
        semester: semester || '',
      }
    })

    console.log('✅ Razorpay order created successfully:', {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    })

    const responseData = {
      orderId: order.id, // Use real Razorpay order ID
      amount,
      currency: 'INR',
      studentName: profile.fullName,
      studentEmail: profile.email,
      key: keyId, // Use real Razorpay key
    }
    
    console.log('Returning order data:', responseData)
    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error('❌❌❌ CREATE ORDER ERROR ❌❌❌')
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      fullError: error
    })
    return NextResponse.json({ 
      error: error.message || 'Failed to create order',
      details: error.toString()
    }, { status: 500 })
  }
}
