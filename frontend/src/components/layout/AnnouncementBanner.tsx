import { Phone, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';

export default function AnnouncementBanner() {
  const [dismissed, setDismissed]   = useState(false);
  const [text, setText]             = useState('Online consultations available. Medicines dispatched via courier across India.');
  const [phone, setPhone]           = useState('7810880949');
  const [enabled, setEnabled]       = useState(true);

  useEffect(() => {
    settingsAPI.getPublic().then(r => {
      const s = r.data.data || {};
      if (s.announcement_text)   setText(s.announcement_text);
      if (s.hero_phone)          setPhone(s.hero_phone);
      if (s.announcement_active === 'false') setEnabled(false);
    }).catch(() => {});
  }, []);

  if (!enabled || dismissed) return null;

  return (
    <div className="bg-teal-700 text-white py-2 px-4 text-center relative">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm flex-wrap pr-8">
        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{text}</span>
        <a href={`tel:+91${phone}`} className="font-bold hover:underline whitespace-nowrap">
          Call/WhatsApp: {phone}
        </a>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-teal-600 rounded"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
