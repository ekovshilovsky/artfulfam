import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';;

export async function loader({request}: LoaderFunctionArgs) {
  throw new Response(`${new URL(request.url).pathname} not found`, {
    status: 404,
  });
}
