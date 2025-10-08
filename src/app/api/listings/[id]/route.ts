import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/database'
import { getOptionalUser, requireAgent } from '@/lib/serverAuth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const listing = await prisma.unitListing.findUnique({ where: { id: params.id } })
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    const viewer = getOptionalUser(request)
    const isAgent = viewer?.role === 'AGENT' || viewer?.role === 'ADMIN'
    if (!listing.isPublished && !isAgent) {
      return NextResponse.json({ error: 'Listing not available' }, { status: 404 })
    }
    const unit = await prisma.propertyUnit.findUnique({ 
      where: { id: listing.unitId }, 
      include: { 
        fileUpload: true,
        media: true
      } 
    })

    let guidedViews: Array<{ id: string; name: string; position: number[]; target: number[] }> = []
    const editorState = unit?.editorState
    if (editorState && typeof editorState === 'object') {
      const navigation = (editorState as Record<string, unknown>).navigation
      const views = navigation && typeof navigation === 'object' ? (navigation as Record<string, unknown>).guidedViews : null
      if (Array.isArray(views)) {
        guidedViews = views
          .map((entry) => {
            if (!entry || typeof entry !== 'object') return null
            const { id, name, position, target } = entry as Record<string, unknown>
            if (!Array.isArray(position) || position.length !== 3) return null
            if (!Array.isArray(target) || target.length !== 3) return null
            const pos = position.map(Number)
            const tgt = target.map(Number)
            if (pos.some((n) => Number.isNaN(n)) || tgt.some((n) => Number.isNaN(n))) return null
            return {
              id: typeof id === 'string' && id ? id : `view-${Math.random().toString(36).slice(2)}`,
              name: typeof name === 'string' && name.trim() ? name.trim() : 'View',
              position: pos as number[],
              target: tgt as number[],
            }
          })
          .filter((value): value is { id: string; name: string; position: number[]; target: number[] } => Boolean(value))
      }
    }

    return NextResponse.json({ listing, unit, guidedViews })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch listing' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAgent(request)
    if (!auth.ok) return auth.response

    const body = await request.json()

    const updated = await prisma.unitListing.update({
      where: { id: params.id },
      data: {
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        address: body.address ?? undefined,
        city: body.city ?? undefined,
        bedrooms: body.bedrooms ?? undefined,
        bathrooms: body.bathrooms ?? undefined,
        areaSqm: body.areaSqm ?? undefined,
        basePrice: body.basePrice != null ? parseFloat(body.basePrice) : undefined,
        coverImage: body.coverImage ?? undefined,
        isPublished: body.isPublished ?? undefined,
      }
    })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update listing' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAgent(request)
    if (!auth.ok) return auth.response

    const body = await request.json()
    if (typeof body.isPublished !== 'boolean') {
      return NextResponse.json({ error: 'isPublished boolean required' }, { status: 400 })
    }
    const updated = await prisma.unitListing.update({ where: { id: params.id }, data: { isPublished: body.isPublished } })
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to publish/unpublish' }, { status: 500 })
  }
}
