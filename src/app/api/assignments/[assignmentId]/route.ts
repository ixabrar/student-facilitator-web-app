import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Assignment } from '@/lib/db/models'

export async function PUT(request: NextRequest, props: { params: Promise<{ assignmentId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const body = await request.json()
    const updated = await Assignment.findByIdAndUpdate(params.assignmentId, body, { new: true })
    if (!updated) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ assignmentId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const deleted = await Assignment.findByIdAndDelete(params.assignmentId)
    if (!deleted) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Assignment deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
