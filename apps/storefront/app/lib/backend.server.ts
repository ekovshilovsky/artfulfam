/**
 * Backend API client for server-side use only
 *
 * This module provides a type-safe client for communicating with the
 * NestJS backend API. It should only be used in loaders and actions.
 */

// TODO: Import from @repo/contracts when generated client is ready
// import { ApiClient } from '@repo/contracts/client';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  timeout?: number;
}

async function fetchBackend<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Types (will be imported from @repo/contracts later)
export interface Draft {
  id: string;
  ownerId: string;
  templateId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  variants: Array<{
    templateVariantId: string;
    enabled: boolean;
    priceOverride?: number;
  }>;
  previewToken?: string;
  createdAt: string;
  updatedAt: string;
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

export interface PreviewData {
  draft: Draft;
  template: Template;
}

/**
 * Backend API client
 */
export const backend = {
  /**
   * Get a draft by ID with its template
   */
  async getDraftWithTemplate(
    draftId: string,
    previewToken?: string
  ): Promise<PreviewData | null> {
    try {
      // Fetch draft
      const draftPath = `/v1/drafts/${draftId}${previewToken ? `?t=${previewToken}` : ''}`;
      const draft = await fetchBackend<Draft>(draftPath);

      // Verify preview token if draft is not published
      if (draft.status !== 'PUBLISHED' && draft.previewToken !== previewToken) {
        return null;
      }

      // Fetch template
      const template = await fetchBackend<Template>(
        `/v1/templates/${draft.templateId}`
      );

      return { draft, template };
    } catch (error) {
      console.error('Error fetching draft preview:', error);
      return null;
    }
  },

  /**
   * Get health status
   */
  async health(): Promise<{ status: string; timestamp: string }> {
    return fetchBackend('/health');
  },
};
