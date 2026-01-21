import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { StudentCourse } from '@/lib/db/models'

export async function DELETE(request: NextRequest, props: { params: Promise<{ enrollmentId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const deleted = await StudentCourse.findByIdAndDelete(params.enrollmentId)
    if (!deleted) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Enrollment deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
