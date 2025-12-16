import {useState} from 'react';
import {EmailSignupForm} from '~/components/organisms/email-signup-form';
import {PasswordUnlockForm} from '~/components/organisms/password-unlock-form';
import {SmsConsentModal} from '~/components/organisms/sms-consent-modal';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo/Branding */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">ArtfulFam</h1>
          <p className="text-lg text-gray-600">
            Celebrating creativity, one masterpiece at a time
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Coming Soon</h2>
            <p className="text-gray-600">
              We're working hard to bring you something special. Sign up to be
              notified when we launch!
            </p>
          </div>

          <EmailSignupForm onSuccess={handleEmailSuccess} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Already have access?
              </span>
            </div>
          </div>

          <PasswordUnlockForm onSuccess={handlePasswordSuccess} />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
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
