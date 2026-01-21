import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Message, Profile } from '@/lib/db/models'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    let query = Message.find()
    if (userId) {
      query = query.or([
        { senderId: userId },
        { recipientId: userId }
      ])
    }

    const messages = await query.sort({ createdAt: -1 }).lean()
    
    // Populate sender and receiver names
    const populatedMessages = await Promise.all(
      messages.map(async (msg: any) => {
        const sender = await Profile.findOne({ userId: msg.senderId }).lean()
        const receiver = await Profile.findOne({ userId: msg.recipientId }).lean()
        return {
          ...msg,
          sender,
          receiver
        }
      })
    )
    
    return NextResponse.json(populatedMessages)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    const message = new Message(body)
    const saved = await message.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
