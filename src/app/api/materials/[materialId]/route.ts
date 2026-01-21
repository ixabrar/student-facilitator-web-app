import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { StudyMaterial } from '@/lib/db/models'

export async function PUT(request: NextRequest, props: { params: Promise<{ materialId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const body = await request.json()
    const updated = await StudyMaterial.findByIdAndUpdate(params.materialId, body, { new: true })
    if (!updated) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ materialId: string }> }) {
  try {
    const params = await props.params
    await dbConnect()
    const deleted = await StudyMaterial.findByIdAndDelete(params.materialId)
    if (!deleted) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Material deleted' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
