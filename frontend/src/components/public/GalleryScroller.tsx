import { useEffect, useState, useRef } from 'react';
import { Images } from 'lucide-react';
import { galleryAPI, settingsAPI } from '../../services/api';

import { imgUrl } from '../../utils/imageUrl';

interface GalleryImage {
  id: string;
  title?: string;
  caption?: string;
  image_url: string;
}

export default function GalleryScroller() {
  const [images, setImages]     = useState<GalleryImage[]>([]);
  const [title, setTitle]       = useState('Our Clinic Gallery');
  const [subtitle, setSubtitle] = useState('A glimpse of our clinic and happy patients');
  const [enabled, setEnabled]   = useState(true);
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef  = useRef<number>(0);
  const posRef   = useRef(0);
  const pauseRef = useRef(false);

  useEffect(() => {
    galleryAPI.getAll().then(r => setImages(r.data.data || [])).catch(() => {});
    settingsAPI.getPublic().then(r => {
      const s = r.data.data || {};
      if (s.gallery_section_title)    setTitle(s.gallery_section_title);
      if (s.gallery_section_subtitle) setSubtitle(s.gallery_section_subtitle);
      if (s.gallery_enabled === 'false') setEnabled(false);
    }).catch(() => {});
  }, []);

  // Infinite CSS marquee via requestAnimationFrame
  useEffect(() => {
    if (!images.length || !enabled) return;
    const track = trackRef.current;
    if (!track) return;

    const SPEED = 0.5; // px per frame

    const animate = () => {
      if (!pauseRef.current) {
        posRef.current -= SPEED;
        // Reset when first half scrolled (we duplicate images so it loops seamlessly)
        const halfWidth = track.scrollWidth / 2;
        if (Math.abs(posRef.current) >= halfWidth) posRef.current = 0;
        track.style.transform = `translateX(${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [images, enabled]);

  if (!enabled || images.length === 0) return null;

  // Duplicate images for seamless loop
  const doubled = [...images, ...images];

  return (
    <section className="bg-gray-50 py-10 sm:py-14 overflow-hidden">
      <div className="page-container mb-8">
        <div className="text-center">
          <div className="text-teal-700 font-semibold text-xs sm:text-sm uppercase tracking-wider mb-2">
            Gallery
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-gray-500 mt-2 text-sm sm:text-base">{subtitle}</p>}
        </div>
      </div>

      {/* Scrolling track */}
      <div
        className="relative overflow-hidden"
        onMouseEnter={() => { pauseRef.current = true; }}
        onMouseLeave={() => { pauseRef.current = false; }}
        onTouchStart={() => { pauseRef.current = true; }}
        onTouchEnd={() => { pauseRef.current = false; }}
      >
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-r from-gray-50 to-transparent z-10 pointer-events-none" />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-24 bg-gradient-to-l from-gray-50 to-transparent z-10 pointer-events-none" />

        <div
          ref={trackRef}
          className="flex gap-4 will-change-transform"
          style={{ width: 'max-content' }}
        >
          {doubled.map((img, idx) => (
            <div
              key={`${img.id}-${idx}`}
              className="flex-none w-64 sm:w-72 md:w-80 rounded-2xl overflow-hidden shadow-card
                         border border-gray-100 bg-white group cursor-pointer"
            >
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <img
                  src={imgUrl(img.image_url)}
                  alt={img.title || 'Gallery image'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  onError={e => {
                    const t = e.target as HTMLImageElement;
                    t.style.display = 'none';
                    const parent = t.parentElement!;
                    parent.classList.add('flex', 'items-center', 'justify-center', 'bg-teal-50');
                    const icon = document.createElement('div');
                    icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-teal-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
                    parent.appendChild(icon);
                  }}
                />
              </div>
              {(img.title || img.caption) && (
                <div className="p-3">
                  {img.title && (
                    <p className="text-sm font-semibold text-gray-800 truncate">{img.title}</p>
                  )}
                  {img.caption && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{img.caption}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
