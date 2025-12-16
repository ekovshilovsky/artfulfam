import {useState} from 'react';
import {Button} from '../atoms/button';
import {Alert, AlertDescription} from '../atoms/alert';
import {FormField} from '../molecules/form-field';

interface EmailSignupFormProps {
  onSuccess?: (data: {email: string; isNewCustomer: boolean}) => void;
  isSubmitting?: boolean;
}

export function EmailSignupForm({
  onSuccess,
  isSubmitting = false,
}: EmailSignupFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      const response = await fetch('/api/customer-signup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to sign up');
        return;
      }

      onSuccess?.({email, isNewCustomer: data.isNewCustomer});
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        id="email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        required
      />
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Signing up...' : 'Notify Me'}
      </Button>
    </form>
  );
}
