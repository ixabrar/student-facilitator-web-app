import { NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { Department } from '@/lib/db/models'

export async function GET() {
  try {
    await dbConnect()
    const departments = await Department.find().sort({ name: 1 })
    return NextResponse.json(departments)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect()
    const body = await request.json()
    
    // Validate required fields
    if (!body.name?.trim() || !body.abbreviation?.trim()) {
      return NextResponse.json(
        { error: 'Name and abbreviation are required' },
        { status: 400 }
      )
    }
    
    // Validate abbreviation format
    if (body.abbreviation.length < 2 || body.abbreviation.length > 4) {
      return NextResponse.json(
        { error: 'Abbreviation must be 2-4 characters' },
        { status: 400 }
      )
    }
    
    if (!/^[A-Z]+$/.test(body.abbreviation)) {
      return NextResponse.json(
        { error: 'Abbreviation must contain only uppercase letters' },
        { status: 400 }
      )
    }
    
    // Validate name length
    if (body.name.length > 100) {
      return NextResponse.json(
        { error: 'Department name must not exceed 100 characters' },
        { status: 400 }
      )
    }
    
    const department = new Department(body)
    const saved = await department.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    console.error('Error creating department:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errors: error.errors,
    })
    
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 409 }
      )
    }
    
    // Handle validation errors
    if (error.errors) {
      const messages = Object.values(error.errors).map((e: any) => e.message).join(', ')
      return NextResponse.json(
        { error: messages },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to create department' },
      { status: 500 }
    )
  }
}
