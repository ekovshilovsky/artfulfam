import { useEffect, useState } from 'react';
import { api, type Template } from '../lib/api';

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    api.templates
      .list(selectedCategory || undefined)
      .then(setTemplates)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  const categories = ['', 'TEE', 'CANVAS', 'MUG', 'POSTER'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Product Templates</h1>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {categories.slice(1).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">Error loading templates: {error}</p>
        </div>
      ) : loading ? (
        <div className="py-12 text-center text-gray-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-8 text-center">
          <p className="text-gray-500">No templates found</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-32 items-center justify-center rounded-md bg-gray-100">
                <span className="text-4xl">🎨</span>
              </div>
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {template.category} • {template.variants.length} variants
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Provider: {template.provider}
              </p>
              <button
                className="mt-4 w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                onClick={() => {
                  // TODO: Navigate to create draft with this template
                  alert(`Create draft with template: ${template.id}`);
                }}
              >
                Use This Template
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
