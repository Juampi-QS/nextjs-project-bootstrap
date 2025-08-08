'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface User {
  id: number
  name: string
  email: string
  role: string
}

interface Document {
  id: string
  title: string
  content: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  createdAt: string
  updatedAt: string
  author: User
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM')

  useEffect(() => {
    checkAuth()
    fetchDocuments()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, status, priority }),
      })

      if (response.ok) {
        const newDocument = await response.json()
        setDocuments([newDocument, ...documents])
        setTitle('')
        setContent('')
        setStatus('TODO')
        setPriority('MEDIUM')
        setIsCreateDialogOpen(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create document')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    }
  }

  const updateDocumentStatus = async (id: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        const updatedDocument = await response.json()
        setDocuments(documents.map(doc => 
          doc.id === id ? updatedDocument : doc
        ))
      }
    } catch (error) {
      console.error('Failed to update document:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500'
      case 'HIGH': return 'bg-orange-500'
      case 'MEDIUM': return 'bg-yellow-500'
      case 'LOW': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-gray-500'
      case 'IN_PROGRESS': return 'bg-blue-500'
      case 'DONE': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  const todoDocuments = documents.filter(doc => doc.status === 'TODO')
  const inProgressDocuments = documents.filter(doc => doc.status === 'IN_PROGRESS')
  const doneDocuments = documents.filter(doc => doc.status === 'DONE')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                SysAdmin Documentation Manager
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user?.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">{user?.role}</Badge>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>Create Document</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Create New Document</DialogTitle>
                    <DialogDescription>
                      Add a new documentation item to track and manage.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateDocument} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter document title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Enter document content"
                        rows={4}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TODO">To Do</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="DONE">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="URGENT">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create Document</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* To Do Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">To Do</h2>
              <Badge variant="secondary">{todoDocuments.length}</Badge>
            </div>
            <div className="space-y-3">
              {todoDocuments.map((doc) => (
                <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {doc.title}
                      </CardTitle>
                      <Badge className={`${getPriorityColor(doc.priority)} text-white text-xs`}>
                        {doc.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-xs line-clamp-3 mb-3">
                      {doc.content}
                    </CardDescription>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>ID: {doc.id.slice(-8)}</span>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => updateDocumentStatus(doc.id, 'IN_PROGRESS')}
                        >
                          Start
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">In Progress</h2>
              <Badge variant="secondary">{inProgressDocuments.length}</Badge>
            </div>
            <div className="space-y-3">
              {inProgressDocuments.map((doc) => (
                <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-shadow border-blue-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {doc.title}
                      </CardTitle>
                      <Badge className={`${getPriorityColor(doc.priority)} text-white text-xs`}>
                        {doc.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-xs line-clamp-3 mb-3">
                      {doc.content}
                    </CardDescription>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>ID: {doc.id.slice(-8)}</span>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => updateDocumentStatus(doc.id, 'TODO')}
                        >
                          Back
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => updateDocumentStatus(doc.id, 'DONE')}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Done Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Done</h2>
              <Badge variant="secondary">{doneDocuments.length}</Badge>
            </div>
            <div className="space-y-3">
              {doneDocuments.map((doc) => (
                <Card key={doc.id} className="cursor-pointer hover:shadow-md transition-shadow border-green-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium line-clamp-2">
                        {doc.title}
                      </CardTitle>
                      <Badge className={`${getPriorityColor(doc.priority)} text-white text-xs`}>
                        {doc.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CardDescription className="text-xs line-clamp-3 mb-3">
                      {doc.content}
                    </CardDescription>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>ID: {doc.id.slice(-8)}</span>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => updateDocumentStatus(doc.id, 'IN_PROGRESS')}
                        >
                          Reopen
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
