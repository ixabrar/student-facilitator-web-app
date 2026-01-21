'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { FileText, Download } from 'lucide-react'

interface BonafideCertificate {
  _id: string
  studentId: string
  studentName: string
  studentEmail: string
  purpose: string
  status: 'pending' | 'approved' | 'rejected' | 'issued'
  requestedAt: string
  approvedAt?: string
  rejectionReason?: string
  certificateUrl?: string
}

export default function AdminBonafideManagementPage() {
  const { profile } = useAuth()
  const [certificates, setCertificates] = useState<BonafideCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCert, setSelectedCert] = useState<BonafideCertificate | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [reason, setReason] = useState('')
  const [certificateUrl, setCertificateUrl] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchCertificates = async () => {
    try {
      const url = statusFilter === 'all' ? '/api/bonafide-certificates' : `/api/bonafide-certificates?status=${statusFilter}`
      const res = await fetch(url)
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
    if (profile?.role === 'admin') {
      fetchCertificates()
    }
  }, [profile?.role, statusFilter])

  const handleAction = async () => {
    if (!selectedCert || !action) return

    try {
      const body: any = { status: action }

      if (action === 'approve') {
        body.approvedBy = profile?.id
      } else if (action === 'reject') {
        if (!reason.trim()) {
          toast.error('Please provide rejection reason')
          return
        }
        body.rejectionReason = reason
      }

      const res = await fetch(`/api/bonafide-certificates/${selectedCert._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) throw new Error('Failed to update')

      toast.success(`Certificate ${action}ed successfully`)
      setActionDialogOpen(false)
      setAction(null)
      setReason('')
      setCertificateUrl('')
      setSelectedCert(null)
      fetchCertificates()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleIssue = async (cert: BonafideCertificate) => {
    if (!certificateUrl.trim()) {
      toast.error('Please provide certificate URL or upload link')
      return
    }

    try {
      const res = await fetch(`/api/bonafide-certificates/${cert._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'issued',
          certificateUrl
        })
      })

      if (!res.ok) throw new Error('Failed to issue')
      toast.success('Certificate issued successfully')
      setCertificateUrl('')
      setSelectedCert(null)
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

  const stats = {
    pending: certificates.filter((c) => c.status === 'pending').length,
    approved: certificates.filter((c) => c.status === 'approved').length,
    issued: certificates.filter((c) => c.status === 'issued').length,
    rejected: certificates.filter((c) => c.status === 'rejected').length
  }

  if (profile?.role !== 'admin') {
    return <p className="text-red-600">Only admins can access this page</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bonafide Certificate Requests</h1>
        <p className="text-muted-foreground">Review and process student bonafide certificate requests</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Approved', value: stats.approved, color: 'text-blue-600' },
          { label: 'Issued', value: stats.issued, color: 'text-green-600' },
          { label: 'Rejected', value: stats.rejected, color: 'text-red-600' }
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {loading ? (
        <div>Loading...</div>
      ) : certificates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {certificates.map((cert) => (
            <Card key={cert._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{cert.studentName}</CardTitle>
                    <CardDescription>
                      Email: {cert.studentEmail} | Purpose: {cert.purpose}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(cert.status)}>
                    {cert.status.charAt(0).toUpperCase() + cert.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Requested</p>
                    <p className="font-medium">{format(new Date(cert.requestedAt), 'MMM d, yyyy')}</p>
                  </div>
                  {cert.approvedAt && (
                    <div>
                      <p className="text-muted-foreground">Approved</p>
                      <p className="font-medium">{format(new Date(cert.approvedAt), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>

                {cert.status === 'pending' && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        setSelectedCert(cert)
                        setAction('approve')
                        setActionDialogOpen(true)
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedCert(cert)
                        setAction('reject')
                        setActionDialogOpen(true)
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {cert.status === 'approved' && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor={`cert-url-${cert._id}`}>Certificate URL or File Link</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`cert-url-${cert._id}`}
                        placeholder="https://..."
                        value={certificateUrl}
                        onChange={(e) => setCertificateUrl(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleIssue(cert)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Issue
                      </Button>
                    </div>
                  </div>
                )}

                {cert.status === 'issued' && cert.certificateUrl && (
                  <Button size="sm" variant="outline" onClick={() => window.open(cert.certificateUrl)}>
                    <Download className="h-4 w-4 mr-1" />
                    View Certificate
                  </Button>
                )}

                {cert.rejectionReason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm font-medium text-red-900">Rejection Reason:</p>
                    <p className="text-sm text-red-800">{cert.rejectionReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
          </DialogHeader>
          {action === 'reject' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Explain why you're rejecting..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
