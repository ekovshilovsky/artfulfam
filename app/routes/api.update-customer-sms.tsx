import {json, type ActionFunctionArgs} from '@shopify/hydrogen/oxygen';

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({error: 'Method not allowed'}, {status: 405});
  }

  try {
    const {email, phone} = await request.json();

    if (!email || !phone) {
      return json({error: 'Email and phone are required'}, {status: 400});
    }

    const {env, storefront} = context;

    // First, find the customer by email using Storefront API
    const {customers} = await storefront.query(CUSTOMER_QUERY, {
      variables: {query: `email:${email}`},
    });

    if (!customers?.edges?.length) {
      return json({error: 'Customer not found'}, {status: 404});
    }

    const customerId = customers.edges[0].node.id;

    // Use Admin API to update customer phone
    const adminToken = env.PRIVATE_ADMIN_API_TOKEN;
    const shopDomain = env.PUBLIC_STORE_DOMAIN;

    if (!adminToken || !shopDomain) {
      console.error('Missing Admin API credentials');
      return json({error: 'Server configuration error'}, {status: 500});
    }

    const adminResponse = await fetch(
      `https://${shopDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify({
          query: CUSTOMER_UPDATE_MUTATION,
          variables: {
            input: {
              id: customerId,
              phone,
            },
          },
        }),
      },
    );

    const adminData = await adminResponse.json();

    if (adminData.errors) {
      console.error('Admin API errors:', adminData.errors);
      return json(
        {error: 'Failed to update customer phone'},
        {status: 500},
      );
    }

    if (adminData.data?.customerUpdate?.userErrors?.length) {
      const errorMessage = adminData.data.customerUpdate.userErrors[0].message;
      return json({error: errorMessage}, {status: 400});
    }

    return json({
      success: true,
      message: 'Phone number updated successfully',
    });
  } catch (error) {
    console.error('Update customer SMS error:', error);
    return json({error: 'An unexpected error occurred'}, {status: 500});
  }
}

const CUSTOMER_QUERY = `#graphql
  query getCustomerByEmail($query: String!) {
    customers(first: 1, query: $query) {
      edges {
        node {
          id
          email
        }
      }
    }
  }
` as const;

const CUSTOMER_UPDATE_MUTATION = `
  mutation customerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        id
        phone
      }
      userErrors {
        field
        message
      }
    }
  }
`;
