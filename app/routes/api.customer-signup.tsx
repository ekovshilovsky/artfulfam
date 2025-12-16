import {json, type ActionFunctionArgs} from '@shopify/hydrogen/oxygen';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const {email} = await request.json();

    if (!email || !email.includes('@')) {
      return json({error: 'Invalid email address'}, {status: 400});
    }

    const {storefront} = context;

    // Try to create customer with coming-soon tag
    const {customerCreate} = await storefront.mutate(CUSTOMER_CREATE_MUTATION, {
      variables: {
        input: {
          email,
          tags: ['coming-soon-signup'],
        },
      },
    });

    // Check if customer already exists
    const existingCustomerError = customerCreate?.customerUserErrors?.find(
      (error) => error.code === 'TAKEN',
    );

    if (existingCustomerError) {
      // Customer already exists
      return json({
        success: true,
        isNewCustomer: false,
        message: 'Already signed up!',
      });
    }

    if (customerCreate?.customerUserErrors?.length) {
      const errorMessage =
        customerCreate.customerUserErrors[0].message ||
        'Failed to sign up';
      return json({error: errorMessage}, {status: 400});
    }

    // Successfully created new customer
    return json({
      success: true,
      isNewCustomer: true,
      message: 'Successfully signed up!',
    });
  } catch (error) {
    console.error('Customer signup error:', error);
    return json({error: 'An unexpected error occurred'}, {status: 500});
  }
}

const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation customerCreate($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;
