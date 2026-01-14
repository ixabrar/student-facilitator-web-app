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
import { Bell, Plus, Trash2, Edit, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import type { Notice, Profile } from '@/lib/supabase/types'

export default function NoticesPage() {
  const { profile } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general',
    priority: 'normal',
    is_global: true
  })
  const supabase = createClient()

  const fetchNotices = async () => {
    const { data } = await supabase
      .from('notices')
      .select('*, author:profiles(*)')
      .order('created_at', { ascending: false })
    
    if (data) setNotices(data as Notice[])
    setLoading(false)
  }

  useEffect(() => {
    fetchNotices()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const noticeData = {
      title: formData.title,
      content: formData.content,
      type: formData.type,
      priority: formData.priority,
      is_global: formData.is_global,
      author_id: profile?.id
    }

    if (editingNotice) {
      const { error } = await supabase
        .from('notices')
        .update(noticeData)
        .eq('id', editingNotice.id)
      
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Notice updated successfully')
    } else {
      const { error } = await supabase.from('notices').insert(noticeData)
      
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Notice posted successfully')
    }

    setDialogOpen(false)
    setEditingNotice(null)
    setFormData({ title: '', content: '', type: 'general', priority: 'normal', is_global: true })
    fetchNotices()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return
    
    const { error } = await supabase.from('notices').delete().eq('id', id)
    
    if (error) {
      toast.error(error.message)
      return
    }
    
    toast.success('Notice deleted successfully')
    fetchNotices()
  }

  const openEditDialog = (notice: Notice) => {
    setEditingNotice(notice)
    setFormData({
      title: notice.title,
      content: notice.content,
      type: notice.type,
      priority: notice.priority,
      is_global: notice.is_global
    })
    setDialogOpen(true)
  }

  const canManage = profile?.role === 'admin' || profile?.role === 'faculty'

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'normal':
        return <Info className="h-4 w-4 text-blue-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notices & Announcements</h1>
          <p className="text-muted-foreground">Stay updated with the latest announcements</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) {
              setEditingNotice(null)
              setFormData({ title: '', content: '', type: 'general', priority: 'normal', is_global: true })
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                <Plus className="h-4 w-4 mr-2" />
                Post Notice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingNotice ? 'Edit Notice' : 'Post New Notice'}</DialogTitle>
                <DialogDescription>Fill in the notice details below</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Notice title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Notice content..."
                    rows={4}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="exam">Exam</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  {editingNotice ? 'Update Notice' : 'Post Notice'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notices posted yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card key={notice.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getPriorityIcon(notice.priority)}
                    <div>
                      <CardTitle className="text-lg">{notice.title}</CardTitle>
                      <CardDescription>
                        Posted by {(notice.author as Profile)?.full_name || 'Unknown'} • {format(new Date(notice.created_at), 'MMM d, yyyy')}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={notice.priority === 'high' ? 'destructive' : notice.priority === 'normal' ? 'default' : 'secondary'}>
                      {notice.priority}
                    </Badge>
                    <Badge variant="outline">{notice.type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 whitespace-pre-wrap">{notice.content}</p>
                {canManage && notice.author_id === profile.id && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(notice)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(notice.id)}>
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
