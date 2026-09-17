import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { BookingFormData } from '../../../types';
import { cn, formatTime } from '../../../utils';

interface Props {
  form: BookingFormData;
  updateForm: (u: Partial<BookingFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface PatientFields {
  name: string; age: string; sex: string; mobile: string; email: string; address: string;
  reason: string; notes: string;
}

export default function Step5PatientInfo({ form, updateForm, onNext, onBack }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<PatientFields>({
    defaultValues: {
      ...form.patient,
      reason: form.reason,
      notes: form.notes,
    },
  });

  const onSubmit = (data: PatientFields) => {
    updateForm({
      patient: { name: data.name, age: data.age, sex: data.sex, mobile: data.mobile, email: data.email, address: data.address },
      reason: data.reason,
      notes: data.notes,
    });
    onNext();
  };

  const formattedDate = form.appointment_date
    ? new Date(form.appointment_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div>
      <h2 className="font-heading text-2xl font-bold text-gray-900 mb-2">Patient Information</h2>
      <p className="text-gray-500 mb-1">Please provide accurate details. Fields marked <span className="text-red-500">*</span> are required.</p>

      {/* Booking summary */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><p className="text-xs text-gray-500">Type</p><p className="font-semibold text-gray-800 capitalize">{form.consultation_type}</p></div>
          <div><p className="text-xs text-gray-500">Date</p><p className="font-semibold text-gray-800">{formattedDate}</p></div>
          <div><p className="text-xs text-gray-500">Time</p><p className="font-semibold text-gray-800">{formatTime(form.appointment_time)}</p></div>
          <div><p className="text-xs text-gray-500">Fee</p><p className="font-bold text-teal-700">₹{form.slot_fee}</p></div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid sm:grid-cols-2 gap-5">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="label">Full Name <span className="text-red-500">*</span></label>
            <input
              {...register('name', { required: 'Full name is required', minLength: { value: 2, message: 'Min 2 characters' }, maxLength: { value: 150, message: 'Max 150 characters' } })}
              className={cn('input-field', errors.name && 'input-error')}
              placeholder="Patient's full name"
            />
            {errors.name && <p className="error-msg">{errors.name.message}</p>}
          </div>

          {/* Age */}
          <div>
            <label className="label">Age <span className="text-red-500">*</span></label>
            <input
              {...register('age', {
                required: 'Age is required',
                min: { value: 0, message: 'Age must be 0 or above' },
                max: { value: 150, message: 'Invalid age' },
                validate: v => /^\d+$/.test(v) || 'Enter valid age',
              })}
              className={cn('input-field', errors.age && 'input-error')}
              placeholder="Age in years"
              type="number"
              min="0"
              max="150"
            />
            {errors.age && <p className="error-msg">{errors.age.message}</p>}
          </div>

          {/* Sex */}
          <div>
            <label className="label">Sex <span className="text-red-500">*</span></label>
            <select {...register('sex', { required: 'Please select sex' })} className={cn('input-field', errors.sex && 'input-error')}>
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.sex && <p className="error-msg">{errors.sex.message}</p>}
          </div>

          {/* Mobile */}
          <div>
            <label className="label">Mobile Number <span className="text-red-500">*</span></label>
            <input
              {...register('mobile', {
                required: 'Mobile number is required',
                pattern: { value: /^[6-9]\d{9}$/, message: 'Enter valid 10-digit Indian mobile number' },
              })}
              className={cn('input-field', errors.mobile && 'input-error')}
              placeholder="10-digit mobile number"
              type="tel"
              maxLength={10}
            />
            {errors.mobile && <p className="error-msg">{errors.mobile.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="label">Email Address</label>
            <input
              {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter valid email address' } })}
              className={cn('input-field', errors.email && 'input-error')}
              placeholder="your@email.com"
              type="email"
            />
            {errors.email && <p className="error-msg">{errors.email.message}</p>}
          </div>

          {/* Address */}
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <input
              {...register('address')}
              className="input-field"
              placeholder="Your full address (for medicine dispatch if online consultation)"
            />
          </div>

          {/* Reason */}
          <div className="sm:col-span-2">
            <label className="label">Reason for Consultation / Problem Description</label>
            <textarea
              {...register('reason')}
              className="input-field resize-none"
              rows={3}
              placeholder="Briefly describe your condition or reason for consultation..."
            />
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="label">Additional Notes</label>
            <textarea
              {...register('notes')}
              className="input-field resize-none"
              rows={2}
              placeholder="Any additional information (allergies, current medications, etc.)"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Your personal and health information is kept strictly confidential and used only for appointment purposes.
        </p>

        <div className="flex gap-3 justify-between pt-2">
          <button type="button" onClick={onBack} className="btn-secondary gap-2"><ChevronLeft className="w-4 h-4" /> Back</button>
          <button type="submit" className="btn-primary gap-2">Continue <ChevronRight className="w-4 h-4" /></button>
        </div>
      </form>
    </div>
  );
}
