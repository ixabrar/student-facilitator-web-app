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
import { BookOpen, Plus, Users, Trash2, Edit } from 'lucide-react'
import type { Course, Department, Profile } from '@/lib/supabase/types'

export default function CoursesPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [faculty, setFaculty] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    department_id: '',
    faculty_id: '',
    semester: '',
    credits: '3'
  })
  const supabase = createClient()

  const fetchCourses = async () => {
    let query = supabase.from('courses').select('*, faculty:profiles(*), department:departments(*)')
    
    if (profile?.role === 'student') {
      const { data: enrollments } = await supabase
        .from('student_courses')
        .select('course:courses(*, faculty:profiles(*), department:departments(*))')
        .eq('student_id', profile.id)
      
      if (enrollments) {
        setCourses(enrollments.map(e => e.course as unknown as Course).filter(Boolean))
      }
    } else if (profile?.role === 'faculty') {
      const { data } = await query.eq('faculty_id', profile.id).order('name')
      if (data) setCourses(data as Course[])
    } else {
      const { data } = await query.order('name')
      if (data) setCourses(data as Course[])
    }
    setLoading(false)
  }

  useEffect(() => {
    const fetchData = async () => {
      await fetchCourses()
      
      const { data: deptData } = await supabase.from('departments').select('*').order('name')
      if (deptData) setDepartments(deptData)
      
      const { data: facultyData } = await supabase.from('profiles').select('*').eq('role', 'faculty').order('full_name')
      if (facultyData) setFaculty(facultyData)
    }
    
    if (profile) fetchData()
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const courseData = {
      code: formData.code,
      name: formData.name,
      description: formData.description || null,
      department_id: formData.department_id || null,
      faculty_id: formData.faculty_id || null,
      semester: formData.semester ? parseInt(formData.semester) : null,
      credits: parseInt(formData.credits)
    }

    if (editingCourse) {
      const { error } = await supabase
        .from('courses')
        .update(courseData)
        .eq('id', editingCourse.id)
      
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Course updated successfully')
    } else {
      const { error } = await supabase.from('courses').insert(courseData)
      
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Course created successfully')
    }

    setDialogOpen(false)
    setEditingCourse(null)
    setFormData({ code: '', name: '', description: '', department_id: '', faculty_id: '', semester: '', credits: '3' })
    fetchCourses()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return
    
    const { error } = await supabase.from('courses').delete().eq('id', id)
    
    if (error) {
      toast.error(error.message)
      return
    }
    
    toast.success('Course deleted successfully')
    fetchCourses()
  }

  const openEditDialog = (course: Course) => {
    setEditingCourse(course)
    setFormData({
      code: course.code,
      name: course.name,
      description: course.description || '',
      department_id: course.department_id || '',
      faculty_id: course.faculty_id || '',
      semester: course.semester?.toString() || '',
      credits: course.credits.toString()
    })
    setDialogOpen(true)
  }

  const canManage = profile?.role === 'admin' || profile?.role === 'faculty'

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {profile.role === 'student' ? 'My Courses' : profile.role === 'faculty' ? 'Teaching Courses' : 'All Courses'}
          </h1>
          <p className="text-muted-foreground">
            {profile.role === 'student' ? 'Courses you are enrolled in' : profile.role === 'faculty' ? 'Courses assigned to you' : 'Manage all courses'}
          </p>
        </div>
        {profile.role === 'admin' && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingCourse(null)
              setFormData({ code: '', name: '', description: '', department_id: '', faculty_id: '', semester: '', credits: '3' })
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
                <DialogTitle>{editingCourse ? 'Edit Course' : 'Add New Course'}</DialogTitle>
                <DialogDescription>Fill in the course details below</DialogDescription>
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
                    <Select value={formData.department_id} onValueChange={(v) => setFormData({ ...formData, department_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
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
                  <Label>Faculty</Label>
                  <Select value={formData.faculty_id} onValueChange={(v) => setFormData({ ...formData, faculty_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculty.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  {editingCourse ? 'Update Course' : 'Create Course'}
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
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{course.name}</CardTitle>
                    <CardDescription>{course.code}</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {course.credits} Credits
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{(course.faculty as Profile)?.full_name || 'No instructor'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">
                    {(course.department as Department)?.name || 'No department'}
                  </Badge>
                  {course.semester && (
                    <span className="text-xs text-muted-foreground">Semester {course.semester}</span>
                  )}
                </div>
                {profile.role === 'admin' && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(course)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(course.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
