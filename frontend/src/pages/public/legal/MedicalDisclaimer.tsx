import SEOHead from '../../../components/ui/SEOHead';
export default function MedicalDisclaimer() {
  return (
    <>
      <SEOHead title="Medical Disclaimer - Sourav Homoeopathic Clinic" url="/medical-disclaimer" />
      <div className="bg-teal-900 text-white py-12"><div className="page-container"><h1 className="font-heading text-3xl font-bold">Medical Disclaimer</h1></div></div>
      <div className="page-container py-12 max-w-4xl">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <p className="text-amber-800 font-semibold text-base">Please read this disclaimer carefully before using our services.</p>
        </div>
        <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
          <p>The information provided on this website and through our consultation services is for general informational and homoeopathic treatment purposes only. It is not intended as a substitute for professional medical advice, diagnosis, or treatment.</p>
          <p><strong className="text-gray-900">No claims of guaranteed cure:</strong> Sourav Homoeopathic Clinic does not claim to cure any disease guaranteed. Homoeopathic treatment outcomes depend on individual patient factors, disease stage, compliance with treatment, and other variables. Results vary by patient.</p>
          <p><strong className="text-gray-900">Complementary medicine:</strong> Homoeopathy is a complementary medical system. For serious or life-threatening conditions (including Cancer, Brain Tumor, Kidney Failure), please do not abandon conventional medical treatment. Always consult your allopathic physician alongside any complementary treatment.</p>
          <p><strong className="text-gray-900">Emergency situations:</strong> In case of a medical emergency, call your nearest emergency services or proceed to the nearest hospital immediately. Do not wait for an online consultation in emergencies.</p>
          <p><strong className="text-gray-900">Self-medication warning:</strong> Do not self-medicate with homoeopathic medicines without proper consultation. Proper case-taking and individualized prescription are essential for safe and effective homoeopathic treatment.</p>
          <p><strong className="text-gray-900">Jurisdiction:</strong> This website is intended for users in India. Medical regulations may vary by jurisdiction. Users outside India access this website at their own risk and are responsible for compliance with local laws.</p>
          <p>By using our services, you acknowledge that you have read and understood this disclaimer.</p>
        </div>
        <div className="mt-8 p-4 bg-teal-50 rounded-xl text-sm text-teal-800">
          <strong>Contact:</strong> For any questions: 7810880949 | <a href="mailto:drsouravkumarmondal@gmail.com" className="underline">drsouravkumarmondal@gmail.com</a>
        </div>
      </div>
    </>
  );
}
