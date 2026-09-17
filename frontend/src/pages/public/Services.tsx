import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, ArrowRight, Calendar } from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { servicesAPI } from '../../services/api';
import { Service } from '../../types';

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesAPI.getAll()
      .then(r => setServices(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <SEOHead
        title="Services & Treatments - Sourav Homoeopathic Clinic"
        description="Homoeopathic treatments for Cancer, Diabetes, Brain Tumor, Kidney Failure, Thalassemia, Arthritis, Skin Diseases and more by Dr. Sourav Kumar Mondal."
        url="/services"
      />

      <div className="bg-gradient-to-br from-teal-900 to-teal-700 text-white py-16">
        <div className="page-container">
          <p className="text-teal-300 font-medium mb-2">What We Treat</p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-3">Services & Treatments</h1>
          <p className="text-teal-200 max-w-xl leading-relaxed">
            Expert homoeopathic treatment for complex and chronic diseases using proven protocols.
          </p>
        </div>
      </div>

      <div className="page-container py-16">
        {loading ? (
          <LoadingSpinner size="lg" className="mx-auto py-16" text="Loading services..." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(service => (
              <div key={service.id} className="card-hover p-7 group">
                <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-teal-100 transition-colors">
                  <Stethoscope className="w-7 h-7 text-teal-700" />
                </div>
                <h3 className="font-heading font-bold text-lg text-gray-900 mb-3">{service.name}</h3>
                {service.description && (
                  <p className="text-gray-500 text-sm leading-relaxed mb-4">{service.description}</p>
                )}
                {service.consultation_info && (
                  <div className="bg-teal-50 rounded-lg px-4 py-3 text-sm text-teal-800 leading-relaxed">
                    {service.consultation_info}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link to="/appointment" className="btn-primary text-base px-10 py-3.5">
            <Calendar className="w-5 h-5" /> Book Your Consultation
          </Link>
        </div>
      </div>
    </>
  );
}
