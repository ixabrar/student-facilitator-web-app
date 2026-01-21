import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { FeePayment } from '@/lib/db/models'

export async function PUT(request: NextRequest, props: { params: Promise<{ paymentId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const body = await request.json()

    const { status, receiptUrl, notes } = body

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const validStatuses = ['pending', 'paid', 'rejected', 'failed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const payment = await FeePayment.findById(params.paymentId)
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Update status
    payment.status = status
    if (status === 'paid') {
      payment.paidAt = new Date()
      payment.receiptUrl = receiptUrl || null
    }
    if (notes) {
      payment.notes = notes
    }

    const updated = await payment.save()
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ paymentId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()

    const payment = await FeePayment.findById(params.paymentId)
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Only pending payments can be deleted
    if (payment.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending payments can be cancelled' }, { status: 400 })
    }

    await FeePayment.findByIdAndDelete(params.paymentId)
    return NextResponse.json({ message: 'Payment cancelled' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
