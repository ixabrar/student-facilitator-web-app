import { Profile, AuditLog } from './db/models'

// Role hierarchy: Student < Faculty < HOD < Principal < Admin(System)
export type UserRole = 'student' | 'faculty' | 'hod' | 'principal' | 'admin'

export interface AuthContext {
  userId: string
  email: string
  role: UserRole
  department: string | null
  fullName: string
  departmentName?: string
  isSuperAdmin?: boolean
}

export interface RequestContext {
  auth: AuthContext
  ipAddress?: string
}

/**
 * Compare two IDs safely (handles ObjectId vs String)
 * Returns true if they match
 */
export function compareIds(id1: any, id2: any): boolean {
  if (!id1 || !id2) return false
  return id1.toString() === id2.toString()
}

/**
 * Check if an ID exists in an array (handles ObjectId vs String)
 */
export function idInArray(id: any, arr: any[]): boolean {
  if (!id || !arr) return false
  const idStr = id.toString()
  return arr.some(item => item.toString() === idStr)
}

// Role hierarchy levels for comparison
const roleHierarchy: Record<UserRole, number> = {
  student: 1,
  faculty: 2,
  hod: 3,
  principal: 4,
  admin: 5,
}

// Role-based permissions mapping - Hierarchical ERP System
const rolePermissions: Record<UserRole, Record<string, string[]>> = {
  admin: {
    // System Admin: Full access to everything
    department: ['create', 'read', 'update', 'delete', 'list-all', 'manage-hod'],
    academicYear: ['create', 'read', 'update', 'delete', 'list-all'],
    semester: ['create', 'read', 'update', 'delete', 'list-all'],
    faculty: ['create', 'read', 'update', 'delete', 'assign-department', 'approve-account', 'list-all', 'manage-all-depts'],
    principal: ['create', 'read', 'update', 'delete', 'list-all'],
    request: ['read-all', 'approve', 'reject', 'issue', 'list-all'],
    analytics: ['read-all', 'generate-reports'],
    audit: ['read-all', 'export'],
  },
  principal: {
    // Principal: Access to all departments, manage HODs, approve requests
    department: ['read', 'list-all', 'assign-hod'],
    faculty: ['read', 'list-all', 'read-all-depts'],
    request: ['read-all', 'approve', 'reject', 'issue', 'list-all'],
    analytics: ['read-all', 'generate-reports'],
    audit: ['read-all'],
    course: ['read-all-depts', 'list-all'],
  },
  hod: {
    // Head of Department: Manage faculty in own department, approve requests
    department: ['read-own'],
    faculty: ['create', 'read', 'update', 'delete', 'list-own-dept', 'manage-own-dept', 'assign-to-dept'],
    course: ['read-own', 'update-own', 'list-own-dept'],
    attendance: ['create', 'read-own', 'update-own', 'list-own-dept'],
    assignment: ['create', 'read-own', 'update-own', 'list-own-dept'],
    materials: ['upload', 'read-own', 'delete-own', 'list-own-dept'],
    request: ['read-own-dept', 'approve', 'reject', 'forward-to-principal'],
    student: ['read-own-dept', 'list-own-dept'],
  },
  faculty: {
    // Faculty: Create and manage own content, approve student requests
    course: ['read-own', 'update-own', 'list-department'],
    attendance: ['create', 'read-own', 'update-own', 'list-department'],
    assignment: ['create', 'read-own', 'update-own', 'list-department'],
    materials: ['upload', 'read-own', 'delete-own', 'list-department'],
    request: ['read-department', 'approve', 'forward-to-hod'],
    student: ['read-department', 'list-department'],
  },
  student: {
    // Student: Access to own data, submit work, view department resources
    course: ['read-own', 'enroll', 'list-department'],
    attendance: ['read-own'],
    assignment: ['read-own', 'submit'],
    materials: ['read-department'],
    request: ['create', 'read-own', 'track-approval'],
    profile: ['read-own', 'update-own'],
    faculty: ['list-own-dept', 'read-own-dept'],
  },
}


/**
 * Verify user authentication and load profile
 */
export async function verifyAuth(userId: string): Promise<AuthContext | null> {
  try {
    const profile = (await Profile.findOne({ userId }).lean()) as any
    if (!profile) {
      return null
    }
    
    // Faculty accounts must be approved before access (except admin)
    if (profile.role === 'faculty' && profile.approvalStatus !== 'approved') {
      return null
    }
    
    return {
      userId: profile.userId,
      email: profile.email,
      role: profile.role as UserRole,
      department: profile.department,
      fullName: profile.fullName,
      departmentName: profile.departmentName,
      isSuperAdmin: profile.role === 'admin',
    }
  } catch (error) {
    console.error('Error during profile verification:', error)
    return null
  }
}

/**
 * Check if user has permission for an action
 */
export function hasPermission(auth: AuthContext, resource: string, action: string): boolean {
  const permissions = rolePermissions[auth.role]?.[resource] || []
  return permissions.includes(action)
}

/**
 * Compare role levels in hierarchy
 * Returns: 1 if userRole > compareRole, -1 if <, 0 if =
 */
export function compareRoles(userRole: UserRole, compareRole: UserRole): number {
  const userLevel = roleHierarchy[userRole]
  const compareLevel = roleHierarchy[compareRole]
  
  if (userLevel > compareLevel) return 1
  if (userLevel < compareLevel) return -1
  return 0
}

/**
 * Check if user can manage/access faculty
 */
export function canManageFaculty(auth: AuthContext): boolean {
  return auth.role === 'hod' || auth.role === 'principal' || auth.role === 'admin'
}

/**
 * Check department isolation - verify user can access data from specific department
 */
export function canAccessDepartment(auth: AuthContext, targetDepartment: string | null): boolean {
  // System Admin has full access
  if (auth.role === 'admin') {
    return true
  }
  
  // Principal has access to all departments
  if (auth.role === 'principal') {
    return true
  }
  
  // Others can only access their own department
  if (!targetDepartment || !auth.department) {
    return false
  }
  
  return compareIds(auth.department, targetDepartment)
}

/**
 * Log audit trail for all operations
 */
export async function logAudit(
  userId: string,
  userName: string,
  userRole: string,
  department: string | null,
  action: string,
  resource: string,
  resourceId: string | null,
  changes: Record<string, any>,
  status: 'success' | 'failure' = 'success',
  errorMessage: string | null = null,
  ipAddress: string | null = null
): Promise<void> {
  try {
    await AuditLog.create({
      userId,
      userName,
      userRole,
      department,
      action,
      resource,
      resourceId,
      changes,
      status,
      errorMessage,
      ipAddress,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error('Failed to log audit trail:', error)
  }
}

/**
 * Enforce department isolation in query filters
 */
export function getDepartmentFilter(auth: AuthContext): Record<string, any> {
  if (auth.role === 'admin' || auth.role === 'principal') {
    return {} // No filter for admin and principal - they see all
  }
  return { department: auth.department } // Filter by user's department
}

/**
 * Validate HOD-only operations
 */
export function requireHOD(auth: AuthContext): boolean {
  return auth.role === 'hod'
}

/**
 * Validate Principal-only operations
 */
export function requirePrincipal(auth: AuthContext): boolean {
  return auth.role === 'principal'
}

/**
 * Validate admin-only operations
 */
export function requireAdmin(auth: AuthContext): boolean {
  return auth.role === 'admin'
}

/**
 * Validate same-department access
 */
export function canAccessResource(auth: AuthContext, resourceDepartment: string | null): boolean {
  if (auth.role === 'admin' || auth.role === 'principal') return true
  if (!resourceDepartment) return false
  return compareIds(auth.department, resourceDepartment)
}

/**
 * Get approval chain for multi-level approvals
 * Student → Faculty → HOD → Principal → Admin
 */
export function getApprovalChain(auth: AuthContext): UserRole[] {
  const chain: UserRole[] = []
  if (auth.role === 'student') {
    chain.push('faculty')
    chain.push('hod')
    chain.push('principal')
    chain.push('admin')
  }
  return chain
}

/**
 * Check if user can approve at current stage
 */
export function canApproveAtStage(auth: AuthContext, currentStage: string): boolean {
  if (auth.role === 'admin') return currentStage === 'admin-pending'
  if (auth.role === 'principal') return currentStage === 'principal-pending' || currentStage === 'hod-approved'
  if (auth.role === 'hod') {
    return currentStage === 'hod-pending' || currentStage === 'faculty-approved'
  }
  if (auth.role === 'faculty') {
    return currentStage === 'pending'
  }
  return false
}

/**
 * Get next approval stage in hierarchy
 */
export function getNextApprovalStage(currentStage: string): string | null {
  const stageMap: Record<string, string> = {
    'pending': 'faculty-approved',
    'faculty-approved': 'hod-approved',
    'hod-approved': 'principal-approved',
    'principal-approved': 'admin-approved',
    'admin-approved': 'issued',
  }
  return stageMap[currentStage] || null
}
