import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AnnouncementBanner from './AnnouncementBanner';
import GalleryScroller from '../public/GalleryScroller';
import ReviewsSection from '../public/ReviewsSection';

export default function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <AnnouncementBanner />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <ReviewsSection />
      <GalleryScroller />
      <Footer />
    </div>
  );
}
