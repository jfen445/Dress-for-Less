import createImageUrlBuilder from '@sanity/image-url'
import type { Image } from 'sanity'

import { dataset, projectId } from '../env'

const imageBuilder = createImageUrlBuilder({
  projectId: projectId || '',
  dataset: dataset || '',
})

export const urlForImage = (source: Image) => {
  return imageBuilder?.image(source).auto('format').fit('max').url()
}

// Our GROQ queries resolve `images[].asset->url` to plain CDN URL strings
// rather than image refs, so `urlForImage`'s builder (which needs a ref)
// doesn't apply here. Sanity's asset CDN honours the same transform
// params (w/h/q/auto) appended directly to that resolved URL, so this
// covers sizing/compressing without reshaping every query's projection.
type SizeOpts = { width: number; height?: number; quality?: number }

export function sizedImageUrl(url: string, opts: SizeOpts): string
export function sizedImageUrl(url: string | undefined | null, opts: SizeOpts): string | undefined
export function sizedImageUrl(
  url: string | undefined | null,
  { width, height, quality = 75 }: SizeOpts
): string | undefined {
  if (!url) return url ?? undefined
  try {
    const sized = new URL(url)
    sized.searchParams.set('w', String(width))
    if (height) sized.searchParams.set('h', String(height))
    sized.searchParams.set('q', String(quality))
    sized.searchParams.set('auto', 'format')
    sized.searchParams.set('fit', 'max')
    return sized.toString()
  } catch {
    return url
  }
}
