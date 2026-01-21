'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CheckCircle, XCircle, FileText, Shield } from 'lucide-react'

interface LeavingCertificate {
  _id: string
  studentId: string
  studentName: string
  studentEmail: string
  department: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'issued'
  requestedAt: string
  approvedAt?: string
  approvedBy?: string
  rejectionReason?: string
  certificateUrl?: string
}

export default function FacultyLeavingCertificateRequestsPage() {
  const { profile } = useAuth()
  const [certificates, setCertificates] = useState<LeavingCertificate[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [selectedCert, setSelectedCert] = useState<LeavingCertificate | null>(null)
  const [actionDialog, setActionDialog] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'issue'>('approve')
  const [rejectionReason, setRejectionReason] = useState('')
  const [certificateUrl, setCertificateUrl] = useState('')

  if (!profile || profile.role !== 'faculty') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Only faculty can access this page</p>
        </CardContent>
      </Card>
    )
  }

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      // Map 'approved' filter to faculty-approved for API call
      const apiStatus = statusFilter === 'approved' ? 'faculty-approved' : statusFilter
      const res = await fetch(`/api/leaving-certificates?department=${profile.department}&status=${statusFilter === 'all' ? '' : apiStatus}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      // Filter to show all approved statuses when 'approved' filter is selected
      const filteredData = statusFilter === 'approved' 
        ? data.filter((c: any) => ['faculty-approved', 'hod-approved', 'admin-approved'].includes(c.status))
        : data
      setCertificates(filteredData || [])
    } catch (error) {
      toast.error('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.department) {
      fetchRequests()
    }
  }, [profile?.department, statusFilter])

  const handleAction = async () => {
    if (!selectedCert) return

    try {
      // Map action types to actual status values
      const statusMap: Record<string, string> = {
        approve: 'faculty-approved',
        reject: 'rejected',
        issue: 'issued'
      }
      const status = statusMap[actionType] || actionType
      let payload: any = { status }
      
      if (actionType === 'reject' && !rejectionReason.trim()) {
        toast.error('Please provide rejection reason')
        return
      }
      if (actionType === 'issue' && !certificateUrl.trim()) {
        toast.error('Please provide certificate URL')
        return
      }

      if (actionType === 'reject') {
        payload.rejectionReason = rejectionReason
      } else if (actionType === 'issue') {
        payload.certificateUrl = certificateUrl
      } else {
        payload.approvedBy = profile._id
      }

      const token = localStorage.getItem('authToken')
      const res = await fetch(`/api/leaving-certificates/${selectedCert._id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update')
      }

      toast.success(`Request ${actionType === 'issue' ? 'issued' : actionType}!`)
      setActionDialog(false)
      setSelectedCert(null)
      setRejectionReason('')
      setCertificateUrl('')
      fetchRequests()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      'faculty-approved': 'bg-blue-100 text-blue-800',
      'hod-approved': 'bg-blue-100 text-blue-800',
      'admin-approved': 'bg-blue-100 text-blue-800',
      issued: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return variants[status] || 'bg-slate-100 text-slate-800'
  }

  const stats = {
    pending: certificates.filter(c => c.status === 'pending').length,
    approved: certificates.filter(c => ['faculty-approved', 'hod-approved', 'admin-approved'].includes(c.status)).length,
    issued: certificates.filter(c => c.status === 'issued').length,
    rejected: certificates.filter(c => c.status === 'rejected').length
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leaving Certificate Requests</h1>
          <p className="text-muted-foreground">Review and approve leaving certificate requests from {profile.departmentName || 'your department'} students</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.issued}</p>
                <p className="text-sm text-muted-foreground">Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Requests</CardTitle>
              <CardDescription>Showing {statusFilter === 'all' ? 'all' : statusFilter} requests</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {certificates.map((cert) => (
                <Card key={cert._id} className="p-4 border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{cert.studentName}</h3>
                        <Badge className={getStatusBadge(cert.status)}>{cert.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">Email: {cert.studentEmail}</p>
                      <p className="text-sm text-muted-foreground mb-2">Reason: {cert.reason}</p>
                      <p className="text-xs text-muted-foreground">Requested: {format(new Date(cert.requestedAt), 'MMM d, yyyy HH:mm')}</p>
                      {cert.rejectionReason && (
                        <p className="text-sm text-red-600 mt-2">Rejection: {cert.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {cert.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedCert(cert)
                              setActionType('approve')
                              setActionDialog(true)
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedCert(cert)
                              setActionType('reject')
                              setActionDialog(true)
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {cert.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedCert(cert)
                            setActionType('issue')
                            setActionDialog(true)
                          }}
                        >
                          Issue
                        </Button>
                      )}
                      {cert.certificateUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(cert.certificateUrl, '_blank')}
                        >
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={actionDialog} onOpenChange={setActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' && 'Approve Request'}
              {actionType === 'reject' && 'Reject Request'}
              {actionType === 'issue' && 'Issue Certificate'}
            </DialogTitle>
            <DialogDescription>
              Student: {selectedCert?.studentName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Why are you rejecting this request?"
                  rows={3}
                />
              </div>
            )}

            {actionType === 'issue' && (
              <div className="space-y-2">
                <Label htmlFor="url">Certificate URL</Label>
                <Input
                  id="url"
                  value={certificateUrl}
                  onChange={(e) => setCertificateUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                />
              </div>
            )}

            {actionType === 'approve' && (
              <p className="text-sm text-muted-foreground">
                Are you sure you want to approve this request? The student will be notified.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setActionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAction}>
                {actionType === 'issue' ? 'Issue' : actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
