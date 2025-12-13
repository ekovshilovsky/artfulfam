export default function SmsTermsPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1>SMS Terms & Conditions</h1>

        <h2>ArtsyFam SMS Marketing Program</h2>

        <p>
          By providing your phone number and checking the SMS consent box, you agree to receive marketing and
          transactional text messages from ArtsyFam at the phone number provided. Consent is not a condition of
          purchase.
        </p>

        <h3>Message Frequency</h3>
        <p>
          Message frequency varies. You may receive up to 4 marketing messages per month and transactional messages
          related to your orders and account activity.
        </p>

        <h3>How to Opt Out</h3>
        <p>
          You can opt out of receiving SMS messages at any time by replying <strong>STOP</strong> to any message you
          receive from us. After opting out, you will receive one final confirmation message.
        </p>

        <h3>Help</h3>
        <p>
          For help or support, reply <strong>HELP</strong> to any message or contact us at{" "}
          <a href="mailto:support@artsyfam.com">support@artsyfam.com</a>.
        </p>

        <h3>Message & Data Rates</h3>
        <p>
          Message and data rates may apply. The number of messages you receive will depend on your activity and
          preferences.
        </p>

        <h3>Supported Carriers</h3>
        <p>
          This service is available on major carriers including AT&T, Verizon, T-Mobile, Sprint, and others. Carriers
          are not liable for delayed or undelivered messages.
        </p>

        <h3>Privacy</h3>
        <p>
          Your information will be handled in accordance with our Privacy Policy. We will never share your phone number
          with third parties for marketing purposes.
        </p>

        <h3>Changes to Terms</h3>
        <p>
          We reserve the right to modify these terms at any time. Continued participation in our SMS program after
          changes constitutes acceptance of the updated terms.
        </p>

        <p className="text-sm text-muted-foreground mt-8">Last updated: December 2024</p>
      </div>
    </div>
  )
}
