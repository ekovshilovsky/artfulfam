import {MetaFunction} from 'react-router';;
import {data} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';;
import { Await, useLoaderData, Link } from 'react-router';
import {Suspense} from 'react';
import {Image, Money} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {Hero} from '~/components/Hero';
import {AboutSection} from '~/components/AboutSection';
import {Newsletter} from '~/components/Newsletter';

export const meta: MetaFunction = () => {
  return [{title: 'ArtfulFam | Kids Art Print on Demand'}];
};

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront} = context;
  const {collections} = await storefront.query(FEATURED_COLLECTION_QUERY);
  const featuredCollection = collections.nodes[0];
  const recommendedProducts = storefront.query(RECOMMENDED_PRODUCTS_QUERY);

  return {featuredCollection, recommendedProducts};
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  return (
    <main className="min-h-screen">
      <Hero />
      <RecommendedProducts products={data.recommendedProducts} />
      <AboutSection />
      <Newsletter />
    </main>
  );
}

function FeaturedCollection({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  const image = collection.image;
  return (
    <Link
      className="featured-collection"
      to={`/collections/${collection.handle}`}
    >
      {image && (
        <div className="featured-collection-image">
          <Image data={image} sizes="100vw" />
        </div>
      )}
      <h1>{collection.title}</h1>
    </Link>
  );
}

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery>;
}) {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 font-display">
            Featured Artwork
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Each piece is carefully selected and available on various products
          </p>
        </div>

        <Suspense fallback={
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        }>
          <Await resolve={products}>
            {({products}) => {
              if (products.nodes.length === 0) {
                return (
                  <div className="text-center py-12">
                    <p className="text-lg text-muted-foreground">
                      Check back soon for amazing artwork from our young artists!
                    </p>
                  </div>
                );
              }
              
              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.nodes.map((product) => (
                      <Link
                        key={product.id}
                        to={`/products/${product.handle}`}
                        className="group overflow-hidden border-2 border-border rounded-lg hover:border-primary transition-colors duration-300"
                      >
                        <div className="relative aspect-square overflow-hidden bg-muted">
                          {product.images.nodes[0] ? (
                            <Image
                              data={product.images.nodes[0]}
                              aspectRatio="1/1"
                              sizes="(min-width: 45em) 25vw, 50vw"
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-lg mb-1">{product.title}</h3>
                          <div className="flex items-center justify-between mt-3">
                            <span className="font-bold text-primary">
                              <Money data={product.priceRange.minVariantPrice} />
                            </span>
                            <span className="text-sm border border-current px-3 py-1 rounded-md group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                              View
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  <div className="text-center mt-12">
                    <Link
                      to="/collections"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors border border-input bg-transparent hover:bg-accent hover:text-accent-foreground h-12 px-8"
                    >
                      View All Artwork
                    </Link>
                  </div>
                </>
              );
            }}
          </Await>
        </Suspense>
      </div>
    </section>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 1) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;
