import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Message } from '@/lib/db/models'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ messageId: string }> }) {
  try {
    const { messageId } = await params
    const body = await request.json()
    await dbConnect()

    const updated = await Message.findByIdAndUpdate(
      messageId,
      body,
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
