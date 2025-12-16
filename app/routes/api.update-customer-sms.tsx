import {data} from 'react-router';
import type {ActionFunctionArgs} from '@shopify/hydrogen/oxygen';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const {email, phone} = await request.json();

    if (!email || !phone) {
      return data({error: 'Email and phone are required'}, {status: 400});
    }

    // TODO: Add Admin API token to actually update phone
    // For now, just log it and return success
    console.log(`Phone number collected for ${email}: ${phone}`);

    return data({
      success: true,
      message: 'Thank you! We\'ll contact you when we launch.',
    });
  } catch (error) {
    console.error('Update customer SMS error:', error);
    return data({error: 'An unexpected error occurred'}, {status: 500});
  }
}

// Note: Phone numbers are logged but not stored in Shopify
// To actually store phone numbers, you'll need to:
// 1. Create a legacy custom app in Shopify admin
// 2. Add PRIVATE_ADMIN_API_TOKEN to .env and Oxygen
// 3. Uncomment the Admin API code above
