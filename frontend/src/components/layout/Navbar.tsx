import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Calendar } from 'lucide-react';
import { cn } from '../../utils';

// Desktop nav links (shown at lg+)
const desktopLinks = [
  { to: '/',                    label: 'Home',               exact: true },
  { to: '/about',               label: 'About' },
  { to: '/services',            label: 'Services' },
  { to: '/chambers',            label: 'Chambers' },
  { to: '/online-consultation', label: 'Online' },
  { to: '/blog',                label: 'Blog' },
  { to: '/faq',                 label: 'FAQ' },
  { to: '/contact',             label: 'Contact' },
];

// Mobile drawer links (full labels)
const mobileLinks = [
  { to: '/',                    label: 'Home',                exact: true },
  { to: '/about',               label: 'About Doctor' },
  { to: '/services',            label: 'Services' },
  { to: '/chambers',            label: 'Chambers' },
  { to: '/online-consultation', label: 'Online Consultation' },
  { to: '/blog',                label: 'Health Blog' },
  { to: '/faq',                 label: 'FAQs' },
  { to: '/contact',             label: 'Contact Us' },
];

export default function Navbar() {
  const [isOpen, setIsOpen]   = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close drawer on route change
  useEffect(() => { setIsOpen(false); }, [location]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className={cn(
      'sticky top-0 z-40 transition-shadow duration-300',
      scrolled ? 'bg-white shadow-md' : 'bg-white border-b border-gray-100'
    )}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">

        {/* ── Main row ── */}
        <div className="flex items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-none mr-4">
            <div className="w-9 h-9 bg-teal-700 rounded-lg flex items-center justify-center flex-none
                            group-hover:bg-teal-800 transition-colors">
              <svg viewBox="0 0 40 40" className="w-6 h-6">
                <path d="M20 6 L20 34 M6 20 L34 20" stroke="white" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </div>
            {/* Show on sm+ only — hides on very small phones to save space */}
            <div className="hidden sm:block leading-tight">
              <div className="font-heading font-bold text-gray-900 text-sm whitespace-nowrap">
                Dr. Sourav K. Mondal
              </div>
              <div className="text-xs text-teal-700 font-medium whitespace-nowrap">
                B.H.M.S. (WBUHS) · Homoeopathy
              </div>
            </div>
            {/* On tiny screens show just the clinic name */}
            <div className="sm:hidden leading-tight">
              <div className="font-heading font-bold text-gray-900 text-xs whitespace-nowrap">
                Dr. Sourav Mondal
              </div>
              <div className="text-[10px] text-teal-700 font-medium whitespace-nowrap">
                Homoeopathy
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 overflow-hidden">
            {desktopLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                className={({ isActive }) => cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-none',
                  isActive ? 'text-teal-700 bg-teal-50' : 'text-gray-600 hover:text-teal-700 hover:bg-gray-50'
                )}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-2 flex-none ml-2">
            <a
              href="tel:+917810880949"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-teal-700
                         border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5 flex-none" />
              7810880949
            </a>
            <Link
              to="/appointment"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-700 text-white text-sm
                         font-semibold rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap"
            >
              <Calendar className="w-4 h-4 flex-none" />
              Book Appointment
            </Link>
          </div>

          {/* Mobile / Tablet right side */}
          <div className="flex lg:hidden items-center gap-2 ml-auto flex-none">
            {/* "Book" button — always shows text */}
            <Link
              to="/appointment"
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white text-xs
                         font-semibold rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5 flex-none" />
              Book
            </Link>
            {/* Hamburger */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-none"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
            >
              {isOpen
                ? <X className="w-5 h-5 text-gray-700" />
                : <Menu className="w-5 h-5 text-gray-700" />
              }
            </button>
          </div>
        </div>

        {/* ── Mobile Drawer ── */}
        <div
          id="mobile-menu"
          className={cn(
            'lg:hidden overflow-hidden transition-all duration-300 ease-in-out',
            isOpen ? 'max-h-screen opacity-100 pb-4' : 'max-h-0 opacity-0'
          )}
        >
          <div className="border-t border-gray-100 pt-3 space-y-0.5">
            {mobileLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'text-teal-700 bg-teal-50'
                    : 'text-gray-700 hover:text-teal-700 hover:bg-gray-50'
                )}
              >
                {link.label}
              </NavLink>
            ))}

            {/* Mobile CTA buttons */}
            <div className="px-4 pt-3 pb-1 space-y-2 border-t border-gray-100 mt-2">
              <Link
                to="/appointment"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-teal-700
                           text-white text-sm font-semibold rounded-xl hover:bg-teal-800 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Book Appointment
              </Link>
              <a
                href="tel:+917810880949"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm
                           font-semibold text-teal-700 border-2 border-teal-600 rounded-xl
                           hover:bg-teal-50 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call / WhatsApp: 7810880949
              </a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
