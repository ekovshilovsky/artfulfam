import {MetaFunction} from 'react-router';;
import {data} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';;
import { useLoaderData } from 'react-router';
import {Container} from '~/components/atoms/container';

export const meta: MetaFunction = ({data}) => {
  return [{title: `Hydrogen | ${data.page.title}`}];
};

export async function loader({params, context}: LoaderFunctionArgs) {
  if (!params.handle) {
    throw new Error('Missing page handle');
  }

  const {page} = await context.storefront.query(PAGE_QUERY, {
    variables: {
      handle: params.handle,
    },
  });

  if (!page) {
    throw new Response('Not Found', {status: 404});
  }

  return data({page});
}

export default function Page() {
  const {page} = useLoaderData<typeof loader>();

  return (
    <Container className="py-8 md:py-12">
      <div className="page">
        <header>
          <h1>{page.title}</h1>
        </header>
        <div dangerouslySetInnerHTML={{__html: page.body}} />
      </div>
    </Container>
  );
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const;
