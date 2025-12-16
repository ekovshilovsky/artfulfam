import {useState} from 'react';

interface PasswordUnlockFormProps {
  onSuccess?: () => void;
  isSubmitting?: boolean;
}

export function PasswordUnlockForm({
  onSuccess,
  isSubmitting = false,
}: PasswordUnlockFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter a password');
      return;
    }

    try {
      const response = await fetch('/api/unlock-store', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({password}),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Incorrect password');
        return;
      }

      onSuccess?.();
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <div className="space-y-2">
        <input
          id="password"
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="bg-background text-foreground border-0 h-12 w-full rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-primary-foreground"
        />
        {error && <p className="text-sm text-destructive-foreground bg-destructive/20 px-3 py-2 rounded-md">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 px-8 rounded-md bg-secondary text-secondary-foreground font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50"
      >
        {isSubmitting ? 'Unlocking...' : 'Unlock Store'}
      </button>
    </form>
  );
}
