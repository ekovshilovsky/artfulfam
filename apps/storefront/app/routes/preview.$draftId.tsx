/**
 * Draft Preview Route
 *
 * This route allows contributors to preview their product drafts
 * before publishing. It fetches draft data from the backend API
 * and renders a product-detail-page-style preview.
 *
 * URL: /preview/{draftId}?t={previewToken}
 */

import {type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {useLoaderData} from 'react-router';
import {backend, type PreviewData} from '~/lib/backend.server';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  if (!data?.draft) {
    return [{title: 'Preview Not Found | ArtfulFam'}];
  }
  return [
    {title: `Preview: ${data.draft.title} | ArtfulFam`},
    {name: 'robots', content: 'noindex, nofollow'},
  ];
};

export async function loader({params, request}: LoaderFunctionArgs) {
  const {draftId} = params;
  if (!draftId) {
    throw new Response('Draft ID is required', {status: 400});
  }

  // Get preview token from query string
  const url = new URL(request.url);
  const previewToken = url.searchParams.get('t') || undefined;

  // Fetch draft with template from backend
  const data = await backend.getDraftWithTemplate(draftId, previewToken);

  if (!data) {
    throw new Response('Preview not found or expired', {status: 404});
  }

  return data;
}

export default function PreviewPage() {
  const {draft, template} = useLoaderData<PreviewData>();

  // Get enabled variants with template details
  const enabledVariants = draft.variants
    .filter((v) => v.enabled)
    .map((draftVariant) => {
      const templateVariant = template.variants.find(
        (tv) => tv.id === draftVariant.templateVariantId
      );
      return {
        ...draftVariant,
        name: templateVariant?.name || 'Unknown',
        baseCost: templateVariant?.baseCost || 0,
        inStock: templateVariant?.inStock ?? true,
        price: draftVariant.priceOverride || templateVariant?.baseCost || 0,
      };
    });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Preview Banner */}
      <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👁️</span>
          <div>
            <p className="font-medium text-yellow-800">Preview Mode</p>
            <p className="text-sm text-yellow-700">
              This is a preview of your draft product. It is not visible to customers.
            </p>
          </div>
        </div>
        <div className="mt-2 flex gap-2 text-sm">
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            draft.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
            draft.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
            draft.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
            draft.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {draft.status.replace('_', ' ')}
          </span>
          <span className="text-yellow-600">•</span>
          <span className="text-yellow-700">
            Last updated: {new Date(draft.updatedAt).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Product Image */}
        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
          {draft.imageUrl ? (
            <img
              src={draft.imageUrl}
              alt={draft.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <div className="text-center">
                <span className="text-6xl">🎨</span>
                <p className="mt-2 text-sm">No image uploaded</p>
              </div>
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-500">{template.category}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
              {draft.title}
            </h1>
          </div>

          {draft.description && (
            <div className="prose prose-sm text-gray-600">
              <p>{draft.description}</p>
            </div>
          )}

          {/* Variants */}
          <div>
            <h2 className="text-sm font-medium text-gray-900">Available Variants</h2>
            <div className="mt-3 space-y-2">
              {enabledVariants.map((variant) => (
                <div
                  key={variant.templateVariantId}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{variant.name}</p>
                    <p className="text-sm text-gray-500">
                      Base cost: ${(variant.baseCost / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">
                      ${(variant.price / 100).toFixed(2)}
                    </p>
                    {!variant.inStock && (
                      <p className="text-xs text-red-600">Out of stock</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Actions (disabled) */}
          <div className="space-y-3">
            <button
              disabled
              className="w-full rounded-md bg-gray-300 px-4 py-3 text-sm font-medium text-gray-500 cursor-not-allowed"
            >
              Add to Cart (Preview Only)
            </button>
            <p className="text-center text-xs text-gray-500">
              Cart and checkout are disabled in preview mode
            </p>
          </div>

          {/* Template Info */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="text-sm font-medium text-gray-900">Product Template</h3>
            <dl className="mt-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <dt>Template:</dt>
                <dd className="font-medium">{template.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Provider:</dt>
                <dd className="font-medium capitalize">{template.provider}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Category:</dt>
                <dd className="font-medium">{template.category}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="text-6xl">🔒</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        Preview Not Available
      </h1>
      <p className="mt-2 text-gray-600">
        This preview link may have expired or the draft no longer exists.
        Please request a new preview link from the contributor portal.
      </p>
    </div>
  );
}
