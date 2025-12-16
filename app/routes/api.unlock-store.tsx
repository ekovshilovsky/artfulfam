import {json, type ActionFunctionArgs} from '@shopify/hydrogen/oxygen';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const {password} = await request.json();

    if (!password) {
      return json({error: 'Password is required'}, {status: 400});
    }

    const {env, session} = context;
    const storePassword = env.STORE_PASSWORD;

    if (!storePassword) {
      // If no password is set, allow access
      return json({success: true});
    }

    if (password === storePassword) {
      // Set session flag
      session.set('store_access', 'granted');

      return json(
        {success: true},
        {
          headers: {
            'Set-Cookie': await session.commit(),
          },
        },
      );
    }

    return json({error: 'Incorrect password'}, {status: 401});
  } catch (error) {
    console.error('Store unlock error:', error);
    return json({error: 'An unexpected error occurred'}, {status: 500});
  }
}
