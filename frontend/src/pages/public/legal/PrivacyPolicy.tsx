import SEOHead from '../../../components/ui/SEOHead';
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8">
    <h2 className="font-heading text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">{title}</h2>
    <div className="text-gray-600 leading-relaxed space-y-3 text-sm">{children}</div>
  </div>
);
export default function PrivacyPolicy() {
  return (
    <>
      <SEOHead title="Privacy Policy - Sourav Homoeopathic Clinic" url="/privacy-policy" />
      <div className="bg-teal-900 text-white py-12"><div className="page-container"><h1 className="font-heading text-3xl font-bold">Privacy Policy</h1><p className="text-teal-200 text-sm mt-2">Last updated: January 2025</p></div></div>
      <div className="page-container py-12 max-w-4xl">
        <Section title="Introduction">
          <p>Sourav Homoeopathic Clinic ("we", "our", "us") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our website and services.</p>
        </Section>
        <Section title="Information We Collect">
          <p><strong>Information you provide:</strong> Name, age, sex, mobile number, email address, address, and health-related information when booking appointments or contacting us.</p>
          <p><strong>Payment information:</strong> We use Razorpay for payment processing. We do not store credit/debit card details. Razorpay's privacy policy applies to payment data.</p>
          <p><strong>Technical information:</strong> We collect anonymized visit data (device type, browser, pages visited) to improve our website. IP addresses are stored in hashed form only.</p>
        </Section>
        <Section title="How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1">
            <li>To process and confirm appointment bookings</li>
            <li>To send appointment confirmations and reminders</li>
            <li>To respond to your contact messages and queries</li>
            <li>To process payments and issue receipts</li>
            <li>To improve our website and services</li>
            <li>To comply with legal obligations</li>
          </ul>
        </Section>
        <Section title="Patient Data Confidentiality">
          <p>Patient information, including health-related data, is treated with the highest level of confidentiality. This information is accessed only by authorized medical personnel and is never shared with third parties except as required by law.</p>
        </Section>
        <Section title="Data Retention">
          <p>We retain patient records for the period required by applicable medical record regulations in India. Appointment and payment records are retained for accounting and legal compliance purposes. You may request deletion of non-essential data by contacting us.</p>
        </Section>
        <Section title="Your Rights">
          <p>You have the right to access, correct, or request deletion of your personal data. Contact us at 7810880949 or drsouravkumarmondal@gmail.com to exercise these rights.</p>
        </Section>
        <Section title="Contact">
          <p>For privacy concerns: <a href="mailto:drsouravkumarmondal@gmail.com" className="text-teal-600 underline">drsouravkumarmondal@gmail.com</a> | 7810880949</p>
        </Section>
      </div>
    </>
  );
}
