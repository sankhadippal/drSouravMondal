import SEOHead from '../../../components/ui/SEOHead';
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mb-8"><h2 className="font-heading text-xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">{title}</h2><div className="text-gray-600 leading-relaxed space-y-3 text-sm">{children}</div></div>
);
export default function CancellationPolicy() {
  return (
    <>
      <SEOHead title="Cancellation & Refund Policy - Sourav Homoeopathic Clinic" url="/cancellation-policy" />
      <div className="bg-teal-900 text-white py-12"><div className="page-container"><h1 className="font-heading text-3xl font-bold">Cancellation & Refund Policy</h1><p className="text-teal-200 text-sm mt-2">Last updated: January 2025</p></div></div>
      <div className="page-container py-12 max-w-4xl">
        <Section title="Cancellation">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>More than 24 hours before appointment:</strong> Full refund eligible.</li>
            <li><strong>6–24 hours before appointment:</strong> 50% refund may be considered at discretion.</li>
            <li><strong>Less than 6 hours before appointment:</strong> No refund.</li>
            <li><strong>No-show:</strong> No refund.</li>
          </ul>
          <p>To cancel, contact us at 7810880949 or drsouravkumarmondal@gmail.com with your appointment number.</p>
        </Section>
        <Section title="Rescheduling">
          <p>Appointments can be rescheduled up to 24 hours before the scheduled time, subject to slot availability. One free reschedule per booking is permitted.</p>
        </Section>
        <Section title="Refund Process">
          <p>Eligible refunds are processed through Razorpay to the original payment method within 5–7 business days. Razorpay processing charges (if any) may be deducted from the refund amount.</p>
        </Section>
        <Section title="Exceptional Circumstances">
          <p>In case of doctor unavailability due to emergency, appointments will be rescheduled or fully refunded regardless of cancellation timing.</p>
        </Section>
        <Section title="Contact">
          <p>For cancellations/refunds: 7810880949 | <a href="mailto:drsouravkumarmondal@gmail.com" className="text-teal-600 underline">drsouravkumarmondal@gmail.com</a></p>
        </Section>
      </div>
    </>
  );
}
