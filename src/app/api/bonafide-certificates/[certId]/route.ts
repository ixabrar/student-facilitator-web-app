import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { BonafideCertificate } from '@/lib/db/models'

export async function PUT(request: NextRequest, props: { params: Promise<{ certId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const body = await request.json()

    const { status, approvedBy, rejectionReason, certificateUrl } = body

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const validStatuses = ['pending', 'faculty-approved', 'hod-approved', 'admin-approved', 'rejected', 'issued']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const cert = await BonafideCertificate.findById(params.certId)
    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    // Update status
    cert.status = status
    if (status === 'faculty-approved' || status === 'hod-approved' || status === 'admin-approved') {
      cert.approvedAt = new Date()
      cert.approvedBy = approvedBy || null
    }
    if (status === 'rejected') {
      cert.rejectionReason = rejectionReason || null
    }
    if (status === 'issued' && certificateUrl) {
      cert.certificateUrl = certificateUrl
    }

    const updated = await cert.save()
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ certId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()

    const cert = await BonafideCertificate.findById(params.certId)
    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    // Only pending requests can be deleted
    if (cert.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending requests can be deleted' }, { status: 400 })
    }

    await BonafideCertificate.findByIdAndDelete(params.certId)
    return NextResponse.json({ message: 'Request cancelled' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
