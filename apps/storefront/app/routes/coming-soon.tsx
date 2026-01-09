import {useState} from 'react';
import {EmailSignupForm} from '~/components/organisms/email-signup-form';
import {PasswordUnlockForm} from '~/components/organisms/password-unlock-form';
import {SmsConsentModal} from '~/components/organisms/sms-consent-modal';

// Skip layout entirely for coming soon page
export const handle = {
  skipLayout: true,
};

export const meta = () => {
  return [
    {httpEquiv: 'Cache-Control', content: 'no-cache, no-store, must-revalidate'},
    {httpEquiv: 'Pragma', content: 'no-cache'},
    {httpEquiv: 'Expires', content: '0'},
  ];
};

export default function ComingSoon() {
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [signupToken, setSignupToken] = useState('');

  const handleEmailSuccess = (data: {
    email: string;
    isNewCustomer: boolean;
    smsEnabled: boolean;
    collectPhone: boolean;
    signupToken: string;
  }) => {
    setUserEmail(data.email);
    setSignupToken(data.signupToken);

    if (data.collectPhone) {
      // New customer: show SMS modal first, thank you after modal closes
      setShowSmsModal(true);
    } else {
      // Existing customer: skip SMS modal, show thank you directly
      setShowThankYou(true);
    }
  };

  const handleSmsModalClose = () => {
    setShowSmsModal(false);
    // After SMS modal closes (submit or skip), show thank you
    setShowThankYou(true);
  };

  const handlePasswordSuccess = () => {
    window.location.href = '/';
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-y-auto" style={{background: 'linear-gradient(to bottom right, var(--secondary), var(--background), var(--muted))'}}>
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-accent/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}} />
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-secondary/30 rounded-full blur-2xl animate-pulse" style={{animationDelay: '0.5s'}} />
      
      <div className="max-w-2xl w-full mx-auto px-4 py-8 space-y-8 relative z-10">
        {/* Logo/Branding */}
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 font-display">ArtfulFam</h1>
          <p className="text-xl text-muted-foreground font-handwriting">
            Celebrating creativity, one masterpiece at a time
          </p>
        </div>

        {/* Coming Soon Card or Thank You */}
        {showThankYou ? (
          <div className="bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-2xl shadow-xl p-8 md:p-10 space-y-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-foreground/20 mb-2">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold font-display">Thank You!</h2>
              <p className="text-lg opacity-90 leading-relaxed">
                We'll let you know when our store opens up. Stay tuned for something special!
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-2xl shadow-xl p-8 md:p-10 space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold font-display">Coming Soon</h2>
              <p className="text-lg opacity-90 leading-relaxed">
                We're working hard to bring you something special. Sign up to be
                notified when we launch!
              </p>
            </div>

            <EmailSignupForm onSuccess={handleEmailSuccess} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary-foreground/20" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-gradient-to-br from-primary to-accent opacity-90">
                  Already have access?
                </span>
              </div>
            </div>

            <PasswordUnlockForm onSuccess={handlePasswordSuccess} />
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ArtfulFam. All rights reserved.
        </p>
      </div>

      {/* SMS Consent Modal - only shown for new customers */}
      <SmsConsentModal
        open={showSmsModal}
        onClose={handleSmsModalClose}
        email={userEmail}
        signupToken={signupToken}
      />
    </div>
  );
}
