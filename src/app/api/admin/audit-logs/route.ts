import { NextRequest, NextResponse } from 'next/server'
import { AuditLog } from '@/lib/db/models'
import { verifyAuth, requireAdmin, getDepartmentFilter, logAudit } from '@/lib/rbac'
import { dbConnect } from '@/lib/db/connect'
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
    const resource = searchParams.get('resource')
    const action = searchParams.get('action')
    const days = parseInt(searchParams.get('days') || '7')

    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    let query: Record<string, any> = {
      timestamp: { $gte: dateFilter },
    }

    if (resource) query.resource = resource
    if (action) query.action = action

    // Faculty can see only their department's logs
    if (auth.role === 'faculty') {
      query.department = auth.department
    }
    // Admin can see all logs
    else if (auth.role !== 'admin') {
      // Students can see only their own logs
      query.userId = decoded.userId
    }

    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).lean()

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      auth.department,
      'list',
      'audit-logs',
      null,
      { count: logs.length, resource, action, days },
      'success'
    )

    return NextResponse.json(logs, { status: 200 })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    if (!auth || !requireAdmin(auth)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { startDate, endDate, resource, action } = body

    let query: Record<string, any> = {}

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    }

    if (resource) query.resource = resource
    if (action) query.action = action

    const logs = await AuditLog.find(query).sort({ timestamp: -1 }).lean()

    await logAudit(
      decoded.userId,
      auth.fullName,
      auth.role,
      null,
      'export',
      'audit-logs',
      null,
      { count: logs.length, startDate, endDate, resource, action },
      'success'
    )

    return NextResponse.json(
      {
        success: true,
        count: logs.length,
        logs,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
