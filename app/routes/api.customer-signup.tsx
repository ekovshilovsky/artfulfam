import {data} from 'react-router';
import type {ActionFunctionArgs} from '@shopify/hydrogen/oxygen';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const {email} = await request.json();

    if (!email || !email.includes('@')) {
      return data({error: 'Invalid email address'}, {status: 400});
    }

    const {env} = context;
    const adminToken = env.PRIVATE_ADMIN_API_TOKEN;
    const shopDomain = env.PUBLIC_STORE_DOMAIN;

    if (!adminToken || !shopDomain) {
      console.error('Missing Admin API credentials');
      return data({error: 'Server configuration error'}, {status: 500});
    }

    // Use Admin API to create customer with tags
    const adminResponse = await fetch(
      `https://${shopDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify({
          query: CUSTOMER_CREATE_MUTATION,
          variables: {
            input: {
              email,
              tags: ['coming-soon-signup'],
              emailMarketingConsent: {
                marketingState: 'SUBSCRIBED',
                marketingOptInLevel: 'SINGLE_OPT_IN',
              },
            },
          },
        }),
      },
    );

    const adminData = await adminResponse.json();

    if (adminData.errors) {
      console.error('Admin API errors:', adminData.errors);
      return data({error: 'Failed to sign up'}, {status: 500});
    }

    const userErrors = adminData.data?.customerCreate?.userErrors;
    if (userErrors?.length) {
      // Check if customer already exists
      const takenError = userErrors.find((err: any) => 
        err.message?.toLowerCase().includes('taken') || 
        err.message?.toLowerCase().includes('already')
      );
      
      if (takenError) {
        return data({
          success: true,
          isNewCustomer: false,
          message: 'Already signed up!',
        });
      }

      return data({error: userErrors[0].message}, {status: 400});
    }

    // Successfully created new customer
    return data({
      success: true,
      isNewCustomer: true,
      message: 'Successfully signed up!',
    });
  } catch (error) {
    console.error('Customer signup error:', error);
    return data({error: 'An unexpected error occurred'}, {status: 500});
  }
}

const CUSTOMER_CREATE_MUTATION = `
  mutation customerCreate($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
        tags
      }
      userErrors {
        field
        message
      }
    }
  }
`;
