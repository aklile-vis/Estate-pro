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
    const required = ['title', 'basePrice'] // unitId is now optional
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
      // Default to not published, agent can publish explicitly
      isPublished: body.isPublished ?? false, 
    }

    let targetUnitId = body.unitId

    // If unitId is provided, validate it and its GLB path
    if (targetUnitId) {
      const unit = await prisma.propertyUnit.findUnique({ where: { id: targetUnitId }, include: { fileUpload: true } })
      if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
      const glbPath = unit.fileUpload?.glbFilePath
      if (!glbPath) {
        return NextResponse.json({ error: 'Model is not processed yet. Generate GLB before publishing.' }, { status: 400 })
      }
    } else {
      // If no unitId, create a new PropertyUnit for this listing
      const newUnit = await prisma.propertyUnit.create({
        data: {
          name: listingData.title, // Use title as the name for PropertyUnit
        },
      })
      targetUnitId = newUnit.id
    }
    
    // Ensure that a unitId is always present at this point
    if (!targetUnitId) {
      return NextResponse.json({ error: 'Failed to create or find a property unit.' }, { status: 500 })
    }

    const listing = await prisma.unitListing.upsert({
      where: { unitId: targetUnitId },
      update: {
        ...(listingData as any),
      },
      create: {
        unitId: targetUnitId,
        ...(listingData as any),
      }
    })

    return NextResponse.json(listing)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to create/update listing' }, { status: 500 })
  }
}
