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
  const [userEmail, setUserEmail] = useState('');

  const handleEmailSuccess = (data: {
    email: string;
    isNewCustomer: boolean;
  }) => {
    if (data.isNewCustomer) {
      setUserEmail(data.email);
      setShowSmsModal(true);
    }
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
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent px-4 py-2 rounded-full mb-6 animate-fade-in">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            <span className="text-sm font-medium">Art by Kids, For Everyone</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 font-display">ArtfulFam</h1>
          <p className="text-xl text-muted-foreground font-handwriting">
            Celebrating creativity, one masterpiece at a time
          </p>
        </div>

        {/* Coming Soon Card */}
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

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ArtfulFam. All rights reserved.
        </p>
      </div>

      {/* SMS Consent Modal */}
      <SmsConsentModal
        open={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        email={userEmail}
      />
    </div>
  );
}
