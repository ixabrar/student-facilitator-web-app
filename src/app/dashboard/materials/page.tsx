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
import { FileText, Plus, Trash2, Download, Upload, File, BookOpen } from 'lucide-react'
import type { StudyMaterial, Course } from '@/lib/supabase/types'

export default function MaterialsPage() {
  const { profile } = useAuth()
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: ''
  })
  const supabase = createClient()

  const fetchMaterials = async () => {
    if (profile?.role === 'student') {
      const { data: enrollments } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', profile.id)
      
      const courseIds = enrollments?.map(e => e.course_id) || []
      
      if (courseIds.length > 0) {
        const { data } = await supabase
          .from('study_materials')
          .select('*, course:courses(*)')
          .in('course_id', courseIds)
          .order('created_at', { ascending: false })
        
        if (data) setMaterials(data as StudyMaterial[])
      }
    } else if (profile?.role === 'faculty') {
      const { data } = await supabase
        .from('study_materials')
        .select('*, course:courses(*)')
        .eq('faculty_id', profile.id)
        .order('created_at', { ascending: false })
      
      if (data) setMaterials(data as StudyMaterial[])
    } else {
      const { data } = await supabase
        .from('study_materials')
        .select('*, course:courses(*)')
        .order('created_at', { ascending: false })
      
      if (data) setMaterials(data as StudyMaterial[])
    }
    setLoading(false)
  }

  useEffect(() => {
    const fetchData = async () => {
      await fetchMaterials()
      
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
    
    if (!uploadFile || !profile) {
      toast.error('Please select a file to upload')
      return
    }
    
    setUploading(true)
    
    const fileExt = uploadFile.name.split('.').pop()
    const fileName = `materials/${profile.id}/${Date.now()}.${fileExt}`
    
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

    const { error } = await supabase.from('study_materials').insert({
      title: formData.title,
      description: formData.description || null,
      course_id: formData.course_id,
      faculty_id: profile.id,
      file_url: publicUrl,
      file_name: uploadFile.name,
      file_type: uploadFile.type
    })

    if (error) {
      toast.error(error.message)
      setUploading(false)
      return
    }

    toast.success('Material uploaded successfully')
    setDialogOpen(false)
    setFormData({ title: '', description: '', course_id: '' })
    setUploadFile(null)
    setUploading(false)
    fetchMaterials()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return
    
    const { error } = await supabase.from('study_materials').delete().eq('id', id)
    
    if (error) {
      toast.error(error.message)
      return
    }
    
    toast.success('Material deleted successfully')
    fetchMaterials()
  }

  const getFileIcon = (fileType: string | null) => {
    if (fileType?.includes('pdf')) return '📄'
    if (fileType?.includes('image')) return '🖼️'
    if (fileType?.includes('video')) return '🎥'
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝'
    if (fileType?.includes('sheet') || fileType?.includes('excel')) return '📊'
    if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return '📽️'
    return '📁'
  }

  const canManage = profile?.role === 'faculty'

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Study Materials</h1>
          <p className="text-muted-foreground">
            {profile.role === 'student' ? 'Download notes and study materials' : 'Upload and manage study materials'}
          </p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Plus className="h-4 w-4 mr-2" />
                Upload Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Study Material</DialogTitle>
                <DialogDescription>Share notes, PDFs, or other resources</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Material title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description..."
                    rows={2}
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
                <div className="space-y-2">
                  <Label>File</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="material-upload"
                    />
                    <label htmlFor="material-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {uploadFile ? uploadFile.name : 'Click to select file'}
                      </p>
                    </label>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload Material'}
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
      ) : materials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No study materials available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material) => (
            <Card key={material.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{getFileIcon(material.file_type)}</span>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{material.title}</CardTitle>
                    <CardDescription>{(material.course as Course)?.name}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {material.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{material.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{material.file_name}</span>
                  <span>{format(new Date(material.created_at), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <a href={material.file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button className="w-full" variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </a>
                  {canManage && material.faculty_id === profile.id && (
                    <Button size="icon" variant="destructive" onClick={() => handleDelete(material.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
