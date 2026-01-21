'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CreditCard, Plus, Download, Trash2 } from 'lucide-react'

interface FeePayment {
  _id: string
  studentId: string
  amount: number
  paymentType: 'tuition' | 'examination' | 'activity' | 'other'
  semester?: number
  status: 'pending' | 'paid' | 'rejected' | 'failed'
  transactionId: string
  paymentMethod: string
  paidAt?: string
  receiptUrl?: string
  createdAt: string
}

export default function FeePaymentsPage() {
  const { profile, user } = useAuth()
  const [payments, setPayments] = useState<FeePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    paymentType: 'tuition',
    semester: '',
    paymentMethod: 'online',
    receiptFile: null as File | null
  })

  const fetchPayments = async () => {
    if (!profile?._id) return
    try {
      const res = await fetch(`/api/fee-payments?studentId=${profile._id}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPayments(data || [])
    } catch (error) {
      toast.error('Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile?._id) {
      fetchPayments()
    }
  }, [profile?._id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter valid amount')
      return
    }

    // Online payment - use Razorpay integration
    if (formData.paymentMethod === 'online') {
      handleOnlinePayment()
      return
    }

    // Offline payment - require receipt upload
    if (!formData.receiptFile) {
      toast.error('Please upload payment receipt/screenshot')
      return
    }

    try {
      // Upload receipt file first
      const uploadFormData = new FormData()
      uploadFormData.append('file', formData.receiptFile)
      uploadFormData.append('type', 'fee-receipt')

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload receipt')
      }

      const { url: receiptUrl } = await uploadRes.json()

      // Create payment record with receipt URL
      const res = await fetch('/api/fee-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: profile?._id,
          amount: parseFloat(formData.amount),
          paymentType: formData.paymentType,
          semester: formData.semester ? parseInt(formData.semester) : undefined,
          paymentMethod: formData.paymentMethod,
          receiptUrl
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to submit payment')
      }

      toast.success('Payment request submitted with receipt! Awaiting verification.')
      setFormData({ amount: '', paymentType: 'tuition', semester: '', paymentMethod: 'online', receiptFile: null })
      setDialogOpen(false)
      fetchPayments()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleOnlinePayment = async () => {
    console.log('🔵 Starting online payment process')
    try {
      // Create order
      console.log('📝 Creating order with data:', {
        studentId: profile?._id,
        amount: parseFloat(formData.amount),
        paymentType: formData.paymentType,
        semester: formData.semester
      })

      const orderRes = await fetch('/api/fee-payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: profile?._id,
          amount: parseFloat(formData.amount),
          paymentType: formData.paymentType,
          semester: formData.semester ? parseInt(formData.semester) : undefined,
        })
      })

      console.log('📦 Order response status:', orderRes.status)

      if (!orderRes.ok) {
        const errorData = await orderRes.json()
        console.error('❌ Order creation failed:', errorData)
        throw new Error('Failed to create order')
      }

      const orderData = await orderRes.json()
      console.log('✅ Order created:', orderData)

      // Check if we have valid Razorpay keys
      const hasValidKey = orderData.key && orderData.key !== 'rzp_test_demo_key' && !orderData.key.includes('your_key')
      console.log('🔑 Razorpay key check:', { key: orderData.key, hasValidKey })

      if (!hasValidKey) {
        console.log('⚠️ Running in DEMO mode - no valid Razorpay keys')
        
        // Demo mode - simulate payment without Razorpay
        if (!confirm(`Demo Payment\n\nAmount: ₹${formData.amount}\nType: ${formData.paymentType}\n\nClick OK to simulate successful payment`)) {
          toast.error('Payment cancelled')
          return
        }

        // Simulate payment verification
        const demoPaymentId = `pay_demo_${Date.now()}`
        const demoSignature = `sig_demo_${Math.random().toString(36).substr(2, 9)}`

        console.log('🎭 Simulating payment with demo credentials')

        const verifyRes = await fetch('/api/fee-payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: demoPaymentId,
            razorpay_signature: demoSignature,
            studentId: profile?._id,
            amount: parseFloat(formData.amount),
            paymentType: formData.paymentType,
            semester: formData.semester ? parseInt(formData.semester) : undefined,
          })
        })

        if (!verifyRes.ok) {
          const errorData = await verifyRes.json()
          console.error('❌ Demo verification failed:', errorData)
          throw new Error('Payment verification failed')
        }

        console.log('✅ Demo payment successful')
        toast.success('🎉 Demo payment successful! Your fee has been paid.')
        setFormData({ amount: '', paymentType: 'tuition', semester: '', paymentMethod: 'online', receiptFile: null })
        setDialogOpen(false)
        fetchPayments()
        return
      }

      console.log('💳 Loading Razorpay checkout with real keys')

      // Real Razorpay mode - Load script and open checkout
      if (!(window as any).Razorpay) {
        console.log('📥 Loading Razorpay script...')
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        document.body.appendChild(script)
        await new Promise((resolve, reject) => {
          script.onload = () => {
            console.log('✅ Razorpay script loaded')
            resolve(true)
          }
          script.onerror = () => {
            console.error('❌ Failed to load Razorpay script')
            reject(new Error('Failed to load Razorpay'))
          }
        })
      } else {
        console.log('✅ Razorpay already loaded')
      }

      // Open Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount * 100,
        currency: orderData.currency,
        name: 'EduHub - Fee Payment',
        description: `${formData.paymentType.charAt(0).toUpperCase() + formData.paymentType.slice(1)} Fee Payment`,
        order_id: orderData.orderId,
        prefill: {
          name: orderData.studentName,
          email: orderData.studentEmail,
        },
        theme: {
          color: '#2563eb',
        },
        handler: async function (response: any) {
          console.log('💰 Payment completed, verifying...', response)
          try {
            const verifyRes = await fetch('/api/fee-payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                studentId: profile?._id,
                amount: parseFloat(formData.amount),
                paymentType: formData.paymentType,
                semester: formData.semester ? parseInt(formData.semester) : undefined,
              })
            })

            if (!verifyRes.ok) {
              const errorData = await verifyRes.json()
              console.error('❌ Verification failed:', errorData)
              throw new Error('Payment verification failed')
            }

            console.log('✅ Payment verified successfully')
            toast.success('Payment successful! Your fee has been paid.')
            setFormData({ amount: '', paymentType: 'tuition', semester: '', paymentMethod: 'online', receiptFile: null })
            setDialogOpen(false)
            fetchPayments()
          } catch (error: any) {
            console.error('❌ Verification error:', error)
            toast.error(error.message || 'Payment verification failed')
          }
        },
        modal: {
          ondismiss: function () {
            console.log('⚠️ Payment modal dismissed by user')
            toast.error('Payment cancelled')
          },
        },
      }

      console.log('🚀 Opening Razorpay checkout...')
      const razorpay = new (window as any).Razorpay(options)
      razorpay.open()
    } catch (error: any) {
      console.error('❌ Payment initiation error:', error)
      toast.error(error.message || 'Failed to initiate payment')
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this payment?')) return

    try {
      const res = await fetch(`/api/fee-payments/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to cancel')
      toast.success('Payment cancelled')
      fetchPayments()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalPending = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fee Payments</h1>
          <p className="text-muted-foreground">Manage your fee payments and track payment history</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <Plus className="h-4 w-4 mr-2" />
              New Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Fee Payment</DialogTitle>
              <DialogDescription>Enter payment details (no real payment gateway)</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="100"
                  placeholder="5000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Type *</Label>
                  <Select value={formData.paymentType} onValueChange={(v) => setFormData({ ...formData, paymentType: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tuition">Tuition</SelectItem>
                      <SelectItem value="examination">Examination</SelectItem>
                      <SelectItem value="activity">Activity</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
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
                        <SelectItem key={sem} value={sem.toString()}>Sem {sem}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select value={formData.paymentMethod} onValueChange={(v) => setFormData({ ...formData, paymentMethod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online Payment (Razorpay)</SelectItem>
                    <SelectItem value="cash">Cash at Counter</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Show receipt upload only for offline payments */}
              {formData.paymentMethod !== 'online' && (
                <div className="space-y-2">
                  <Label htmlFor="receipt">Payment Receipt/Screenshot *</Label>
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setFormData({ ...formData, receiptFile: file })
                    }}
                    required
                  />
                  {formData.receiptFile && (
                    <p className="text-xs text-green-600">✓ {formData.receiptFile.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Upload payment receipt, screenshot, or proof</p>
                </div>
              )}

              {formData.paymentMethod === 'online' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    🔒 Secure online payment via Razorpay. You'll be redirected to complete payment.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full">
                {formData.paymentMethod === 'online' ? 'Proceed to Payment' : 'Submit Payment Request'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">₹{totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No payment records yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="max-h-[600px] overflow-y-auto space-y-4 pr-2">
          {payments.map((payment) => (
            <Card key={payment._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1)} Fee
                    </CardTitle>
                    <CardDescription>
                      Txn: {payment.transactionId}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(payment.status)}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-bold text-lg">₹{payment.amount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Method</p>
                    <p className="font-medium capitalize">{payment.paymentMethod.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(payment.createdAt), 'MMM d, yyyy')}</p>
                  </div>
                </div>
                {payment.paidAt && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm font-medium text-green-900">Payment Confirmed</p>
                    <p className="text-sm text-green-800">Paid on {format(new Date(payment.paidAt), 'MMM d, yyyy')}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  {payment.status === 'paid' && payment.receiptUrl && (
                    <Button size="sm" variant="outline" onClick={() => window.open(payment.receiptUrl)}>
                      <Download className="h-4 w-4 mr-1" />
                      Receipt
                    </Button>
                  )}
                  {payment.status === 'pending' && (
                    <Button size="sm" variant="destructive" onClick={() => handleCancel(payment._id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Cancel
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
