'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Building2, Plus, Trash2, Edit, Shield } from 'lucide-react'
import type { Department } from '@/lib/supabase/types'

export default function DepartmentsPage() {
  const { profile } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const supabase = createClient()

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*').order('name')
    if (data) setDepartments(data)
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchDepartments()
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingDepartment) {
      const { error } = await supabase
        .from('departments')
        .update({
          name: formData.name,
          description: formData.description || null
        })
        .eq('id', editingDepartment.id)
      
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Department updated successfully')
    } else {
      const { error } = await supabase.from('departments').insert({
        name: formData.name,
        description: formData.description || null
      })
      
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Department created successfully')
    }

    setDialogOpen(false)
    setEditingDepartment(null)
    setFormData({ name: '', description: '' })
    fetchDepartments()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return
    
    const { error } = await supabase.from('departments').delete().eq('id', id)
    
    if (error) {
      toast.error(error.message)
      return
    }
    
    toast.success('Department deleted successfully')
    fetchDepartments()
  }

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department)
    setFormData({
      name: department.name,
      description: department.description || ''
    })
    setDialogOpen(true)
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">You don&apos;t have permission to access this page</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-muted-foreground">Manage academic departments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingDepartment(null)
            setFormData({ name: '', description: '' })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingDepartment ? 'Edit Department' : 'Add Department'}</DialogTitle>
              <DialogDescription>Fill in the department details</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Computer Science"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Department description..."
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingDepartment ? 'Update Department' : 'Create Department'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-20 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No departments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((department) => (
            <Card key={department.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <CardTitle className="text-lg">{department.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {department.description && (
                  <p className="text-sm text-muted-foreground">{department.description}</p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(department)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(department.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
