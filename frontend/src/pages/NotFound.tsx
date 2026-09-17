import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import SEOHead from '../components/ui/SEOHead';
export default function NotFound() {
  return (
    <>
      <SEOHead title="Page Not Found" />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-8xl font-heading font-black text-teal-700 mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h1>
          <p className="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
          <div className="flex gap-3 justify-center">
            <Link to="/" className="btn-primary"><Home className="w-4 h-4" /> Go Home</Link>
            <button onClick={() => history.back()} className="btn-secondary"><ArrowLeft className="w-4 h-4" /> Go Back</button>
          </div>
        </div>
      </div>
    </>
  );
}
