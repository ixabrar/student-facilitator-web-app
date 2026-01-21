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
import { BookOpen, Plus, Users, Trash2, Edit } from 'lucide-react'

interface Course {
  _id: string
  code: string
  name: string
  description?: string
  departmentId: string
  facultyId: string
  semester?: number
  credits: number
  createdAt: string
}

interface Department {
  _id: string
  name: string
  description?: string
}

interface Profile {
  _id: string
  fullName: string
  email: string
  role: string
}

interface Student extends Profile {
  fullName: string
  email: string
}

export default function CoursesPage() {
  const { profile, user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [faculty, setFaculty] = useState<Profile[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [searchStudentQuery, setSearchStudentQuery] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    departmentId: '',
    facultyId: '',
    semester: '',
    credits: '3'
  })

  const fetchCourses = async () => {
    try {
      let url = '/api/courses'
      
      // Use profile.userId instead of user.id for consistency
      if (profile?.role === 'student' && profile.userId) {
        const res = await fetch(`/api/users/${profile.userId}/courses`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        const studentCourses = await res.json()
        setCourses(studentCourses || [])
      } else if (profile?.role === 'faculty' && profile._id) {
        url += `?facultyId=${profile._id}`
        const res = await fetch(url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        const data = await res.json()
        setCourses(data || [])
      } else if (profile?.role === 'hod' && profile.department) {
        // HOD sees courses from their department
        url += `?departmentId=${profile.department}`
        const res = await fetch(url)
        const data = await res.json()
        setCourses(data || [])
      } else {
        const res = await fetch(url)
        const data = await res.json()
        setCourses(data || [])
      }
    } catch (error: any) {
      toast.error('Failed to load courses')
    }
    setLoading(false)
  }

  useEffect(() => {
    const fetchData = async () => {
      await fetchCourses()
      
      try {
        const token = localStorage.getItem('authToken')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        
        const deptRes = await fetch('/api/departments')
        const deptData = await deptRes.json()
        setDepartments(deptData || [])
        
        const facultyRes = await fetch('/api/profiles?role=faculty', { headers })
        const facultyData = await facultyRes.json()
        setFaculty(Array.isArray(facultyData) ? facultyData : [])

        // Fetch all students for faculty to enroll
        const studentRes = await fetch('/api/profiles?role=student', { headers })
        const studentData = await studentRes.json()
        setStudents(Array.isArray(studentData) ? studentData : [])
      } catch (error: any) {
        console.error('Failed to load data', error)
        toast.error('Failed to load course data')
      }
    }
    
    if (profile) fetchData()
  }, [profile, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const courseData = {
      code: formData.code,
      name: formData.name,
      description: formData.description || '',
      departmentId: formData.departmentId,
      facultyId: formData.facultyId,
      semester: formData.semester ? parseInt(formData.semester) : undefined,
      credits: parseInt(formData.credits)
    }

    try {
      let method = 'POST'
      let url = '/api/courses'
      
      if (editingCourse) {
        method = 'PUT'
        url = `/api/courses/${editingCourse._id}`
      }

      const token = localStorage.getItem('authToken')
      const headers: any = { 'Content-Type': 'application/json' }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(courseData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save course')
      }

      toast.success(editingCourse ? 'Course updated' : 'Course created')
      setDialogOpen(false)
      setEditingCourse(null)
      setFormData({ code: '', name: '', description: '', departmentId: '', facultyId: '', semester: '', credits: '3' })
      await fetchCourses()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return
    
    try {
      const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Course deleted')
      await fetchCourses()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const openEditDialog = (course: Course) => {
    setEditingCourse(course)
    setFormData({
      code: course.code,
      name: course.name,
      description: course.description || '',
      departmentId: course.departmentId,
      facultyId: course.facultyId,
      semester: course.semester?.toString() || '',
      credits: course.credits.toString()
    })
    setDialogOpen(true)
  }

  const handleEnrollStudent = async (studentId: string) => {
    if (!selectedCourse) return

    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          courseId: selectedCourse._id,
          facultyId: profile._id
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to enroll student')
      }

      toast.success('Student enrolled successfully')
      setSelectedStudentId('')
      setSearchStudentQuery('')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const openEnrollmentDialog = (course: Course) => {
    setSelectedCourse(course)
    setEnrollmentDialogOpen(true)
  }

  const filteredStudents = students.filter(s =>
    s.fullName.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchStudentQuery.toLowerCase())
  )

  const canManage = profile?.role === 'admin' || profile?.role === 'faculty' || profile?.role === 'hod'

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {profile.role === 'student' ? 'My Courses' : profile.role === 'faculty' ? 'Teaching Courses' : profile.role === 'hod' ? 'Department Courses' : 'All Courses'}
          </h1>
          <p className="text-muted-foreground">
            {profile.role === 'student' ? 'Courses you are enrolled in' : profile.role === 'faculty' ? 'Courses assigned to you' : profile.role === 'hod' ? 'Manage courses in your department' : 'Manage all courses'}
          </p>
        </div>
        {(profile.role === 'admin' || profile.role === 'hod') && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingCourse(null)
              setFormData({ code: '', name: '', description: '', departmentId: '', facultyId: '', semester: '', credits: '3' })
            } else if (profile.role === 'hod' && !editingCourse) {
              // Pre-fill department for HOD when creating new course
              setFormData(prev => ({ ...prev, departmentId: profile.department || '' }))
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCourse 
                    ? (profile.role === 'hod' ? 'Manage Course & Faculty Assignment' : 'Edit Course')
                    : 'Add New Course'
                  }
                </DialogTitle>
                <DialogDescription>
                  {profile.role === 'hod' 
                    ? 'Assign or reassign faculty to this course'
                    : 'Fill in the course details below'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Course Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="CS101"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="credits">Credits</Label>
                    <Input
                      id="credits"
                      type="number"
                      value={formData.credits}
                      onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Course Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Introduction to Computer Science"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Course description..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select 
                      value={formData.departmentId} 
                      onValueChange={(v) => setFormData({ ...formData, departmentId: v })}
                      disabled={profile.role === 'hod'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept._id} value={dept._id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Select value={formData.semester} onValueChange={(v) => setFormData({ ...formData, semester: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                          <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Faculty Assignment
                    {profile.role === 'hod' && <Badge variant="secondary" className="text-xs">Required</Badge>}
                  </Label>
                  <Select 
                    value={formData.facultyId} 
                    onValueChange={(v) => setFormData({ ...formData, facultyId: v })}
                  >
                    <SelectTrigger className={formData.facultyId ? 'border-green-500' : ''}>
                      <SelectValue placeholder="Select faculty member" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculty.map((f) => (
                        <SelectItem key={f._id} value={f._id}>
                          {f.fullName} - {f.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {profile.role === 'hod' ? 'Assign this course to a faculty member in your department' : 'Select the instructor for this course'}
                  </p>
                </div>
                <Button type="submit" className="w-full">
                  {editingCourse ? (profile.role === 'hod' ? 'Update Assignment' : 'Update Course') : 'Create Course'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No courses found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{course.name}</CardTitle>
                    <CardDescription>{course.code}</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {course.credits} Cr
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                )}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Dept: {course.departmentId.substring(0, 8)}...</p>
                  {course.semester && <p>Semester {course.semester}</p>}
                  {course.facultyId && (
                    <p className="font-medium text-blue-600">
                      Assigned to: {faculty.find(f => f._id === course.facultyId)?.fullName || 'Unknown'}
                    </p>
                  )}
                  {!course.facultyId && (
                    <p className="font-medium text-orange-600">Not assigned</p>
                  )}
                </div>
                {/* Admin and HOD can edit/delete courses */}
                {(profile.role === 'admin' || profile.role === 'hod') && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(course)} className="flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      {profile.role === 'hod' ? 'Assign Faculty' : 'Edit'}
                    </Button>
                    {profile.role === 'admin' && (
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(course._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
                {profile.role === 'faculty' && course.facultyId === profile._id && (
                  <Dialog open={enrollmentDialogOpen && selectedCourse?._id === course._id} onOpenChange={(open) => {
                    setEnrollmentDialogOpen(open)
                    if (!open) {
                      setSelectedCourse(null)
                      setSearchStudentQuery('')
                      setSelectedStudentId('')
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="default" onClick={() => openEnrollmentDialog(course)}>
                        <Users className="h-4 w-4 mr-1" />
                        Manage Students
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Enroll Students - {course.name}</DialogTitle>
                        <DialogDescription>Search and add students to this course</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="search">Search Student</Label>
                          <Input
                            id="search"
                            placeholder="Search by name or email..."
                            value={searchStudentQuery}
                            onChange={(e) => setSearchStudentQuery(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Select Student</Label>
                          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a student" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredStudents.map((student) => (
                                <SelectItem key={student._id} value={student._id}>
                                  {student.fullName} ({student.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button 
                          onClick={() => selectedStudentId && handleEnrollStudent(selectedStudentId)}
                          disabled={!selectedStudentId}
                          className="w-full"
                        >
                          Enroll Student
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

