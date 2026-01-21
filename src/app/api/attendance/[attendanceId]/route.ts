import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Attendance } from '@/lib/db/models'

export async function PUT(request: NextRequest, props: { params: Promise<{ attendanceId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const body = await request.json()
    const updated = await Attendance.findByIdAndUpdate(params.attendanceId, body, { new: true })
    if (!updated) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ attendanceId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const deleted = await Attendance.findByIdAndDelete(params.attendanceId)
    if (!deleted) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Attendance deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
