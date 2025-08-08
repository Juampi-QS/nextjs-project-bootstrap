import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

const updateDocumentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve document' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = updateDocumentSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.errors },
        { status: 400 }
      )
    }

    // Check if document exists
    const existingDocument = await prisma.document.findUnique({
      where: { id: params.id }
    })

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if user can edit (author or admin)
    if (existingDocument.authorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own documents' },
        { status: 403 }
      )
    }

    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: result.data,
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true }
        }
      }
    })

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error('Update document error:', error)
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if document exists
    const existingDocument = await prisma.document.findUnique({
      where: { id: params.id }
    })

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check if user can delete (author or admin)
    if (existingDocument.authorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own documents' },
        { status: 403 }
      )
    }

    await prisma.document.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
