import { NextRequest, NextResponse } from 'next/server'
import { dbConnect } from '@/lib/db/connect'
import { StudyMaterial, Course } from '@/lib/db/models'
import { verifyAuth, canAccessDepartment } from '@/lib/rbac'
import { verifyToken } from '@/lib/db/auth'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    // Verify authentication via Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = verifyToken(token) as any
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const auth = await verifyAuth(decoded.userId)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')
    const facultyId = searchParams.get('facultyId')

    let query = StudyMaterial.find()
    if (courseId) {
      query = query.where('courseId').equals(courseId)
    }
    if (facultyId) {
      query = query.where('facultyId').equals(facultyId)
    }

    // BUG #28: Add department isolation - non-admin users see only their department's materials
    if (auth.role !== 'admin') {
      if (courseId) {
        const course = (await Course.findById(courseId).lean()) as any
        if (!course) {
          return NextResponse.json({ error: 'Course not found' }, { status: 404 })
        }
        if (!canAccessDepartment(auth, course.departmentId)) {
          return NextResponse.json({ error: 'Cannot access materials from other departments' }, { status: 403 })
        }
      }
    }

    const materials = await query.sort({ createdAt: -1 }).lean()
    
    // Populate course names
    const materialsWithCourses = await Promise.all(
      materials.map(async (material: any) => {
        const course = await Course.findById(material.courseId).lean()
        return {
          ...material,
          courseName: course ? (course as any).name : 'Unknown Course'
        }
      })
    )
    
    return NextResponse.json(materialsWithCourses)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    // Verify authentication via Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = verifyToken(token) as any
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const auth = await verifyAuth(decoded.userId)
    if (!auth || (auth.role !== 'faculty' && auth.role !== 'admin')) {
      return NextResponse.json({ error: 'Only faculty can upload materials' }, { status: 403 })
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const courseId = formData.get('courseId') as string
    const facultyId = formData.get('facultyId') as string

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!title || !courseId) {
      return NextResponse.json({ error: 'Title and course are required' }, { status: 400 })
    }

    // Import required modules for file handling
    const fs = await import('fs/promises')
    const path = await import('path')
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'materials')
    await fs.mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${sanitizedFileName}`
    const filePath = path.join(uploadsDir, fileName)

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await fs.writeFile(filePath, buffer)

    // Create file URL
    const fileUrl = `/uploads/materials/${fileName}`

    // Create material record
    const material = new StudyMaterial({
      title,
      description: description || null,
      courseId,
      facultyId,
      fileUrl,
      fileName: file.name,
      fileType: file.type,
    })

    const saved = await material.save()
    return NextResponse.json(saved, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
