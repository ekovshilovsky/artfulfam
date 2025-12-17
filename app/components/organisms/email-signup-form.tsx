import {useState} from 'react';

interface EmailSignupFormProps {
  onSuccess?: (data: {
    email: string;
    isNewCustomer: boolean;
    smsEnabled: boolean;
    collectPhone: boolean;
    signupToken: string;
  }) => void;
}

export function EmailSignupForm({onSuccess}: EmailSignupFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/customer-signup', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      });

      const data = (await response.json()) as {
        success?: boolean;
        isNewCustomer?: boolean;
        smsEnabled?: boolean;
        collectPhone?: boolean;
        signupToken?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error || 'Failed to sign up');
        setIsSubmitting(false);
        return;
      }

      // Pass result to parent - parent handles the next step
      onSuccess?.({
        email,
        isNewCustomer: data.isNewCustomer ?? false,
        smsEnabled: data.smsEnabled ?? false,
        collectPhone: data.collectPhone ?? false,
        signupToken: data.signupToken ?? '',
      });

      setIsSubmitting(false);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div className="space-y-2">
        <input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
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
