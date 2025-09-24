import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/database'
import { requireAgent } from '@/lib/serverAuth'

// Create listing or list listings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const onlyPublished = searchParams.get('published') === 'true'
    if (!onlyPublished) {
      const auth = requireAgent(request)
      if (!auth.ok) return auth.response
    }
    const listings = await prisma.unitListing.findMany({
      where: onlyPublished ? { isPublished: true } : undefined,
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(listings)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list listings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAgent(request)
    if (!auth.ok) return auth.response

    const body = await request.json()
    const required = ['unitId', 'title', 'basePrice']
    for (const k of required) {
      if (body[k] == null || body[k] === '') {
        return NextResponse.json({ error: `${k} is required` }, { status: 400 })
      }
    }

    const currency = typeof body.currency === 'string' && body.currency.trim().length === 3
      ? body.currency.trim().toUpperCase()
      : 'ETB'
    const basePrice = parseFloat(body.basePrice)
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      return NextResponse.json({ error: 'basePrice must be a positive number' }, { status: 400 })
    }

    const listingData = {
      title: body.title,
      description: body.description ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
      bedrooms: body.bedrooms ?? 0,
      bathrooms: body.bathrooms ?? 0,
      areaSqm: body.areaSqm ?? 0,
      basePrice,
      currency,
      coverImage: body.coverImage ?? null,
    }

    // Ensure the unit exists and has a processed model (GLB) to prevent wrong model publish
    const unit = await prisma.propertyUnit.findUnique({ where: { id: body.unitId }, include: { fileUpload: true } })
    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    const glbPath = unit.fileUpload?.glbFilePath
    if (!glbPath) {
      return NextResponse.json({ error: 'Model is not processed yet. Generate GLB before publishing.' }, { status: 400 })
    }

    const listing = await prisma.unitListing.upsert({
      where: { unitId: body.unitId },
      update: {
        ...(listingData as any),
      },
      create: {
        unitId: body.unitId,
        ...(listingData as any),
      }
    })

    return NextResponse.json(listing)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create/update listing' }, { status: 500 })
  }
}
