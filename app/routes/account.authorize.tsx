import {redirect} from 'react-router';
import type {LoaderFunctionArgs} from '@shopify/hydrogen/oxygen';

/**
 * This route handles the Customer Account API authorization callback.
 * It's automatically called by Shopify after a customer authorizes their account.
 * The route redirects to the account page after successful authorization.
 */
export async function loader({context}: LoaderFunctionArgs) {
  // The Customer Account API authorization is handled automatically by Hydrogen
  // This route just needs to exist and redirect to the account page
  return redirect('/account');
}
