import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Notice, Profile } from '@/lib/db/models'
import { verifyAuth } from '@/lib/rbac'
import { verifyToken } from '@/lib/db/auth'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    // Use Bearer token authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = verifyToken(token) as any
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const auth = await verifyAuth(decoded.userId)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')

    const notices = await Notice.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    // Populate author information
    const populatedNotices = await Promise.all(
      notices.map(async (notice: any) => {
        const author = await Profile.findOne({ userId: notice.authorId }).lean()
        return {
          ...notice,
          author
        }
      })
    )

    return NextResponse.json(populatedNotices)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    const notice = new Notice(body)
    const saved = await notice.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
