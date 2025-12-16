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

    const {storefront} = context;

    // Use Storefront API to create customer with marketing consent
    const {customerCreate} = await storefront.mutate(CUSTOMER_CREATE_MUTATION, {
      variables: {
        input: {
          email,
          acceptsMarketing: true,
        },
      },
    });

    // Check if customer already exists
    const existingCustomerError = customerCreate?.customerUserErrors?.find(
      (error) => error.code === 'TAKEN',
    );

    if (existingCustomerError) {
      // Customer already exists
      return data({
        success: true,
        isNewCustomer: false,
        message: 'Already signed up!',
      });
    }

    if (customerCreate?.customerUserErrors?.length) {
      const errorMessage =
        customerCreate.customerUserErrors[0].message ||
        'Failed to sign up';
      return data({error: errorMessage}, {status: 400});
    }

    // Successfully created new customer
    return data({
      success: true,
      isNewCustomer: true,
      customerId: customerCreate?.customer?.id,
      message: 'Successfully signed up!',
    });
  } catch (error) {
    console.error('Customer signup error:', error);
    return data({error: 'An unexpected error occurred'}, {status: 500});
  }
}

const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
        acceptsMarketing
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;
