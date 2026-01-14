'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
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
import type { Assignment, Course, AssignmentSubmission } from '@/lib/supabase/types'

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
    course_id: '',
    due_date: '',
    max_score: '100'
  })
  const supabase = createClient()

  const fetchAssignments = async () => {
    if (profile?.role === 'student') {
      const { data: enrollments } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', profile.id)
      
      const courseIds = enrollments?.map(e => e.course_id) || []
      
      if (courseIds.length > 0) {
        const { data } = await supabase
          .from('assignments')
          .select('*, course:courses(*)')
          .in('course_id', courseIds)
          .order('due_date', { ascending: true })
        
        if (data) setAssignments(data as Assignment[])

        const { data: subs } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('student_id', profile.id)
        
        if (subs) {
          const subsMap: Record<string, AssignmentSubmission> = {}
          subs.forEach((s) => { subsMap[s.assignment_id] = s })
          setSubmissions(subsMap)
        }
      }
    } else if (profile?.role === 'faculty') {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id')
        .eq('faculty_id', profile.id)
      
      const courseIds = coursesData?.map(c => c.id) || []
      
      if (courseIds.length > 0) {
        const { data } = await supabase
          .from('assignments')
          .select('*, course:courses(*)')
          .in('course_id', courseIds)
          .order('due_date', { ascending: true })
        
        if (data) setAssignments(data as Assignment[])
      }
    } else {
      const { data } = await supabase
        .from('assignments')
        .select('*, course:courses(*)')
        .order('due_date', { ascending: true })
      
      if (data) setAssignments(data as Assignment[])
    }
    setLoading(false)
  }

  useEffect(() => {
    const fetchData = async () => {
      await fetchAssignments()
      
      if (profile?.role === 'faculty') {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('faculty_id', profile.id)
          .order('name')
        if (coursesData) setCourses(coursesData)
      }
    }
    
    if (profile) fetchData()
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const assignmentData = {
      title: formData.title,
      description: formData.description || null,
      course_id: formData.course_id,
      faculty_id: profile?.id,
      due_date: formData.due_date,
      max_score: parseInt(formData.max_score)
    }

    const { error } = await supabase.from('assignments').insert(assignmentData)
    
    if (error) {
      toast.error(error.message)
      return
    }
    
    toast.success('Assignment created successfully')
    setDialogOpen(false)
    setFormData({ title: '', description: '', course_id: '', due_date: '', max_score: '100' })
    fetchAssignments()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return
    
    const { error } = await supabase.from('assignments').delete().eq('id', id)
    
    if (error) {
      toast.error(error.message)
      return
    }
    
    toast.success('Assignment deleted successfully')
    fetchAssignments()
  }

  const handleFileSubmit = async () => {
    if (!uploadFile || !selectedAssignment || !profile) return
    
    setUploading(true)
    
    const fileExt = uploadFile.name.split('.').pop()
    const fileName = `${profile.id}/${selectedAssignment.id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(fileName, uploadFile)
    
    if (uploadError) {
      toast.error(uploadError.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName)

    const { error } = await supabase.from('assignment_submissions').upsert({
      assignment_id: selectedAssignment.id,
      student_id: profile.id,
      file_url: publicUrl,
      file_name: uploadFile.name
    }, { onConflict: 'assignment_id,student_id' })

    if (error) {
      toast.error(error.message)
      setUploading(false)
      return
    }

    toast.success('Assignment submitted successfully')
    setSubmitDialogOpen(false)
    setSelectedAssignment(null)
    setUploadFile(null)
    setUploading(false)
    fetchAssignments()
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
                  <Select value={formData.course_id} onValueChange={(v) => setFormData({ ...formData, course_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_score">Max Score</Label>
                    <Input
                      id="max_score"
                      type="number"
                      value={formData.max_score}
                      onChange={(e) => setFormData({ ...formData, max_score: e.target.value })}
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
            const submission = submissions[assignment.id]
            const overdue = isOverdue(assignment.due_date)
            
            return (
              <Card key={assignment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{assignment.title}</CardTitle>
                      <CardDescription>{(assignment.course as Course)?.name}</CardDescription>
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
                      Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                    </div>
                    <span className="text-muted-foreground">Max: {assignment.max_score} pts</span>
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
                      <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </a>
                    </div>
                  )}
                  
                  {canManage && (
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(assignment.id)}>
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
