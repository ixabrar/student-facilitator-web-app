'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ClipboardList, Plus, Trash2, Edit, Upload, Download, FileText, Clock, CheckCircle } from 'lucide-react'
import { ensureArray } from '@/lib/fetchUtils'

interface Course {
  _id: string
  name: string
  code: string
  facultyId: string
}

interface Assignment {
  _id: string
  title: string
  description?: string
  courseId: string
  course?: Course
  facultyId: string
  dueDate: string
  maxScore: number
  createdAt: string
  updatedAt: string
}

interface AssignmentSubmission {
  _id: string
  assignmentId: string
  studentId: string
  fileUrl: string
  fileName: string
  submittedAt: string
}

export default function AssignmentsPage() {
  const { profile } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [submissions, setSubmissions] = useState<Record<string, AssignmentSubmission>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    dueDate: '',
    maxScore: '100'
  })

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      if (profile?.role === 'student') {
        // Get student's enrolled courses
        const coursesRes = await fetch(`/api/users/${profile.userId}/courses`, { headers })
        if (!coursesRes.ok) {
          console.error('Failed to fetch student courses:', await coursesRes.text())
          throw new Error('Failed to fetch student courses')
        }
        const courseData = ensureArray(await coursesRes.json())
        const courseIds = courseData.map((c: any) => c._id)

        if (courseIds.length > 0) {
          // Get assignments for these courses
          const assignmentsRes = await fetch(`/api/assignments?courseIds=${courseIds.join(',')}`, { headers })
          if (!assignmentsRes.ok) {
            console.error('Failed to fetch assignments:', await assignmentsRes.text())
            throw new Error('Failed to fetch assignments')
          }
          const assignmentData = ensureArray(await assignmentsRes.json())
          setAssignments(assignmentData.sort((a: Assignment, b: Assignment) => 
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          ))

          // Get student's submissions
          const submissionsRes = await fetch(`/api/submissions?studentId=${profile._id}`, { headers })
          if (!submissionsRes.ok) {
            console.error('Failed to fetch submissions:', await submissionsRes.text())
            throw new Error('Failed to fetch submissions')
          }
          const submissionsData = ensureArray(await submissionsRes.json())
          const subsMap: Record<string, AssignmentSubmission> = {}
          submissionsData.forEach((s: AssignmentSubmission) => {
            subsMap[s.assignmentId] = s
          })
          setSubmissions(subsMap)
        } else {
          // No enrolled courses
          setAssignments([])
        }
      } else if (profile?.role === 'faculty') {
        // Get faculty's courses
        const coursesRes = await fetch(`/api/courses?facultyId=${profile._id}`, { headers })
        if (!coursesRes.ok) {
          console.error('Failed to fetch faculty courses:', await coursesRes.text())
          throw new Error('Failed to fetch faculty courses')
        }
        const courseData = ensureArray(await coursesRes.json())
        const courseIds = courseData.map((c: any) => c._id)

        if (courseIds.length > 0) {
          // Get assignments for these courses
          const assignmentsRes = await fetch(`/api/assignments?courseIds=${courseIds.join(',')}`, { headers })
          if (!assignmentsRes.ok) {
            console.error('Failed to fetch assignments:', await assignmentsRes.text())
            throw new Error('Failed to fetch assignments')
          }
          const assignmentData = ensureArray(await assignmentsRes.json())
          setAssignments(assignmentData.sort((a: Assignment, b: Assignment) => 
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          ))
        } else {
          // No courses assigned yet, show empty list
          setAssignments([])
        }
      } else {
        // Admin - get all assignments
        const assignmentsRes = await fetch('/api/assignments', { headers })
        if (!assignmentsRes.ok) throw new Error('Failed to fetch assignments')
        const assignmentData = ensureArray(await assignmentsRes.json())
        setAssignments(assignmentData.sort((a: Assignment, b: Assignment) => 
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        ))
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
      toast.error('Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      await fetchAssignments()
      
      if (profile?.role === 'faculty') {
        try {
          const token = localStorage.getItem('authToken')
          const headers = token ? { Authorization: `Bearer ${token}` } : {}
          const res = await fetch(`/api/courses?facultyId=${profile._id}`, { headers })
          if (res.ok) {
            const data = await res.json()
            setCourses(data)
          }
        } catch (error) {
          console.error('Error fetching courses:', error)
        }
      }
    }
    
    if (profile) fetchData()
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const assignmentData = {
      title: formData.title,
      description: formData.description || null,
      courseId: formData.courseId,
      facultyId: profile?._id,
      dueDate: formData.dueDate,
      maxScore: parseInt(formData.maxScore)
    }

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData)
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.message || 'Failed to create assignment')
        return
      }
      
      toast.success('Assignment created successfully')
      setDialogOpen(false)
      setFormData({ title: '', description: '', courseId: '', dueDate: '', maxScore: '100' })
      fetchAssignments()
    } catch (error) {
      console.error('Error creating assignment:', error)
      toast.error('Failed to create assignment')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return
    
    try {
      const res = await fetch(`/api/assignments/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.message || 'Failed to delete assignment')
        return
      }
      
      toast.success('Assignment deleted successfully')
      fetchAssignments()
    } catch (error) {
      console.error('Error deleting assignment:', error)
      toast.error('Failed to delete assignment')
    }
  }

  const handleFileSubmit = async () => {
    if (!uploadFile || !selectedAssignment || !profile) return
    
    setUploading(true)
    
    try {
      // In a real implementation, upload to cloud storage
      // For now, we'll create a data URL to simulate file upload
      const reader = new FileReader()
      reader.onload = async () => {
        const fileUrl = reader.result as string
        
        const submissionData = {
          assignmentId: selectedAssignment._id,
          studentId: profile._id,
          fileUrl: fileUrl,
          fileName: uploadFile.name
        }

        try {
          const res = await fetch('/api/submissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData)
          })

          if (!res.ok) {
            const error = await res.json()
            toast.error(error.message || 'Failed to submit assignment')
            setUploading(false)
            return
          }

          toast.success('Assignment submitted successfully')
          setSubmitDialogOpen(false)
          setSelectedAssignment(null)
          setUploadFile(null)
          setUploading(false)
          fetchAssignments()
        } catch (error) {
          console.error('Error submitting assignment:', error)
          toast.error('Failed to submit assignment')
          setUploading(false)
        }
      }
      reader.readAsDataURL(uploadFile)
    } catch (error) {
      console.error('Error processing file:', error)
      toast.error('Failed to process file')
      setUploading(false)
    }
  }

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date()
  const canManage = profile?.role === 'faculty'

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
          <p className="text-muted-foreground">
            {profile.role === 'student' ? 'View and submit your assignments' : 'Manage course assignments'}
          </p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
                <DialogDescription>Fill in the assignment details</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Assignment title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Assignment description..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select value={formData.courseId} onValueChange={(v) => setFormData({ ...formData, courseId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course._id} value={course._id}>{course.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxScore">Max Score</Label>
                    <Input
                      id="maxScore"
                      type="number"
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">Create Assignment</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>{selectedAssignment?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {uploadFile ? uploadFile.name : 'Click to upload your file'}
                </p>
              </label>
            </div>
            <Button onClick={handleFileSubmit} className="w-full" disabled={!uploadFile || uploading}>
              {uploading ? 'Uploading...' : 'Submit Assignment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No assignments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {assignments.map((assignment) => {
            const submission = submissions[assignment._id]
            const overdue = isOverdue(assignment.dueDate)
            
            return (
              <Card key={assignment._id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <CardDescription>{assignment.course?.name}</CardDescription>
                    </div>
                    {profile.role === 'student' && (
                      submission ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Submitted
                        </Badge>
                      ) : overdue ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assignment.description && (
                    <p className="text-sm text-muted-foreground">{assignment.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Due: {format(new Date(assignment.dueDate), 'MMM d, yyyy h:mm a')}
                    </div>
                    <span className="text-muted-foreground">Max: {assignment.maxScore} pts</span>
                  </div>
                  
                  {profile.role === 'student' && !submission && !overdue && (
                    <Button 
                      className="w-full mt-2" 
                      onClick={() => {
                        setSelectedAssignment(assignment)
                        setSubmitDialogOpen(true)
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Submit Assignment
                    </Button>
                  )}
                  
                  {profile.role === 'student' && submission && (
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                      <span className="text-sm">Your submission</span>
                      <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </a>
                    </div>
                  )}
                  
                  {canManage && (
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(assignment._id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

