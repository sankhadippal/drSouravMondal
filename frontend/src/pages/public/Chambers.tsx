import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Calendar, Navigation, IndianRupee } from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { chambersAPI } from '../../services/api';
import { Chamber } from '../../types';
import { formatTime, DAY_NAMES } from '../../utils';

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

function ChamberMap({ chamber }: { chamber: Chamber }) {
  if (!chamber.latitude || !chamber.longitude) return null;
  const query = encodeURIComponent(`${chamber.name}, ${chamber.address}, ${chamber.city}`);
  const embedUrl = MAPS_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${query}`
    : `https://maps.google.com/maps?q=${chamber.latitude},${chamber.longitude}&output=embed`;

  return (
    <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 h-40">
      <iframe
        title={`Map - ${chamber.name}`}
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

export default function Chambers() {
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chambersAPI.getAll()
      .then(r => setChambers(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <SEOHead
        title="Chamber Locations - Sourav Homoeopathic Clinic"
        description="Visit Dr. Sourav Kumar Mondal at chambers in Kolkata (Dhakuria), Mechogram, Debra and Fuleswar, West Bengal. Book appointment online."
        url="/chambers"
      />

      <div className="bg-gradient-to-br from-teal-900 to-teal-700 text-white py-16">
        <div className="page-container">
          <p className="text-teal-300 font-medium mb-2">Visit Us</p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-3">Chamber Locations</h1>
          <p className="text-teal-200 max-w-xl">
            Dr. Mondal conducts consultations at multiple locations across West Bengal. 
            Find the most convenient chamber near you.
          </p>
        </div>
      </div>

      <div className="page-container py-16">
        {loading ? (
          <LoadingSpinner size="lg" className="mx-auto py-16" text="Loading chambers..." />
        ) : chambers.length === 0 ? (
          <div className="text-center py-16 text-gray-500">No chambers available at the moment.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {chambers.map(chamber => {
              const availableDays = chamber.schedules?.filter(s => s.is_available) || [];
              return (
                <div key={chamber.id} className="card flex flex-col">
                  <div className="p-6 flex-1">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-5">
                      <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-teal-700" />
                      </div>
                      <div>
                        <h2 className="font-heading font-bold text-lg text-gray-900">{chamber.name}</h2>
                        <p className="text-teal-700 font-semibold text-sm flex items-center gap-1 mt-0.5">
                          <IndianRupee className="w-3.5 h-3.5" />
                          {chamber.consultation_fee} per consultation
                        </p>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-2.5 text-sm mb-5">
                      <div className="flex items-start gap-2.5 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="break-words min-w-0">{chamber.address}{chamber.area ? `, ${chamber.area}` : ''}, {chamber.city}, {chamber.state}{chamber.pincode ? ` - ${chamber.pincode}` : ''}</span>
                      </div>
                      {chamber.phone && (
                        <a href={`tel:${chamber.phone}`} className="flex items-center gap-2.5 text-gray-600 hover:text-teal-700 transition-colors">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{chamber.phone}</span>
                        </a>
                      )}
                    </div>

                    {/* Schedule */}
                    {availableDays.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                          <Clock className="w-3.5 h-3.5 inline mr-1" />Schedule
                        </p>
                        <div className="space-y-1.5">
                          {availableDays.map(s => (
                            <div key={s.day_of_week} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 font-medium min-w-[6rem]">{DAY_NAMES[s.day_of_week]}</span>
                              <span className="text-teal-700 font-medium">
                                {s.start_time ? formatTime(s.start_time) : ''} – {s.end_time ? formatTime(s.end_time) : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Map */}
                    <ChamberMap chamber={chamber} />
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-t border-gray-100 flex gap-2">
                    <Link
                      to={`/appointment?chamber=${chamber.id}&type=chamber`}
                      className="btn-primary flex-1 justify-center text-sm py-2.5"
                    >
                      <Calendar className="w-4 h-4" /> Book
                    </Link>
                    {chamber.google_maps_url ? (
                      <a
                        href={chamber.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline flex-1 justify-center text-sm py-2.5"
                      >
                        <Navigation className="w-4 h-4" /> Directions
                      </a>
                    ) : chamber.latitude && chamber.longitude ? (
                      <a
                        href={`https://maps.google.com/maps?q=${chamber.latitude},${chamber.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline flex-1 justify-center text-sm py-2.5"
                      >
                        <Navigation className="w-4 h-4" /> Directions
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
