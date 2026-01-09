/**
 * API client for the backend
 * TODO: Replace with generated client from @repo/contracts
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  provider: string;
  variants: Array<{
    id: string;
    name: string;
    baseCost: number;
    inStock: boolean;
  }>;
}

export interface Draft {
  id: string;
  ownerId: string;
  templateId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  status: string;
  variants: Array<{
    templateVariantId: string;
    enabled: boolean;
    priceOverride?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  health: () => fetchJson<HealthResponse>('/health'),

  templates: {
    list: (category?: string) =>
      fetchJson<Template[]>(
        `/v1/templates${category ? `?category=${category}` : ''}`
      ),
    get: (id: string) => fetchJson<Template>(`/v1/templates/${id}`),
  },

  drafts: {
    list: (ownerId?: string, status?: string) => {
      const params = new URLSearchParams();
      if (ownerId) params.set('ownerId', ownerId);
      if (status) params.set('status', status);
      const query = params.toString();
      return fetchJson<Draft[]>(`/v1/drafts${query ? `?${query}` : ''}`);
    },
    get: (id: string) => fetchJson<Draft>(`/v1/drafts/${id}`),
    create: (data: {
      ownerId: string;
      templateId: string;
      title: string;
      description?: string;
      imageUrl?: string;
    }) =>
      fetchJson<Draft>('/v1/drafts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    validate: (id: string) =>
      fetchJson<{ valid: boolean; errors: string[] }>(`/v1/drafts/${id}/validate`, {
        method: 'POST',
      }),
    createPreview: (id: string) =>
      fetchJson<{ previewUrl: string; expiresAt: string }>(
        `/v1/drafts/${id}/preview`,
        { method: 'POST' }
      ),
  },
};
