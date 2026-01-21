import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { AssignmentSubmission } from '@/lib/db/models'

export async function PUT(request: NextRequest, props: { params: Promise<{ submissionId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const body = await request.json()
    const updated = await AssignmentSubmission.findByIdAndUpdate(params.submissionId, body, { new: true })
    if (!updated) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ submissionId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const deleted = await AssignmentSubmission.findByIdAndDelete(params.submissionId)
    if (!deleted) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Submission deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
