import {data, redirect, MetaFunction} from 'react-router';
import type {ActionFunctionArgs} from '@shopify/hydrogen/oxygen';
import {} from '@shopify/hydrogen/oxygen';;

export const meta: MetaFunction = () => {
  return [{title: 'Logout'}];
};

export async function loader() {
  return redirect('/account/login');
}

export async function action({request, context}: ActionFunctionArgs) {
  const {session} = context;
  session.unset('customerAccessToken');

  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  return redirect('/', {
    headers: {
      'Set-Cookie': await session.commit(),
    },
  });
}

export default function Logout() {
  return null;
}
