'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { FileText, Plus, Download, Trash2 } from 'lucide-react'

interface LeavingCertificate {
  _id: string
  studentId: string
  studentName: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'issued'
  requestedAt: string
  approvedAt?: string
  rejectionReason?: string
  certificateUrl?: string
}

export default function LeavingCertificatePage() {
  const { profile, user } = useAuth()
  const [certificates, setCertificates] = useState<LeavingCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reason, setReason] = useState('')

  const fetchCertificates = async () => {
    if (!profile?._id) return
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`/api/leaving-certificates?studentId=${profile._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setCertificates(data || [])
    } catch (error) {
      toast.error('Failed to load certificates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile?._id) {
      fetchCertificates()
    }
  }, [profile?._id])

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      toast.error('Please enter reason')
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/leaving-certificates', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: profile?._id,
          reason
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to submit request')
      }

      toast.success('Leaving certificate request submitted!')
      setReason('')
      setDialogOpen(false)
      fetchCertificates()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this request?')) return

    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`/api/leaving-certificates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to cancel')
      toast.success('Request cancelled')
      fetchCertificates()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'issued':
        return 'bg-green-100 text-green-800'
      case 'approved':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leaving Certificate (LC)</h1>
          <p className="text-muted-foreground">Request and manage your leaving certificate</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Leaving Certificate</DialogTitle>
              <DialogDescription>Provide reason for requesting leaving certificate</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Leaving *</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Shifting to another institution, Job relocation, Personal reasons..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Submit Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No leaving certificate requests yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <Card key={cert._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">Leaving Certificate Request</CardTitle>
                    <CardDescription>
                      Reason: {cert.reason}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(cert.status)}>
                    {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Requested On</p>
                    <p className="font-medium">{format(new Date(cert.requestedAt), 'MMM d, yyyy')}</p>
                  </div>
                  {cert.approvedAt && (
                    <div>
                      <p className="text-muted-foreground">Approved On</p>
                      <p className="font-medium">{format(new Date(cert.approvedAt), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
                {cert.rejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm font-medium text-red-900">Rejection Reason:</p>
                    <p className="text-sm text-red-800">{cert.rejectionReason}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  {cert.status === 'issued' && cert.certificateUrl && (
                    <Button size="sm" variant="outline" onClick={() => window.open(cert.certificateUrl)}>
                      <Download className="h-4 w-4 mr-1" />
                      Download Certificate
                    </Button>
                  )}
                  {cert.status === 'pending' && (
                    <Button size="sm" variant="destructive" onClick={() => handleCancel(cert._id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Cancel Request
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
