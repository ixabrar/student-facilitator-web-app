'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Building2, Plus, Trash2, Edit, Shield } from 'lucide-react'

interface Department {
  _id: string
  name: string
  description: string | null
  createdAt: string
}

export default function DepartmentsPage() {
  const { profile } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    description: ''
  })

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/departments')
      if (response.ok) {
        const data = await response.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.role === 'admin' || profile?.role === 'principal') {
      fetchDepartments()
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingDepartment) {
        const response = await fetch(`/api/departments/${editingDepartment._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            abbreviation: formData.abbreviation,
            description: formData.description || null
          })
        })
        
        if (response.ok) {
          toast.success('Department updated successfully')
          setEditingDepartment(null)
          setFormData({ name: '', abbreviation: '', description: '' })
          setDialogOpen(false)
          fetchDepartments()
        } else {
          toast.error('Failed to update department')
        }
      } else {
        const response = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            abbreviation: formData.abbreviation,
            description: formData.description || null
          })
        })
        
        if (response.ok) {
          toast.success('Department created successfully')
          setFormData({ name: '', abbreviation: '', description: '' })
          setDialogOpen(false)
          fetchDepartments()
        } else {
          toast.error('Failed to create department')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return
    
    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Department deleted successfully')
        fetchDepartments()
      } else {
        toast.error('Failed to delete department')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('An error occurred')
    }
  }

  const openEditDialog = (department: Department) => {
    setEditingDepartment(department)
    setFormData({
      name: department.name || '',
      abbreviation: (department as any).abbreviation || '',
      description: department.description || ''
    })
    setDialogOpen(true)
  }

  if (!profile || (profile.role !== 'admin' && profile.role !== 'principal')) {
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
          <p className="text-muted-foreground">{profile.role === 'principal' ? 'View all academic departments' : 'Manage academic departments'}</p>
        </div>
        {profile.role === 'admin' && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingDepartment(null)
              setFormData({ name: '', abbreviation: '', description: '' })
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
                <Label htmlFor="abbreviation">Abbreviation</Label>
                <Input
                  id="abbreviation"
                  value={formData.abbreviation}
                  onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })}
                  placeholder="CS"
                  maxLength={10}
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
        )}
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
            <Card key={department._id} className="hover:shadow-lg transition-shadow">
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
                {profile.role === 'admin' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(department)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(department._id)}>
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

