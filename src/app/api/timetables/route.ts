import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Timetable } from '@/lib/db/models'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')

    let query = Timetable.find()
    if (courseId) {
      query = query.where('courseId').equals(courseId)
    }

    const timetables = await query.lean()
    return NextResponse.json(timetables)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const body = await request.json()
    const timetable = new Timetable(body)
    const saved = await timetable.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
