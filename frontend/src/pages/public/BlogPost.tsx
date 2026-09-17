import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Eye, ArrowLeft, User, Tag, Clock } from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { blogsAPI } from '../../services/api';
import { formatDate } from '../../utils';
import { imgUrl } from '../../utils/imageUrl';

interface Post {
  id: string; title: string; slug: string; content: string; excerpt?: string;
  cover_image?: string; tags: string[]; author_name?: string;
  published_at?: string; view_count: number; meta_title?: string;
  meta_description?: string; created_at: string;
}

// Simple markdown-ish renderer — converts newlines, **bold**, *italic*, headings
function renderContent(content: string): string {
  return content
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold text-gray-900 mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-teal-600 underline" target="_blank" rel="noopener">$1</a>')
    .replace(/^---$/gm, '<hr class="my-6 border-gray-200" />')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-teal-500 pl-4 italic text-gray-600 my-4">$1</blockquote>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, '<br />');
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost]     = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!slug) { setError('Invalid post URL'); setLoading(false); return; }
    blogsAPI.getBySlug(slug)
      .then(r => setPost(r.data.data))
      .catch(() => setError('Post not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="py-24"><LoadingSpinner size="lg" className="mx-auto" text="Loading…" /></div>;
  if (error || !post) return (
    <div className="py-24 text-center">
      <p className="text-gray-500 mb-4">{error || 'Post not found'}</p>
      <Link to="/blog" className="btn-primary">← Back to Blog</Link>
    </div>
  );

  const readingMinutes = Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200));

  return (
    <>
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt}
        url={`/blog/${post.slug}`}
        image={post.cover_image ? imgUrl(post.cover_image) : undefined}
        type="article"
      />

      {/* Cover */}
      {post.cover_image && (
        <div className="w-full h-72 md:h-96 bg-teal-50 overflow-hidden">
          <img
            src={imgUrl(post.cover_image)}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="page-container py-10 max-w-3xl">
        {/* Back link */}
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-teal-700 hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Link>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-medium border border-teal-100">
                <Tag className="w-3 h-3" /> {t}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-5">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-8 pb-6 border-b border-gray-100">
          {post.author_name && (
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" /> {post.author_name}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {formatDate(post.published_at || post.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> {readingMinutes} min read
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> {post.view_count} views
          </span>
        </div>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-lg text-gray-600 italic leading-relaxed mb-8 p-5 bg-teal-50 rounded-xl border-l-4 border-teal-500">
            {post.excerpt}
          </p>
        )}

        {/* Content */}
        <div
          className="prose prose-gray max-w-none text-gray-700 leading-relaxed text-base"
          dangerouslySetInnerHTML={{ __html: `<p class="mb-4">${renderContent(post.content)}</p>` }}
        />

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <div className="bg-teal-50 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-14 h-14 bg-teal-700 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xl">
              S
            </div>
            <div>
              <p className="font-semibold text-gray-900">Dr. Sourav Kumar Mondal</p>
              <p className="text-sm text-gray-500 mb-3">B.H.M.S. (WBUHS) · Homoeopathic Physician</p>
              <Link to="/appointment" className="btn-primary text-sm py-2 px-5">
                Book a Consultation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
