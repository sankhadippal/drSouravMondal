import { useEffect, useState } from 'react';
import { Star, Send, User, MapPin, Stethoscope, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { reviewsAPI, settingsAPI } from '../../services/api';
import { cn } from '../../utils';

interface Review {
  id: string;
  patient_name: string;
  patient_location?: string;
  rating: number;
  review_text: string;
  treatment_for?: string;
  is_featured: boolean;
  created_at: string;
}

interface Stats {
  total: string;
  avg_rating: string;
  five_star: string;
}

interface SubmitForm {
  patient_name: string;
  patient_location: string;
  rating: string;
  review_text: string;
  treatment_for: string;
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={cn(sz, s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200')} />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button"
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="focus:outline-none"
          aria-label={`${s} star`}
        >
          <Star className={cn('w-8 h-8 transition-colors',
            s <= (hover || value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
          )} />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-sm text-gray-500 font-medium">
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value]}
        </span>
      )}
    </div>
  );
}

export default function ReviewsSection() {
  const [reviews, setReviews]   = useState<Review[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [title, setTitle]       = useState('What Our Patients Say');
  const [subtitle, setSubtitle] = useState('Real experiences from our patients across India');
  const [enabled, setEnabled]   = useState(true);
  const [allowSubmit, setAllowSubmit] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [rating, setRating]     = useState(5);
  const CARDS_PER_PAGE = 3;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SubmitForm>({
    defaultValues: { rating: '5' },
  });

  useEffect(() => {
    reviewsAPI.getAll().then(r => setReviews(r.data.data || [])).catch(() => {});
    reviewsAPI.getStats().then(r => setStats(r.data.data)).catch(() => {});
    settingsAPI.getPublic().then(r => {
      const s = r.data.data || {};
      if (s.reviews_section_title)    setTitle(s.reviews_section_title);
      if (s.reviews_section_subtitle) setSubtitle(s.reviews_section_subtitle);
      if (s.reviews_enabled === 'false')      setEnabled(false);
      if (s.reviews_allow_submit === 'false') setAllowSubmit(false);
    }).catch(() => {});
  }, []);

  const totalPages = Math.ceil(reviews.length / CARDS_PER_PAGE);
  const visibleReviews = reviews.slice(currentPage * CARDS_PER_PAGE, (currentPage + 1) * CARDS_PER_PAGE);

  const onSubmit = async (data: SubmitForm) => {
    if (rating === 0) { toast.error('Please select a star rating'); return; }
    setSubmitting(true);
    try {
      await reviewsAPI.submit({
        patient_name: data.patient_name,
        patient_location: data.patient_location || undefined,
        rating,
        review_text: data.review_text,
        treatment_for: data.treatment_for || undefined,
      });
      setSubmitted(true);
      setShowForm(false);
      reset();
      setRating(5);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!enabled) return null;

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="page-container">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-teal-700 font-semibold text-xs sm:text-sm uppercase tracking-wider mb-2">
            Patient Testimonials
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            {title}
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-sm sm:text-base">{subtitle}</p>

          {/* Stats bar */}
          {stats && parseInt(stats.total) > 0 && (
            <div className="inline-flex items-center gap-6 mt-5 bg-teal-50 rounded-2xl px-6 py-3 flex-wrap justify-center gap-y-2">
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(parseFloat(stats.avg_rating || '0'))} />
                <span className="font-bold text-teal-700 text-lg">{parseFloat(stats.avg_rating || '0').toFixed(1)}</span>
                <span className="text-gray-500 text-sm">avg rating</span>
              </div>
              <div className="w-px h-5 bg-teal-200 hidden sm:block" />
              <span className="text-gray-600 text-sm">
                <strong className="text-teal-700">{stats.total}</strong> patient reviews
              </span>
              <div className="w-px h-5 bg-teal-200 hidden sm:block" />
              <span className="text-gray-600 text-sm">
                <strong className="text-teal-700">{stats.five_star}</strong> ★★★★★ reviews
              </span>
            </div>
          )}
        </div>

        {/* Review cards */}
        {reviews.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {visibleReviews.map(review => (
                <div key={review.id}
                  className={cn('relative bg-white rounded-2xl p-6 shadow-card border transition-all duration-200',
                    review.is_featured ? 'border-teal-200 bg-teal-50/30' : 'border-gray-100'
                  )}
                >
                  {review.is_featured && (
                    <div className="absolute -top-2.5 left-5">
                      <span className="bg-teal-700 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        ⭐ Featured
                      </span>
                    </div>
                  )}

                  {/* Quote icon */}
                  <Quote className="w-8 h-8 text-teal-100 mb-3 fill-teal-100" />

                  {/* Stars */}
                  <StarRating rating={review.rating} />

                  {/* Text */}
                  <p className="text-gray-700 text-sm leading-relaxed mt-3 mb-4 line-clamp-4">
                    "{review.review_text}"
                  </p>

                  {/* Treatment for */}
                  {review.treatment_for && (
                    <div className="flex items-center gap-1.5 text-xs text-teal-700 bg-teal-50 px-3 py-1 rounded-full w-fit mb-3">
                      <Stethoscope className="w-3 h-3" />
                      {review.treatment_for}
                    </div>
                  )}

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                    <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-teal-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{review.patient_name}</p>
                      {review.patient_location && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {review.patient_location}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mb-8">
                <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-500">
                  {currentPage + 1} / {totalPages}
                </span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10 text-gray-400 mb-8">
            <Star className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p>Be the first to share your experience!</p>
          </div>
        )}

        {/* Submit review */}
        {allowSubmit && (
          <div className="max-w-2xl mx-auto">
            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-7 h-7 text-green-600 fill-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Thank you for your review!</h3>
                <p className="text-gray-500 text-sm">
                  Your review has been submitted and is pending approval. It will appear once approved.
                </p>
                <button onClick={() => setSubmitted(false)} className="btn-outline mt-4 text-sm py-2">
                  Submit Another Review
                </button>
              </div>
            ) : !showForm ? (
              <div className="text-center">
                <button onClick={() => setShowForm(true)}
                  className="btn-primary gap-2 px-8 py-3">
                  <Star className="w-4 h-4 fill-current" />
                  Share Your Experience
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Reviews are moderated and appear after approval
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading text-lg font-bold text-gray-900">Share Your Experience</h3>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  {/* Star rating picker */}
                  <div>
                    <label className="label">Your Rating <span className="text-red-500">*</span></label>
                    <StarPicker value={rating} onChange={setRating} />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Your Name <span className="text-red-500">*</span></label>
                      <input
                        {...register('patient_name', { required: 'Name required', minLength: { value: 2, message: 'Min 2 chars' } })}
                        className={cn('input-field', errors.patient_name && 'input-error')}
                        placeholder="e.g. Ravi Kumar"
                      />
                      {errors.patient_name && <p className="error-msg">{errors.patient_name.message}</p>}
                    </div>
                    <div>
                      <label className="label">Location</label>
                      <input
                        {...register('patient_location')}
                        className="input-field"
                        placeholder="e.g. Kolkata, West Bengal"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Treatment / Condition</label>
                    <input
                      {...register('treatment_for')}
                      className="input-field"
                      placeholder="e.g. Diabetes, Arthritis, Skin Disease..."
                    />
                  </div>

                  <div>
                    <label className="label">Your Review <span className="text-red-500">*</span></label>
                    <textarea
                      {...register('review_text', {
                        required: 'Review required',
                        minLength: { value: 20, message: 'Min 20 characters' },
                        maxLength: { value: 2000, message: 'Max 2000 characters' },
                      })}
                      className={cn('input-field resize-none', errors.review_text && 'input-error')}
                      rows={4}
                      placeholder="Share your experience with Dr. Sourav Kumar Mondal's treatment..."
                    />
                    {errors.review_text && <p className="error-msg">{errors.review_text.message}</p>}
                  </div>

                  <p className="text-xs text-gray-400">
                    Your review will be visible after admin approval. Please be honest and respectful.
                  </p>

                  <button type="submit" disabled={submitting}
                    className="btn-primary w-full justify-center py-3 gap-2">
                    {submitting ? 'Submitting…' : <><Send className="w-4 h-4" /> Submit Review</>}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
