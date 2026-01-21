'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { GraduationCap, Search, Filter, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react'

interface Student {
  _id: string
  fullName: string
  email: string
  enrollmentNumber: string
}

interface ScholarshipApplication {
  _id: string
  studentId: Student
  fullName: string
  aadhaarNumber: string
  phoneNumber: string
  address: string
  selectedScholarships: string[]
  documents: {
    sscMarksheet?: string
    diplomaSem1Marksheet?: string
    diplomaSem2Marksheet?: string
  }
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  reviewedBy?: any
  reviewedAt?: string
  remarks?: string
  createdAt: string
}

export default function FacultyScholarshipsPage() {
  const { profile } = useAuth()
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [applications, setApplications] = useState<ScholarshipApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'filled' | 'not-filled'>('all')
  const [selectedApplication, setSelectedApplication] = useState<ScholarshipApplication | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reviewData, setReviewData] = useState({ status: '', remarks: '' })

  useEffect(() => {
    if (profile?.department) {
      fetchData()
    }
  }, [profile?.department])

  const fetchData = async () => {
    try {
      console.log('📚 Fetching scholarship data for department:', profile?.department)
      
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken')
      if (!token) {
        console.error('❌ No auth token found')
        toast.error('Authentication required')
        setLoading(false)
        return
      }
      
      // Fetch all students in department
      const studentsRes = await fetch(
        `/api/profiles?role=student&department=${profile?.department}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json()
        console.log('✅ Students fetched:', studentsData.length)
        setAllStudents(studentsData)
      } else {
        console.error('❌ Failed to fetch students:', studentsRes.status)
      }

      // Fetch scholarship applications
      const appsRes = await fetch(`/api/scholarships?departmentId=${profile?.department}`)
      if (appsRes.ok) {
        const appsData = await appsRes.json()
        console.log('✅ Applications fetched:', appsData.length)
        console.log('Application details:', appsData.map((app: any) => ({
          id: app._id,
          studentId: app.studentId?._id || app.studentId,
          studentName: app.studentId?.fullName || app.fullName
        })))
        setApplications(appsData)
      } else {
        console.error('❌ Failed to fetch applications:', appsRes.status)
      }
    } catch (error) {
      console.error('❌ Fetch error:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (application: ScholarshipApplication) => {
    setSelectedApplication(application)
    setReviewData({
      status: application.status,
      remarks: application.remarks || ''
    })
    setDialogOpen(true)
  }

  const handleUpdateStatus = async () => {
    if (!selectedApplication) return

    try {
      const res = await fetch(`/api/scholarships/${selectedApplication._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: reviewData.status,
          remarks: reviewData.remarks,
          reviewedBy: profile?._id
        })
      })

      if (!res.ok) throw new Error('Failed to update')

      toast.success('Status updated successfully')
      setDialogOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Filter logic
  const studentsWithApplication = applications.map(app => {
    // Handle both populated and unpopulated studentId
    const studentId = typeof app.studentId === 'object' ? app.studentId._id : app.studentId
    console.log('Student with app:', studentId)
    return studentId
  })
  
  console.log('All students:', allStudents.map(s => s._id))
  console.log('Students with applications:', studentsWithApplication)
  console.log('Filter status:', filterStatus)
  
  const filteredStudents = allStudents.filter(student => {
    const matchesSearch = student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.enrollmentNumber?.toLowerCase().includes(searchQuery.toLowerCase())

    if (filterStatus === 'filled') {
      return studentsWithApplication.includes(student._id) && matchesSearch
    }
    if (filterStatus === 'not-filled') {
      return !studentsWithApplication.includes(student._id) && matchesSearch
    }
    return matchesSearch
  })
  
  console.log('Filtered students:', filteredStudents.length)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'under_review':
        return 'bg-blue-100 text-blue-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStudentApplication = (studentId: string) => {
    return applications.find(app => app.studentId._id === studentId)
  }

  if (!profile) return null

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 rounded w-1/3"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Scholarship Applications</h1>
        <p className="text-muted-foreground">Review student scholarship applications</p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{allStudents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{applications.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Not Applied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{allStudents.length - applications.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or enrollment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="filled">Applied</SelectItem>
                  <SelectItem value="not-filled">Not Applied</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No students found</p>
            </CardContent>
          </Card>
        ) : (
          filteredStudents.map((student) => {
            const application = getStudentApplication(student._id)
            return (
              <Card key={student._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{student.fullName}</CardTitle>
                      <CardDescription>
                        {student.enrollmentNumber} • {student.email}
                      </CardDescription>
                    </div>
                    {application ? (
                      <Badge className={getStatusColor(application.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(application.status)}
                          {application.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Not Applied
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                {application && (
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        <p>{application.selectedScholarships.length} scholarship(s) selected</p>
                        <p className="text-xs">Applied on {new Date(application.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Button size="sm" onClick={() => handleViewDetails(application)}>
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Application Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scholarship Application Details</DialogTitle>
            <DialogDescription>
              Review and update application status
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-6">
              {/* Student Info */}
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Student Name</Label>
                  <p className="font-medium">{selectedApplication.studentId.fullName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Enrollment</Label>
                  <p className="font-medium">{selectedApplication.studentId.enrollmentNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedApplication.studentId.email}</p>
                </div>
              </div>

              {/* Application Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Full Name (As per Aadhaar)</Label>
                  <p className="font-medium">{selectedApplication.fullName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Aadhaar Number</Label>
                  <p className="font-medium">{selectedApplication.aadhaarNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Phone Number</Label>
                  <p className="font-medium">{selectedApplication.phoneNumber}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <p className="font-medium">{selectedApplication.address}</p>
                </div>
              </div>

              {/* Selected Scholarships */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Selected Scholarships ({selectedApplication.selectedScholarships.length})
                </Label>
                <div className="mt-2 max-h-[200px] overflow-y-auto border rounded-lg p-3 space-y-1">
                  {selectedApplication.selectedScholarships.map((sch, idx) => (
                    <div key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{sch}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div>
                <Label className="text-xs text-muted-foreground">Uploaded Documents</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedApplication.documents.sscMarksheet && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(selectedApplication.documents.sscMarksheet)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      SSC Marksheet
                    </Button>
                  )}
                  {selectedApplication.documents.diplomaSem1Marksheet && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(selectedApplication.documents.diplomaSem1Marksheet)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Diploma Sem 1
                    </Button>
                  )}
                  {selectedApplication.documents.diplomaSem2Marksheet && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(selectedApplication.documents.diplomaSem2Marksheet)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Diploma Sem 2
                    </Button>
                  )}
                </div>
              </div>

              {/* Review Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Update Status</Label>
                  <Select value={reviewData.status} onValueChange={(v) => setReviewData({ ...reviewData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Remarks (Optional)</Label>
                  <Textarea
                    value={reviewData.remarks}
                    onChange={(e) => setReviewData({ ...reviewData, remarks: e.target.value })}
                    placeholder="Add comments or feedback..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleUpdateStatus} className="w-full">
                  Update Application
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
