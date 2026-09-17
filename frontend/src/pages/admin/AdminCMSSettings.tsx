import { useEffect, useState, useRef } from 'react';
import { Save, Upload, X, Image as ImageIcon, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI, mediaAPI, getErrorMessage } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { imgUrl } from '../../utils/imageUrl';

// ── Module-level input helpers (OUTSIDE component to prevent focus loss) ────
interface FieldProps {
  label: string; skey: string; settings: Record<string,string>;
  onChange: (k: string, v: string) => void;
  placeholder?: string; type?: string;
}
function Field({ label, skey, settings, onChange, placeholder, type = 'text' }: FieldProps) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <input type={type} value={settings[skey] || ''}
        onChange={e => onChange(skey, e.target.value)}
        className="input-field text-sm" placeholder={placeholder} />
    </div>
  );
}

interface TextareaFieldProps {
  label: string; skey: string; settings: Record<string,string>;
  onChange: (k: string, v: string) => void;
  placeholder?: string; rows?: number;
}
function TextareaField({ label, skey, settings, onChange, placeholder, rows = 3 }: TextareaFieldProps) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <textarea value={settings[skey] || ''} rows={rows}
        onChange={e => onChange(skey, e.target.value)}
        className="input-field resize-none text-sm" placeholder={placeholder} />
    </div>
  );
}

interface ToggleFieldProps {
  label: string; skey: string; settings: Record<string,string>;
  onChange: (k: string, v: string) => void; hint?: string;
}
function ToggleField({ label, skey, settings, onChange, hint }: ToggleFieldProps) {
  const on = settings[skey] !== 'false';
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
      <button type="button" onClick={() => onChange(skey, on ? 'false' : 'true')}
        className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-teal-600' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'hero',    label: '🏠 Hero / Header' },
  { key: 'about',   label: '👨‍⚕️ About Section' },
  { key: 'doctor',  label: '📸 Doctor Image' },
  { key: 'footer',  label: '🔗 Footer' },
  { key: 'gallery', label: '🖼 Gallery' },
  { key: 'reviews', label: '⭐ Reviews' },
  { key: 'general', label: '⚙️ General' },
];

export default function AdminCMSSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const [imgPreview, setImgPreview] = useState('');
  const [imgUploading, setImgUploading] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    settingsAPI.getAdmin()
      .then(r => { setSettings(r.data.data || {}); const url = r.data.data?.doctor_image_url; if (url) setImgPreview(imgUrl(url)); })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) =>
    setSettings(s => ({ ...s, [key]: value }));

  const fp = { settings, onChange: update };

  const save = async () => {
    setSaving(true);
    try { await settingsAPI.update(settings); toast.success('Settings saved'); }
    catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const uploadDoctorImg = async (file: File) => {
    setImgUploading(true);
    const fd = new FormData(); fd.append('image', file);
    try {
      const r = await mediaAPI.uploadDoctorImage(fd);
      const url = r.data.data.url;
      setSettings(s => ({ ...s, doctor_image_url: url }));
      setImgPreview(imgUrl(url));
      toast.success('Doctor image updated');
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setImgUploading(false); if (imgRef.current) imgRef.current.value = ''; }
  };

  if (loading) return <LoadingSpinner size="lg" className="py-20 mx-auto" />;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900">CMS Settings</h1>
          <p className="text-xs text-gray-400 mt-0.5">All content changes reflect instantly on the public website</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary gap-2 text-sm py-2">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save All'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === t.key ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>{t.label}
          </button>
        ))}
      </div>

      {/* ── Hero / Header ── */}
      {activeTab === 'hero' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Hero Section (Homepage Banner)</h2>
          <Field {...fp} label="Doctor Name" skey="hero_doctor_name" placeholder="Dr. Sourav Kumar Mondal" />
          <Field {...fp} label="Clinic Name" skey="hero_clinic_name" placeholder="Sourav Homoeopathic Clinic" />
          <Field {...fp} label="Badge Text (below logo)" skey="hero_badge_text" placeholder="Homoeopathic Physician · B.H.M.S. (WBUHS)" />
          <TextareaField {...fp} label="Hero Tagline / Description" skey="hero_tagline" rows={3} placeholder="Trained under..." />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field {...fp} label="Primary CTA Button Text" skey="hero_cta_primary" placeholder="Book Appointment" />
            <Field {...fp} label="Secondary CTA Button Text" skey="hero_cta_secondary" placeholder="Online Consultation" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field {...fp} label="Phone Number (Call/WhatsApp)" skey="hero_phone" placeholder="7810880949" />
            <Field {...fp} label="Online Availability Badge" skey="hero_online_badge" placeholder="Online Consultation Available" />
          </div>
          <hr className="border-gray-100" />
          <h2 className="font-semibold text-gray-800">Announcement Banner</h2>
          <ToggleField {...fp} label="Show Announcement Banner" skey="announcement_active" hint="Yellow bar at the top of every page" />
          <TextareaField {...fp} label="Announcement Text" skey="announcement_text" rows={2}
            placeholder="Online consultations available. Medicines dispatched via courier across India." />
        </div>
      )}

      {/* ── About Section ── */}
      {activeTab === 'about' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">About / Home Page Body</h2>
          <Field {...fp} label="Section Title" skey="about_title" placeholder="Expert Homoeopathic Care..." />
          <TextareaField {...fp} label="First Paragraph" skey="about_body" rows={4} placeholder="Dr. Sourav Kumar Mondal..." />
          <TextareaField {...fp} label="Second Paragraph" skey="about_body2" rows={4} placeholder="Specializing in..." />
          <div>
            <label className="label text-xs">Highlights List (one per line)</label>
            <textarea
              rows={5}
              value={(() => { try { return (JSON.parse(settings.about_highlights || '[]') as string[]).join('\n'); } catch { return ''; } })()}
              onChange={e => {
                const arr = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
                update('about_highlights', JSON.stringify(arr));
              }}
              className="input-field resize-none text-sm"
              placeholder={"Trained under Dr. Prasanta Banerji\nB.H.M.S. from WBUHS"}
            />
            <p className="text-xs text-gray-400 mt-1">Each line becomes a bullet point with a tick icon</p>
          </div>
        </div>
      )}

      {/* ── Doctor Image ── */}
      {activeTab === 'doctor' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-800">Doctor Profile Photo</h2>
          <p className="text-sm text-gray-500">Upload the doctor's photo. It appears in the hero section on the homepage and the About page.</p>

          {/* Current image preview */}
          {imgPreview ? (
            <div className="relative w-48 h-56 rounded-2xl overflow-hidden border-2 border-teal-200 shadow-md">
              <img src={imgPreview} alt="Doctor" className="w-full h-full object-cover object-top" />
              <button
                onClick={() => { setImgPreview(''); update('doctor_image_url', ''); }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Current</div>
            </div>
          ) : (
            <div className="w-48 h-56 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
              <ImageIcon className="w-10 h-10 mb-2 text-gray-300" />
              <p className="text-xs">No image set</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => imgRef.current?.click()} disabled={imgUploading}
              className="btn-primary gap-2 text-sm py-2 disabled:opacity-60">
              {imgUploading ? 'Uploading…' : <><Upload className="w-4 h-4" /> Upload New Photo</>}
            </button>
            {imgPreview && (
              <a href={imgPreview} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm py-2 gap-2">
                <Eye className="w-4 h-4" /> Preview
              </a>
            )}
          </div>
          <input ref={imgRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadDoctorImg(f); }} />

          <p className="text-xs text-gray-400">Recommended: portrait photo, min 400×500px, JPEG/PNG/WebP, max 8MB</p>
        </div>
      )}

      {/* ── Footer ── */}
      {activeTab === 'footer' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Footer Content</h2>
          <TextareaField {...fp} label="About Clinic Text" skey="footer_about_text" rows={3}
            placeholder="Expert homoeopathic care for complex and chronic diseases..." />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field {...fp} label="Phone Number" skey="footer_phone" placeholder="7810880949" />
            <Field {...fp} label="Email Address" skey="footer_email" placeholder="drsouravkumarmondal@gmail.com" />
          </div>
          <Field {...fp} label="Copyright Text" skey="footer_copyright"
            placeholder="Sourav Homoeopathic Clinic. All rights reserved." />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field {...fp} label="Contact Address" skey="contact_address" placeholder="Kolkata (Dhakuria), West Bengal" />
            <Field {...fp} label="WhatsApp Number" skey="contact_whatsapp" placeholder="7810880949" />
          </div>
        </div>
      )}

      {/* ── Gallery Settings ── */}
      {activeTab === 'gallery' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Gallery Section</h2>
          <ToggleField {...fp} label="Show Gallery Section" skey="gallery_enabled"
            hint="Auto-scrolling image strip above the footer" />
          <Field {...fp} label="Section Title" skey="gallery_section_title" placeholder="Our Clinic Gallery" />
          <Field {...fp} label="Section Subtitle" skey="gallery_section_subtitle"
            placeholder="A glimpse of our clinic and happy patients" />
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-800">
            <p className="font-medium mb-1">To add/remove images:</p>
            <p>Go to <strong>Admin → Gallery</strong> page to upload photos and manage the gallery.</p>
          </div>
        </div>
      )}

      {/* ── Reviews Settings ── */}
      {activeTab === 'reviews' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Patient Reviews Section</h2>
          <ToggleField {...fp} label="Show Reviews Section" skey="reviews_enabled"
            hint="Display approved reviews on the homepage" />
          <ToggleField {...fp} label="Allow Public Review Submission" skey="reviews_allow_submit"
            hint="Show 'Share Your Experience' form on the public website" />
          <Field {...fp} label="Section Title" skey="reviews_section_title" placeholder="What Our Patients Say" />
          <Field {...fp} label="Section Subtitle" skey="reviews_section_subtitle"
            placeholder="Real experiences from our patients across India" />
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-800">
            <p className="font-medium mb-1">Review moderation:</p>
            <p>Submitted reviews are <strong>pending</strong> by default. Go to <strong>Admin → Reviews</strong> to approve/reject them. Only approved reviews show on the public site.</p>
          </div>
        </div>
      )}

      {/* ── General ── */}
      {activeTab === 'general' && (
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">General Settings</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field {...fp} label="Site Name" skey="site_name" placeholder="Sourav Homoeopathic Clinic" />
            <Field {...fp} label="Site Tagline" skey="site_tagline" placeholder="Expert Homoeopathic Care" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field {...fp} label="Contact Phone" skey="contact_phone" placeholder="7810880949" />
            <Field {...fp} label="Contact Email" skey="contact_email" placeholder="drsouravkumarmondal@gmail.com" />
          </div>
          <hr className="border-gray-100" />
          <h3 className="font-semibold text-gray-700 text-sm">SEO</h3>
          <Field {...fp} label="Meta Title" skey="meta_title" placeholder="Dr. Sourav Kumar Mondal — Homoeopathic Physician" />
          <TextareaField {...fp} label="Meta Description" skey="meta_description" rows={2}
            placeholder="Expert Homoeopathic treatment for Cancer, Diabetes..." />
          <hr className="border-gray-100" />
          <h3 className="font-semibold text-gray-700 text-sm">Appointments</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field {...fp} label="Advance Booking Days" skey="booking_advance_days" type="number" placeholder="30" />
            <Field {...fp} label="Default Slot Duration (min)" skey="default_slot_duration" type="number" placeholder="15" />
          </div>
          <TextareaField {...fp} label="Cancellation Policy" skey="cancellation_policy" rows={2}
            placeholder="Appointments cancelled 24+ hours in advance are eligible for full refund." />
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary gap-2 px-8">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
