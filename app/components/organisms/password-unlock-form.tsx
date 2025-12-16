import {useState} from 'react';
import {Button} from '../atoms/button';
import {FormField} from '../molecules/form-field';

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        id="password"
        label="Store Password"
        type="password"
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={error}
        required
      />
      <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-base">
        {isSubmitting ? 'Unlocking...' : 'Unlock Store'}
      </Button>
    </form>
  );
}
