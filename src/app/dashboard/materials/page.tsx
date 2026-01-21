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
import { FileText, Plus, Trash2, Download, Upload, File, BookOpen } from 'lucide-react'
import { ensureArray } from '@/lib/fetchUtils'

interface StudyMaterial {
  _id: string
  title: string
  description?: string
  courseId: string
  courseName?: string
  facultyId: string
  fileUrl?: string
  fileName: string
  fileType?: string
  createdAt: string
  updatedAt: string
}

interface Course {
  _id: string
  name: string
  code: string
  facultyId: string
  departmentId: string
  createdAt: string
}

export default function MaterialsPage() {
  const { profile, user } = useAuth()
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: ''
  })

  const fetchMaterials = async () => {
    try {
      let url = '/api/materials'
      
      if (profile?.role === 'student' && profile?._id) {
        const token = localStorage.getItem('authToken')
        const coursesRes = await fetch(`/api/users/${profile.userId}/courses`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        })
        const studentCourses = ensureArray(await coursesRes.json())
        const courseIds = studentCourses.map((c: any) => c._id)
        
        // Fetch materials for all enrolled courses
        if (courseIds.length > 0) {
          const token = localStorage.getItem('authToken')
          const allMaterials = []
          
          for (const courseId of courseIds) {
            const res = await fetch(`/api/materials?courseId=${courseId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              }
            })
            if (res.ok) {
              const data = await res.json()
              allMaterials.push(...ensureArray(data))
            }
          }
          
          setMaterials(allMaterials)
          setLoading(false)
          return
        }
      }
      
      const token = localStorage.getItem('authToken')
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      })
      const data = await res.json()
      setMaterials(ensureArray(data))
    } catch (error: any) {
      console.error('Error fetching materials:', error)
      toast.error('Failed to load materials')
    }
    setLoading(false)
  }

  useEffect(() => {
    const fetchData = async () => {
      if (profile?.role === 'faculty' && profile?._id) {
        const token = localStorage.getItem('authToken')
        const res = await fetch(`/api/courses?facultyId=${profile._id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        })
        const coursesData = ensureArray(await res.json())
        setCourses(coursesData)
      }
      await fetchMaterials()
    }
    
    if (profile && user) fetchData()
  }, [profile, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!uploadFile || !user) {
      toast.error('Please select a file to upload')
      return
    }
    
    setUploading(true)
    
    try {
      // Create FormData to send file
      const uploadFormData = new FormData()
      uploadFormData.append('file', uploadFile)
      uploadFormData.append('title', formData.title)
      uploadFormData.append('description', formData.description || '')
      uploadFormData.append('courseId', formData.courseId)
      uploadFormData.append('facultyId', profile._id)

      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData // Don't set Content-Type header - browser will set it with boundary
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to upload material')
      }

      toast.success('Material uploaded successfully')
      setDialogOpen(false)
      setFormData({ title: '', description: '', courseId: '' })
      setUploadFile(null)
      await fetchMaterials()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return
    
    try {
      const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Material deleted successfully')
      await fetchMaterials()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const getFileIcon = (fileType: string | null | undefined) => {
    if (!fileType) return '📁'
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('video')) return '🎥'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊'
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️'
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
            <Card key={material._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{getFileIcon(material.fileType)}</span>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{material.title}</CardTitle>
                    <CardDescription>{material.courseName || material.courseId}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {material.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{material.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{material.fileName}</span>
                  <span>{format(new Date(material.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  {material.fileUrl && (
                    <a href={material.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button className="w-full" variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </a>
                  )}
                  {canManage && material.facultyId === profile._id && (
                    <Button size="icon" variant="destructive" onClick={() => handleDelete(material._id)} title="Delete material">
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

