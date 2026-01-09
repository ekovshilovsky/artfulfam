import {data} from 'react-router';
import type {ActionFunctionArgs} from '@shopify/hydrogen/oxygen';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const {password} = await request.json();

    if (!password) {
      return data({error: 'Password is required'}, {status: 400});
    }

    const {env, session} = context;
    const storePassword = env.STORE_PASSWORD;

    if (!storePassword) {
      // If no password is set, allow access
      return data({success: true});
    }

    if (password === storePassword) {
      // Set session flag
      session.set('store_access', 'granted');

      return data(
        {success: true},
        {
          headers: {
            'Set-Cookie': await session.commit(),
          },
        },
      );
    }

    return data({error: 'Incorrect password'}, {status: 401});
  } catch (error) {
    console.error('Store unlock error:', error);
    return data({error: 'An unexpected error occurred'}, {status: 500});
  }
}
