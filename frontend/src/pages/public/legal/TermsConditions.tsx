import SEOHead from '../../../components/ui/SEOHead';
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8"><h2 className="font-heading text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">{title}</h2><div className="text-gray-600 leading-relaxed space-y-3 text-sm">{children}</div></div>
);
export default function TermsConditions() {
  return (
    <>
      <SEOHead title="Terms & Conditions - Sourav Homoeopathic Clinic" url="/terms-conditions" />
      <div className="bg-teal-900 text-white py-12"><div className="page-container"><h1 className="font-heading text-3xl font-bold">Terms & Conditions</h1><p className="text-teal-200 text-sm mt-2">Last updated: January 2025</p></div></div>
      <div className="page-container py-12 max-w-4xl">
        <Section title="Acceptance of Terms">
          <p>By using the Sourav Homoeopathic Clinic website and services, you agree to these Terms and Conditions. If you do not agree, please do not use our services.</p>
        </Section>
        <Section title="Appointment Booking">
          <ul className="list-disc pl-5 space-y-1">
            <li>Appointment booking requires valid contact information and OTP verification.</li>
            <li>Payment must be completed for appointment confirmation.</li>
            <li>Selected time slots are temporarily reserved during the booking process.</li>
            <li>Appointments are confirmed only after successful payment verification on our backend.</li>
          </ul>
        </Section>
        <Section title="Payment Terms">
          <p>All payments are processed securely through Razorpay. Consultation fees are non-refundable except as stated in our Cancellation and Refund Policy. Currency: Indian Rupees (INR).</p>
        </Section>
        <Section title="User Responsibilities">
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide accurate and truthful information during booking.</li>
            <li>Attend appointments at the scheduled time or cancel/reschedule in advance.</li>
            <li>Do not misuse OTP or payment systems.</li>
          </ul>
        </Section>
        <Section title="Contact">
          <p>For questions: <a href="mailto:drsouravkumarmondal@gmail.com" className="text-teal-600 underline">drsouravkumarmondal@gmail.com</a> | 7810880949</p>
        </Section>
      </div>
    </>
  );
}
