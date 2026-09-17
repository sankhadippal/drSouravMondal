import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { faqsAPI } from '../../services/api';
import { FAQ } from '../../types';
import { cn } from '../../utils';

function FAQItem({ faq }: { faq: FAQ }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn(
      'border rounded-xl overflow-hidden transition-all duration-200',
      open ? 'border-teal-200 shadow-sm' : 'border-gray-200'
    )}>
      <button
        className="w-full flex items-start justify-between px-5 sm:px-6 py-4 sm:py-5 text-left
                   bg-white hover:bg-teal-50/50 transition-colors gap-3"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="font-medium text-gray-900 text-sm sm:text-base leading-snug flex-1">
          {faq.question}
        </span>
        <span className="flex-shrink-0 mt-0.5">
          {open
            ? <ChevronUp className="w-5 h-5 text-teal-700" />
            : <ChevronDown className="w-5 h-5 text-gray-400" />
          }
        </span>
      </button>

      <div className={cn(
        'overflow-hidden transition-all duration-300',
        open ? 'max-h-[600px]' : 'max-h-0'
      )}>
        <div className="px-5 sm:px-6 pb-5 text-gray-600 text-sm sm:text-base leading-relaxed
                        border-t border-gray-100 pt-4 bg-teal-50/20">
          {faq.answer}
        </div>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const [faqs, setFaqs]     = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    faqsAPI.getAll()
      .then(r => setFaqs(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const grouped = faqs.reduce<Record<string, FAQ[]>>((acc, f) => {
    const cat = f.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  return (
    <>
      <SEOHead
        title="FAQs - Sourav Homoeopathic Clinic"
        description="Frequently asked questions about appointments, online consultation, fees, chambers and homoeopathic treatment."
        url="/faq"
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-teal-900 to-teal-700 text-white py-12 sm:py-16">
        <div className="page-container">
          <p className="text-teal-300 font-medium mb-2 text-sm sm:text-base">Help Center</p>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-teal-200 text-sm sm:text-base max-w-xl">
            Find answers to common questions about consultations, appointments, and treatments.
          </p>
        </div>
      </div>

      {/* ── Content — properly centered with mx-auto ── */}
      <div className="page-container py-10 sm:py-16">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <LoadingSpinner size="lg" className="mx-auto py-16" />
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p>No FAQs available yet.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="mb-10">
                <h2 className="text-xs sm:text-sm font-semibold text-teal-700 uppercase tracking-wider mb-4 capitalize">
                  {cat.replace(/_/g, ' ')}
                </h2>
                <div className="space-y-3">
                  {items.map(f => <FAQItem key={f.id} faq={f} />)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
