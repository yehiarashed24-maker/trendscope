/**
 * NASA Earthdata CMR Client (Proxied via Backend `/api/datasets/...`)
 * Ensures Earthdata JWT Bearer token remains strictly on the backend server.
 */

export interface CmrCollectionResult {
  id: string;
  title: string;
  version: string;
  summary: string;
  archiveCenter: string;
}

export async function searchCmrCollections(
  keyword: string,
  pageSize = 5
): Promise<CmrCollectionResult[]> {
  const lower = keyword.toLowerCase();
  const variable = lower.includes('lst') || lower.includes('temp') || lower.includes('mod11')
    ? 'lst'
    : 'ndvi';

  try {
    const res = await fetch(`/api/datasets/search?variable=${variable}&limit=${pageSize}`);
    if (!res.ok) return [];
    const data = await res.json();
    const granules = data?.granules || [];
    return granules.map((g: any) => ({
      id: g.id,
      title: g.title,
      version: data?.dataset?.version || '061',
      summary: `${data?.dataset?.name || variable} • Tile/Granule covering Nile Delta (${g.time_start} to ${g.time_end})`,
      archiveCenter: data?.dataset?.daac || 'NASA EOSDIS',
    }));
  } catch (err) {
    console.warn('Backend NASA CMR search error:', err);
    return [];
  }
}
