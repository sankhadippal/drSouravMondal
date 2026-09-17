import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI, getErrorMessage } from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const SECTIONS = [
  { key: 'general', label: 'General', fields: [
    { key: 'site_name', label: 'Website Name', type: 'text' },
    { key: 'site_tagline', label: 'Tagline', type: 'text' },
    { key: 'contact_phone', label: 'Contact Phone', type: 'text' },
    { key: 'contact_whatsapp', label: 'WhatsApp Number', type: 'text' },
    { key: 'contact_email', label: 'Contact Email', type: 'email' },
    { key: 'contact_address', label: 'Address', type: 'text' },
    { key: 'announcement_text', label: 'Announcement Banner Text', type: 'text' },
    { key: 'announcement_active', label: 'Show Announcement Banner', type: 'checkbox' },
  ]},
  { key: 'appointment', label: 'Appointment', fields: [
    { key: 'default_slot_duration', label: 'Default Slot Duration (minutes)', type: 'number' },
    { key: 'booking_advance_days', label: 'Advance Booking Days', type: 'number' },
    { key: 'cancellation_policy', label: 'Cancellation Policy', type: 'textarea' },
    { key: 'rescheduling_policy', label: 'Rescheduling Policy', type: 'textarea' },
  ]},
  { key: 'payment', label: 'Payment', fields: [
    { key: 'currency', label: 'Currency', type: 'text' },
    { key: 'online_consultation_fee', label: 'Online Consultation Fee (₹)', type: 'number' },
    { key: 'razorpay_key_id', label: 'Razorpay Key ID', type: 'text' },
  ]},
  { key: 'seo', label: 'SEO', fields: [
    { key: 'meta_title', label: 'Default Meta Title', type: 'text' },
    { key: 'meta_description', label: 'Default Meta Description', type: 'textarea' },
    { key: 'google_analytics_id', label: 'Google Analytics ID', type: 'text' },
    { key: 'google_search_console_verification', label: 'Search Console Verification', type: 'text' },
  ]},
  { key: 'notification', label: 'Notifications', fields: [
    { key: 'reminder_24h_enabled', label: '24-hour Reminder', type: 'checkbox' },
    { key: 'reminder_1h_enabled', label: '1-hour Reminder', type: 'checkbox' },
    { key: 'sms_provider', label: 'SMS Provider', type: 'text' },
  ]},
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    settingsAPI.getAdmin()
      .then(r => setSettings(r.data.data || {}))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      toast.success('Settings saved successfully');
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const update = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }));

  if (loading) return <LoadingSpinner size="lg" className="py-20 mx-auto" />;

  const activeSection = SECTIONS.find(s => s.key === activeTab);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-gray-900">Settings</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary gap-2 text-sm py-2"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setActiveTab(s.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === s.key ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {activeSection && (
        <div className="card p-6 space-y-5">
          {activeSection.fields.map(field => (
            <div key={field.key}>
              <label className="label">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea value={settings[field.key] || ''} onChange={e => update(field.key, e.target.value)} className="input-field resize-none" rows={3} />
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={settings[field.key] === 'true'} onChange={e => update(field.key, String(e.target.checked))} className="w-4 h-4 accent-teal-600" />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
              ) : (
                <input type={field.type} value={settings[field.key] || ''} onChange={e => update(field.key, e.target.value)} className="input-field" />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary gap-2 px-8"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save All Settings'}</button>
      </div>
    </div>
  );
}
