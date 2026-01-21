'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Users, Search, Shield, Trash2, CheckCircle2, XCircle, AlertCircle, Building2, Mail, Phone, GraduationCap } from 'lucide-react'
import { ensureArray } from '@/lib/fetchUtils'

interface Profile {
  _id: string
  email: string
  fullName: string
  role: string
  department?: string
  departmentName?: string
  phone?: string
  approvalStatus?: string
  createdAt: string
}

interface Department {
  _id: string
  name: string
}

export default function UsersPage() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [students, setStudents] = useState<Profile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [pendingFaculty, setPendingFaculty] = useState<Profile[]>([])
  const [assignHODDialog, setAssignHODDialog] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState<Profile | null>(null)
  const [selectedDept, setSelectedDept] = useState<string>('')

  // For principal - show students view
  const isPrincipal = profile?.role === 'principal'

  const fetchStudents = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      let url = '/api/profiles?role=student'
      
      if (departmentFilter !== 'all') {
        url += `&department=${departmentFilter}`
      }
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error('Failed to fetch students')
      
      const data = await res.json()
      const sorted = ensureArray(data).sort((a: Profile, b: Profile) => 
        a.fullName.localeCompare(b.fullName)
      )
      setStudents(sorted)
    } catch (error) {
      console.error('Error fetching students:', error)
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      let url = '/api/profiles'
      
      // Admin sees all users
      if (profile?.role === 'admin') {
        url += '?allUsers=true'
      } else if (profile?.role === 'hod') {
        // HOD sees only faculty in their department - use departmentName for better matching
        const departmentFilter = profile.departmentName || profile.department
        url += `?role=faculty&department=${departmentFilter}`
        console.log('HOD Fetching users from:', url)
        console.log('HOD Profile:', { 
          dept: profile.department, 
          deptName: profile.departmentName,
          role: profile.role 
        })
      }
      
      if (roleFilter !== 'all' && profile?.role === 'admin') {
        url += `&role=${roleFilter}`
      }
      
      const token = localStorage.getItem('authToken')
      if (!token) {
        console.warn('No auth token found in localStorage')
        toast.error('No authentication token found. Please login again.')
        setLoading(false)
        return
      }

      console.log('Fetching from URL:', url)
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      })
      if (!res.ok) {
        const error = await res.json()
        console.error('API Error:', res.status, error)
        throw new Error(error.error || 'Failed to fetch users')
      }
      const data = await res.json()
      console.log('Received data:', data)
      const sorted = ensureArray(data).sort((a: Profile, b: Profile) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setUsers(sorted)
      console.log('Set users:', sorted.length)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingFaculty = async () => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        console.warn('No auth token found in localStorage')
        return
      }

      const res = await fetch('/api/admin/faculty-approvals', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      })
      if (res.ok) {
        const data = await res.json()
        setPendingFaculty(ensureArray(data))
      } else {
        console.error('Failed to fetch pending faculty:', res.status, await res.json())
      }
    } catch (error) {
      console.error('Error fetching pending faculty:', error)
    }
  }

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments')
      if (res.ok) {
        const data = await res.json()
        setDepartments(ensureArray(data))
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  useEffect(() => {
    if (profile?.role === 'admin') {
      setPageLoading(false)
      fetchUsers()
      fetchPendingFaculty()
      fetchDepartments()
    } else if (profile?.role === 'hod') {
      setPageLoading(false)
      fetchUsers()
      fetchDepartments()
    } else if (profile?.role === 'principal') {
      setPageLoading(false)
      fetchStudents()
      fetchDepartments()
    } else if (profile) {
      setPageLoading(false)
    }
  }, [profile, roleFilter, departmentFilter])

  const handleApproveFaculty = async (facultyId: string, status: 'approved' | 'rejected') => {
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/admin/faculty-approvals', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facultyId,
          status,
          comments: `Approved by admin on ${new Date().toISOString()}`
        })
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || `Failed to ${status} faculty`)
        return
      }

      toast.success(`Faculty ${status} successfully`)
      fetchPendingFaculty()
      fetchUsers()
    } catch (error) {
      console.error(`Error updating faculty approval:`, error)
      toast.error(`Failed to ${status} faculty`)
    }
  }

  const handleAssignHOD = async () => {
    if (!selectedFaculty || !selectedDept) {
      toast.error('Please select faculty and department')
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/admin/assign-hod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facultyId: selectedFaculty._id,
          departmentId: selectedDept
        })
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || 'Failed to assign HOD')
        return
      }

      toast.success('Faculty assigned as HOD successfully')
      setAssignHODDialog(false)
      setSelectedFaculty(null)
      setSelectedDept('')
      fetchUsers()
    } catch (error) {
      console.error('Error assigning HOD:', error)
      toast.error('Failed to assign HOD')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`/api/profiles/${userId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.message || 'Failed to update role')
        return
      }
      
      toast.success('Role updated successfully')
      fetchUsers()
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Failed to update role')
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`/api/profiles/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        }
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.message || 'Failed to delete user')
        return
      }
      
      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('Failed to delete user')
    }
  }

  const filteredUsers = users.filter(user => 
    user.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    user.email?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredStudents = students.filter(student => 
    student.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    student.email?.toLowerCase().includes(search.toLowerCase()) ||
    (student.departmentName || '').toLowerCase().includes(search.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-700">Admin</Badge>
      case 'principal':
        return <Badge className="bg-pink-100 text-pink-700">Principal</Badge>
      case 'hod':
        return <Badge className="bg-orange-100 text-orange-700">HOD</Badge>
      case 'faculty':
        return <Badge className="bg-blue-100 text-blue-700">Faculty</Badge>
      case 'student':
        return <Badge className="bg-green-100 text-green-700">Student</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  const getApprovalBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>
      default:
        return null
    }
  }

  if (pageLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          <p className="text-muted-foreground mt-4">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'hod' && profile.role !== 'principal')) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">You don&apos;t have permission to access this page</p>
        </CardContent>
      </Card>
    )
  }

  // Principal view - Students only
  if (isPrincipal) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-muted-foreground">View all students across departments</p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{students.length}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{departments.length}</p>
                  <p className="text-sm text-muted-foreground">Departments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{departmentFilter !== 'all' ? filteredStudents.length : students.length}</p>
                  <p className="text-sm text-muted-foreground">Filtered Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Student Directory</CardTitle>
            <CardDescription>Search and filter students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No students found</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredStudents.map((student) => (
                  <div
                    key={student._id}
                    className="p-4 rounded-lg border bg-gradient-to-r from-slate-50 to-white hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {student.fullName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{student.fullName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Student
                              </Badge>
                              {student.departmentName && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {student.departmentName}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="ml-13 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <span>{student.email}</span>
                          </div>
                          {student.phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{student.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin/HOD view - Original users table
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage Users</h1>
        <p className="text-muted-foreground">View and manage all users in the system</p>
      </div>

      {/* Pending Faculty Approvals Section */}
      {pendingFaculty.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="h-5 w-5" />
              Pending Faculty Approvals ({pendingFaculty.length})
            </CardTitle>
            <CardDescription>Faculty accounts waiting for approval</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingFaculty.map((faculty) => (
                  <TableRow key={faculty._id}>
                    <TableCell className="font-medium">{faculty.fullName}</TableCell>
                    <TableCell>{faculty.email}</TableCell>
                    <TableCell>{faculty.departmentName || faculty.department || '-'}</TableCell>
                    <TableCell>{format(new Date(faculty.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 border-green-200"
                          onClick={() => handleApproveFaculty(faculty._id, 'approved')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-50 border-red-200"
                          onClick={() => handleApproveFaculty(faculty._id, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Show role filter only for Admin (HOD only sees Faculty) */}
        {profile?.role === 'admin' && (
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="faculty">Faculty</SelectItem>
              <SelectItem value="hod">HOD</SelectItem>
              <SelectItem value="principal">Principal</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <Card className="animate-pulse">
          <CardContent className="pt-6">
            <div className="h-64 bg-slate-200 rounded"></div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.departmentName || user.department || '-'}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getApprovalBadge(user.approvalStatus)}</TableCell>
                    <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Only Admin can change roles */}
                        {profile.role === 'admin' && (
                          <Select 
                            value={user.role}
                            onValueChange={(v) => handleRoleChange(user._id, v)}
                            disabled={user._id === profile._id}
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="student">Student</SelectItem>
                              <SelectItem value="faculty">Faculty</SelectItem>
                              <SelectItem value="hod">HOD</SelectItem>
                              <SelectItem value="principal">Principal</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        {/* Only Admin can assign HOD */}
                        {profile.role === 'admin' && user.role === 'faculty' && user._id !== profile._id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedFaculty(user)
                              setAssignHODDialog(true)
                            }}
                          >
                            Assign HOD
                          </Button>
                        )}
                        
                        {/* Only Admin can delete users */}
                        {profile.role === 'admin' && user._id !== profile._id && (
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleDelete(user._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* HOD can only view faculty details */}
                        {profile.role === 'hod' && (
                          <span className="text-sm text-muted-foreground">View only</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Assign HOD Dialog */}
      <Dialog open={assignHODDialog} onOpenChange={setAssignHODDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Faculty as HOD</DialogTitle>
            <DialogDescription>
              Select a department to assign {selectedFaculty?.fullName} as Head of Department
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Faculty</label>
              <div className="mt-1 p-2 bg-slate-100 rounded">
                {selectedFaculty?.fullName} ({selectedFaculty?.email})
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Select Department</label>
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept._id} value={dept._id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setAssignHODDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignHOD}>
                Assign as HOD
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

