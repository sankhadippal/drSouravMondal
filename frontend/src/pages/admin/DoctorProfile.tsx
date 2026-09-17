import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { DoctorProfile } from '../../types';
import { doctorAPI, getErrorMessage } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTANT: ALL helper components must be defined OUTSIDE AdminDoctorProfile.
// Defining them inside causes React to treat them as NEW component types on every
// re-render (every keystroke), unmounting + remounting inputs and losing focus.
// ═══════════════════════════════════════════════════════════════════════════════

interface FieldProps {
  label: string;
  field: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  profile: Partial<DoctorProfile>;
  onUpdate: (key: string, value: unknown) => void;
}

function TextField({ label, field, type = 'text', required, placeholder, profile, onUpdate }: FieldProps) {
  const raw = profile[field as keyof DoctorProfile];
  const value = raw === null || raw === undefined ? '' : String(raw);
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        className="input-field"
        onChange={e =>
          onUpdate(field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)
        }
      />
    </div>
  );
}

interface TextareaFieldProps {
  label: string;
  field: string;
  rows?: number;
  placeholder?: string;
  profile: Partial<DoctorProfile>;
  onUpdate: (key: string, value: unknown) => void;
  isArray?: boolean;
}

function TextareaField({
  label, field, rows = 4, placeholder, profile, onUpdate, isArray = false,
}: TextareaFieldProps) {
  const raw = profile[field as keyof DoctorProfile];
  const value = isArray
    ? (Array.isArray(raw) ? (raw as string[]).join('\n') : '')
    : (raw === null || raw === undefined ? '' : String(raw));

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isArray) {
      const arr = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
      onUpdate(field, arr);
    } else {
      onUpdate(field, e.target.value);
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        className="input-field resize-none"
        onChange={handleChange}
      />
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminDoctorProfile() {
  const [profile, setProfile] = useState<Partial<DoctorProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    doctorAPI.get()
      .then(r => setProfile(r.data.data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: unknown) =>
    setProfile(p => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await doctorAPI.update(profile as Record<string, unknown>);
      toast.success('Profile updated successfully');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" className="py-20 mx-auto" />;

  // Shared props — passed directly to TextField/TextareaField (no wrapper component)
  const fp = { profile, onUpdate: update };

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-xl font-bold text-gray-900">Doctor Profile</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary gap-2 text-sm py-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* ── Basic Information ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 text-base">Basic Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField {...fp} label="Full Name"           field="name"                required placeholder="Dr. Sourav Kumar Mondal" />
          <TextField {...fp} label="Title"               field="title"                          placeholder="Dr." />
          <TextField {...fp} label="Qualifications"      field="qualifications"       required placeholder="B.H.M.S. (WBUHS)" />
          <TextField {...fp} label="Registration Number" field="registration_number"            placeholder="Registration no." />
          <TextField {...fp} label="Specialization"      field="specialization"                 placeholder="Homoeopathy" />
          <TextField {...fp} label="Years of Experience" field="experience_years"     type="number" placeholder="10" />
          <TextField {...fp} label="Mobile"              field="mobile"                         placeholder="10-digit mobile" />
          <TextField {...fp} label="WhatsApp"            field="whatsapp"                       placeholder="10-digit WhatsApp" />
          <div className="sm:col-span-2">
            <TextField {...fp} label="Email" field="email" type="email" placeholder="doctor@email.com" />
          </div>
        </div>
      </div>

      {/* ── Biography ── */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 text-base mb-4">Professional Biography</h2>
        <TextareaField
          {...fp}
          label=""
          field="biography"
          rows={6}
          placeholder="Write a professional biography..."
        />
      </div>

      {/* ── Expertise & Credentials ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 text-base">Expertise &amp; Credentials</h2>
        <p className="text-xs text-gray-400">Enter each item on a separate line</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <TextareaField {...fp} label="Areas of Expertise"  field="expertise"      rows={4} placeholder="Cancer Treatment&#10;Kidney Failure&#10;..." isArray />
          <TextareaField {...fp} label="Certifications"      field="certifications" rows={4} placeholder="B.H.M.S. (WBUHS)&#10;..." isArray />
          <TextareaField {...fp} label="Awards & Recognition" field="awards"        rows={4} placeholder="One award per line..." isArray />
          <TextareaField {...fp} label="Memberships"         field="memberships"    rows={4} placeholder="One per line..." isArray />
          <TextareaField {...fp} label="Languages"           field="languages"      rows={3} placeholder="Bengali&#10;Hindi&#10;English" isArray />
        </div>
      </div>

      {/* ── Consultation Settings ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 text-base">Consultation Settings</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField
            {...fp}
            label="Online Consultation Fee (₹)"
            field="online_consultation_fee"
            type="number"
            placeholder="300"
          />
          <div className="flex items-center gap-3 pt-6">
            <input
              type="checkbox"
              id="online"
              checked={!!profile.is_available_online}
              onChange={e => update('is_available_online', e.target.checked)}
              className="w-4 h-4 accent-teal-600"
            />
            <label htmlFor="online" className="text-sm font-medium text-gray-700">
              Available for Online Consultation
            </label>
          </div>
        </div>
      </div>

      {/* ── SEO Settings ── */}
      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 text-base">SEO Settings</h2>
        <TextField
          {...fp}
          label="Meta Title"
          field="meta_title"
          placeholder="Dr. Sourav Kumar Mondal - Homoeopathic Physician"
        />
        <TextareaField
          {...fp}
          label="Meta Description"
          field="meta_description"
          rows={3}
          placeholder="SEO description (150–160 characters)"
        />
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary gap-2 px-8">
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

    </div>
  );
}
