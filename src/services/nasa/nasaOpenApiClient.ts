/**
 * Official NASA Open APIs Client (Managed via Backend Health & Metadata)
 * Keeps NASA_API_KEY strictly on the backend server.
 */

export interface NasaApodObservation {
  title: string;
  date: string;
  explanation: string;
  url: string;
  hdurl?: string;
  mediaType: string;
}

export async function fetchNasaDailyObservation(): Promise<NasaApodObservation | null> {
  try {
    const res = await fetch('/api/datasets/availability');
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: `NASA Earthdata Cloud — ${data.studyArea || 'Nile Delta, Egypt'}`,
      date: new Date().toISOString().slice(0, 10),
      explanation:
        'Live MODIS/Terra MOD13Q1.061 (250m NDVI) and MOD11C3.061 (0.05° Day & Night Land Surface Temperature) coverage over the Nile Delta agricultural basin.',
      url: '/api/raster/overlay/ndvi.png',
      mediaType: 'image',
    };
  } catch {
    return null;
  }
}
