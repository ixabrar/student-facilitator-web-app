'use client'

import { useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Settings, User, Mail, Phone, Building2, Save, Trash2, AlertCircle } from 'lucide-react'

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupData, setCleanupData] = useState<any>(null)
  const [formData, setFormData] = useState({
    full_name: profile?.fullName || '',
    phone: profile?.phone || '',
    department: profile?.departmentId || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch(`/api/profiles/${profile?._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.full_name,
          phone: formData.phone || '',
          department: formData.department || ''
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update profile')
      }

      toast.success('Profile updated successfully')
      await refreshProfile()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  const checkCleanup = async () => {
    setCleanupLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/admin/cleanup-enrollments', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error('Failed to check enrollments')
      
      const data = await res.json()
      setCleanupData(data)
      
      if (data.mismatches === 0) {
        toast.success('No mismatched enrollments found!')
      } else {
        toast.warning(`Found ${data.mismatches} mismatched enrollments`)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCleanupLoading(false)
    }
  }

  const runCleanup = async () => {
    if (!confirm('Are you sure you want to delete all mismatched enrollments? This cannot be undone.')) {
      return
    }

    setCleanupLoading(true)
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/admin/cleanup-enrollments', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error('Failed to cleanup enrollments')
      
      const result = await res.json()
      toast.success(`Deleted ${result.deletedCount} mismatched enrollments`)
      setCleanupData(null)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setCleanupLoading(false)
    }
  }

  if (!profile) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-2xl">
                {profile.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{profile.fullName}</h3>
              <p className="text-muted-foreground">{profile.email}</p>
              <Badge className="mt-2 capitalize">{profile.role}</Badge>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={profile.email}
                  className="pl-10 bg-slate-50"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="department"
                  value={profile.departmentName || profile.department || 'Not assigned'}
                  className="pl-10 bg-slate-50"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">Department is automatically assigned</p>
            </div>

            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Account Type</span>
            <span className="font-medium capitalize">{profile.role}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Account ID</span>
            <span className="font-mono text-sm">{(profile._id as string).substring(0, 8)}...</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Member Since</span>
            <span className="font-medium">
              {new Date(profile.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {profile.role === 'admin' && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertCircle className="h-5 w-5" />
              Admin: Cleanup Tools
            </CardTitle>
            <CardDescription>Clean up mismatched course enrollments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Remove student enrollments where the course department doesn&apos;t match the student&apos;s department.
            </p>

            <div className="flex gap-3">
              <Button 
                onClick={checkCleanup} 
                disabled={cleanupLoading}
                variant="outline"
                className="flex-1"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                {cleanupLoading ? 'Checking...' : 'Check Mismatches'}
              </Button>
              
              {cleanupData && cleanupData.mismatches > 0 && (
                <Button 
                  onClick={runCleanup} 
                  disabled={cleanupLoading}
                  variant="destructive"
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {cleanupData.mismatches} Mismatches
                </Button>
              )}
            </div>

            {cleanupData && (
              <div className="mt-4 p-4 bg-white rounded-lg border">
                <h4 className="font-semibold mb-2">Cleanup Report</h4>
                <p className="text-sm">Total enrollments: {cleanupData.totalEnrollments}</p>
                <p className="text-sm font-medium text-orange-600">
                  Mismatched enrollments: {cleanupData.mismatches}
                </p>
                
                {cleanupData.details && cleanupData.details.length > 0 && (
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                    {cleanupData.details.map((item: any, idx: number) => (
                      <div key={idx} className="text-xs p-2 bg-slate-50 rounded">
                        <span className="font-medium">{item.studentName}</span>
                        <span className="text-muted-foreground"> ({item.studentDepartment})</span>
                        <br />
                        enrolled in <span className="font-medium">{item.courseName}</span>
                        <span className="text-muted-foreground"> ({item.courseDepartment})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

