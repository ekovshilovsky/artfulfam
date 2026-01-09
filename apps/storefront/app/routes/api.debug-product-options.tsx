import {data} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';

export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle') || '';
  const query = url.searchParams.get('q') || '';

  const storefront = (context as any).storefront;
  if (!storefront?.query) {
    return data({error: 'Storefront client unavailable'}, {status: 500});
  }

  if (!handle && !query) {
    return data(
      {
        error: 'Provide either ?handle=<product-handle> or ?q=<product search query>.',
        examples: [
          '?handle=blue-bird-w-light-blue-background-on-canvas',
          '?q=title:Blue Bird',
        ],
      },
      {status: 400},
    );
  }

  if (handle) {
    const result = await storefront.query(DEBUG_BY_HANDLE_QUERY, {
      variables: {handle},
    });
    return data(result);
  }

  const result = await storefront.query(DEBUG_BY_QUERY_QUERY, {
    variables: {query},
  });
  return data(result);
}

const DEBUG_BY_HANDLE_QUERY = `#graphql
  query DebugProductOptionsByHandle($handle: String!) {
    product(handle: $handle) {
      id
      handle
      title
      options {
        name
        values
      }
      variants(first: 50) {
        nodes {
          id
          title
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
` as const;

const DEBUG_BY_QUERY_QUERY = `#graphql
  query DebugProductOptionsByQuery($query: String!) {
    products(first: 5, query: $query) {
      nodes {
        id
        handle
        title
        options {
          name
          values
        }
        variants(first: 50) {
          nodes {
            id
            title
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
  }
` as const;

