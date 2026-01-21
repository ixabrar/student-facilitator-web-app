'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { MessageSquare, Plus, Send, Inbox, Mail, MailOpen } from 'lucide-react'

// MongoDB TypeScript Interfaces
interface Profile {
  _id: string
  fullName: string
  email: string
  role: 'student' | 'faculty' | 'admin'
  createdAt: string
  updatedAt: string
}

interface Message {
  _id: string
  senderId: string
  recipientId: string
  subject?: string
  content: string
  isRead: boolean
  sender?: Profile
  receiver?: Profile
  createdAt: string
  updatedAt: string
}

export default function MessagesPage() {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    receiver_id: '',
    subject: '',
    content: ''
  })

  const fetchMessages = async () => {
    try {
      if (!profile?.userId) return
      const response = await fetch(`/api/messages?userId=${profile.userId}`)
      if (!response.ok) throw new Error('Failed to fetch messages')
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      toast.error('Failed to load messages')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/profiles', {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      })
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      
      // Filter users: exclude self, and if student show only faculty/admin
      const filtered = data.filter((user: Profile) => {
        if (user._id === profile?._id) return false
        if (profile?.role === 'student') {
          return user.role === 'faculty' || user.role === 'admin'
        }
        return true
      })
      
      setUsers(filtered.sort((a: Profile, b: Profile) => a.fullName.localeCompare(b.fullName)))
    } catch (error) {
      toast.error('Failed to load user list')
      console.error(error)
    }
  }

  useEffect(() => {
    if (profile) {
      fetchMessages()
      fetchUsers()
    }
  }, [profile])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: profile?.userId,
          recipientId: formData.receiver_id,
          content: formData.content
        })
      })
      
      if (!response.ok) throw new Error('Failed to send message')
      
      toast.success('Message sent successfully')
      setDialogOpen(false)
      setFormData({ receiver_id: '', subject: '', content: '' })
      fetchMessages()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const markAsRead = async (message: Message) => {
    if (message.receiverId === profile?._id && !message.isRead) {
      try {
        const response = await fetch(`/api/messages/${message._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true })
        })
        
        if (!response.ok) throw new Error('Failed to mark as read')
        fetchMessages()
      } catch (error) {
        console.error('Error marking message as read:', error)
      }
    }
    setSelectedMessage(message)
  }

  const unreadCount = messages.filter(m => m.recipientId === profile?.userId && !m.isRead).length

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread messages` : 'Your inbox'}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Send Message</DialogTitle>
              <DialogDescription>Compose a new message</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSend} className="space-y-4">
              <div className="space-y-2">
                <Select value={formData.receiver_id} onValueChange={(v) => setFormData({ ...formData, receiver_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user._id} value={user.userId}>
                        {user.fullName} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Subject (optional)"
                />
              </div>
              <div className="space-y-2">
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your message..."
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={sending || !formData.receiver_id}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Inbox
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-slate-100 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {messages.map((message) => {
                    const isSent = message.senderId === profile?.userId
                    const otherUser = isSent ? message.receiver : message.sender
                    const isUnread = !isSent && !message.isRead
                    
                    return (
                      <button
                        key={message._id}
                        onClick={() => markAsRead(message)}
                        className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                          selectedMessage?._id === message._id ? 'bg-blue-50' : ''
                        } ${isUnread ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-100 text-blue-600">
                              {(otherUser as Profile)?.fullName?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                                {isSent ? 'To: ' : ''}{(otherUser as Profile)?.fullName || 'Unknown'}
                              </p>
                              {isUnread ? (
                                <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              ) : (
                                <MailOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                            {message.subject && (
                              <p className="text-sm text-slate-700 truncate">{message.subject}</p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">{message.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            {selectedMessage ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                        {(selectedMessage.senderId === profile?.userId 
                          ? (selectedMessage.receiver as Profile)?.fullName 
                          : (selectedMessage.sender as Profile)?.fullName
                        )?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {selectedMessage.senderId === profile?.userId ? 'To: ' : 'From: '}
                        {selectedMessage.senderId === profile?.userId 
                          ? (selectedMessage.receiver as Profile)?.fullName 
                          : (selectedMessage.sender as Profile)?.fullName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(selectedMessage.createdAt), 'MMMM d, yyyy at h:mm a')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={selectedMessage.senderId === profile?.userId ? 'secondary' : 'default'}>
                    {selectedMessage.senderId === profile?.userId ? 'Sent' : 'Received'}
                  </Badge>
                </div>
                
                {selectedMessage.subject && (
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium">{selectedMessage.subject}</p>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[400px]">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a message to view</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

