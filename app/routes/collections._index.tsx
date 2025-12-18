import {useLoaderData, Link} from 'react-router';
import {data} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';
import {Pagination, getPaginationVariables, Image} from '@shopify/hydrogen';
import type {CollectionFragment} from 'storefrontapi.generated';
import {Container} from '~/components/atoms/container';

export async function loader({context, request}: LoaderFunctionArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 4,
  });

  const {collections} = await context.storefront.query(COLLECTIONS_QUERY, {
    variables: paginationVariables,
  });

  return data({collections});
}

export default function Collections() {
  const {collections} = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen">
      <section className="py-12 md:py-16">
        <Container>
          <div className="mb-10">
            <h1 className="text-3xl md:text-5xl font-bold font-display text-foreground">
              Collections
            </h1>
            <p className="text-muted-foreground mt-2">
              Browse artwork by collection.
            </p>
          </div>

          <Pagination connection={collections}>
            {({nodes, isLoading, PreviousLink, NextLink}) => (
              <div className="space-y-6">
                <div>
                  <PreviousLink className="inline-flex text-sm text-muted-foreground hover:text-primary transition-colors">
                    {isLoading ? 'Loading...' : <span>↑ Load previous</span>}
                  </PreviousLink>
                </div>

                <CollectionsGrid collections={nodes} />

                <div>
                  <NextLink className="inline-flex text-sm text-muted-foreground hover:text-primary transition-colors">
                    {isLoading ? 'Loading...' : <span>Load more ↓</span>}
                  </NextLink>
                </div>
              </div>
            )}
          </Pagination>
        </Container>
      </section>
    </div>
  );
}

function CollectionsGrid({collections}: {collections: CollectionFragment[]}) {
  // Shopify often has an internal/default "Home page" collection; we don't want to display it as a tile.
  const visibleCollections = collections.filter((c) => {
    const handle = String(c.handle || '').toLowerCase();
    const title = String(c.title || '').toLowerCase();
    return handle !== 'home-page' && title !== 'home page';
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {visibleCollections.map((collection, index) => (
        <CollectionItem
          key={collection.id}
          collection={collection}
          index={index}
        />
      ))}
    </div>
  );
}

function CollectionItem({
  collection,
  index,
}: {
  collection: CollectionFragment;
  index: number;
}) {
  return (
    <Link
      className="group overflow-hidden border-2 border-border rounded-lg hover:border-primary transition-colors duration-300 bg-background"
      key={collection.id}
      to={`/collections/${collection.handle}`}
      prefetch="intent"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {collection.image ? (
          <Image
            alt={collection.image.altText || collection.title}
            aspectRatio="1/1"
            data={collection.image}
            loading={index < 6 ? 'eager' : undefined}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-lg tracking-tight">{collection.title}</h3>
      </div>
    </Link>
  );
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...Collection
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
` as const;
