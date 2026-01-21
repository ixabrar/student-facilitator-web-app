import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Notice } from '@/lib/db/models'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ noticeId: string }> }) {
  try {
    const { noticeId } = await params
    const body = await request.json()
    await dbConnect()

    const updated = await Notice.findByIdAndUpdate(
      noticeId,
      { ...body, updatedAt: new Date() },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ noticeId: string }> }) {
  try {
    const { noticeId } = await params
    await dbConnect()

    const deleted = await Notice.findByIdAndDelete(noticeId)
    if (!deleted) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
