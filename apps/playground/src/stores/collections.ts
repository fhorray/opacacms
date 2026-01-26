import { atom, computed } from 'nanostores'

export interface Collection {
  slug: string;
  fields: any[];
  timestamps?: boolean;
}

export const $collections = atom<Collection[]>([])
export const $currentDocuments = atom<any[]>([])
export const $isCollectionsLoading = atom(false)

export async function fetchCollections() {
  $isCollectionsLoading.set(true)
  try {
    const res = await fetch('/api/__admin/collections')
    const data = await res.json() as any
    $collections.set(data.collections || [])
  } catch (e) {
    console.error('Failed to fetch collections', e)
  } finally {
    $isCollectionsLoading.set(false)
  }
}

export async function fetchDocuments(slug: string) {
  try {
    const res = await fetch(`/api/${slug}`)
    const data = (await res.json()) as any;
  } catch (e) {
    console.error(`Failed to fetch documents for ${slug}`, e)
  }
}
