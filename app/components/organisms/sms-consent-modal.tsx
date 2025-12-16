import {useState, useEffect} from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../atoms/dialog';
import {Button} from '../atoms/button';
import {FormField} from '../molecules/form-field';
import {CheckboxField} from '../molecules/checkbox-field';
import {Alert, AlertDescription} from '../atoms/alert';

interface SmsConsentModalProps {
  open: boolean;
  onClose: () => void;
  email: string;
}

export function SmsConsentModal({open, onClose, email}: SmsConsentModalProps) {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle iOS keyboard viewport issues
  useEffect(() => {
    if (!open) return;

    const handleResize = () => {
      if (window.visualViewport) {
        const viewport = window.visualViewport;
        document.documentElement.style.height = `${viewport.height}px`;
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      handleResize();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      document.documentElement.style.height = '';
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone) {
      setError('Please enter a phone number');
      return;
    }

    if (!consent) {
      setError('Please consent to receive SMS messages');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/update-customer-sms', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, phone}),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update phone number');
        setIsSubmitting(false);
        return;
      }

      onClose();
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Stay Updated via SMS</DialogTitle>
          <DialogDescription className="text-base">
            Get notified when we launch! We'll send you a text message.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <FormField
            id="phone"
            label="Phone Number"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <CheckboxField
            id="sms-consent"
            label={
              <span className="text-sm leading-relaxed">
                I consent to receive SMS messages from ArtfulFam. Message and
                data rates may apply. Reply STOP to unsubscribe.
              </span>
            }
            checked={consent}
            onCheckedChange={setConsent}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1 h-11"
            >
              Skip
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !consent}
              className="flex-1 h-11"
            >
              {isSubmitting ? 'Updating...' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
