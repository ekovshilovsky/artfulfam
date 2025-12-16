import {useState} from 'react';

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
      <div className="space-y-2">
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-background text-foreground border-0 h-12 w-full rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-primary-foreground"
        />
        {error && <p className="text-sm text-destructive-foreground bg-destructive/20 px-3 py-2 rounded-md">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 px-8 rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Signing up...' : 'Notify Me'}
      </button>
    </form>
  );
}
