import { useEffect, useState } from 'react';
import { api, type HealthResponse } from '../lib/api';

export function HomePage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.health()
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome to ArtfulFam Contributor Portal
        </h1>
        <p className="mt-2 text-gray-600">
          Create and manage your artwork products here.
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-medium text-gray-900">API Status</h2>
        {error ? (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">
              Unable to connect to API: {error}
            </p>
            <p className="mt-2 text-xs text-red-500">
              Make sure the API server is running on port 3001
            </p>
          </div>
        ) : health ? (
          <div className="mt-4 rounded-md bg-green-50 p-4">
            <p className="text-sm text-green-700">
              ✓ API is healthy
            </p>
            <dl className="mt-2 text-xs text-green-600">
              <div className="flex gap-2">
                <dt>Version:</dt>
                <dd>{health.version}</dd>
              </div>
              <div className="flex gap-2">
                <dt>Timestamp:</dt>
                <dd>{new Date(health.timestamp).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Checking API status...</p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-medium text-gray-900">Getting Started</h2>
          <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-gray-600">
            <li>Browse available templates</li>
            <li>Create a new draft with your artwork</li>
            <li>Preview your product</li>
            <li>Submit for approval</li>
          </ol>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          <div className="mt-4 space-y-2">
            <a
              href="/templates"
              className="block rounded-md bg-primary-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-700"
            >
              Browse Templates
            </a>
            <a
              href="/drafts"
              className="block rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View My Drafts
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
