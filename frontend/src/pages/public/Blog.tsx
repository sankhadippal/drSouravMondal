import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Eye, ArrowRight, BookOpen } from 'lucide-react';
import SEOHead from '../../components/ui/SEOHead';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Pagination from '../../components/ui/Pagination';
import { blogsAPI } from '../../services/api';
import { formatDate } from '../../utils';
import { imgUrl } from '../../utils/imageUrl';

interface BlogPost {
  id: string; title: string; slug: string; excerpt?: string;
  cover_image?: string; tags: string[]; author_name?: string;
  published_at?: string; view_count: number; created_at: string;
}

export default function Blog() {
  const [posts, setPosts]           = useState<BlogPost[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(true);
  const [activeTag, setActiveTag]   = useState('');

  // Collect all unique tags from loaded posts
  const allTags = Array.from(new Set(posts.flatMap(p => p.tags || [])));

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '9' };
    if (activeTag) params.tag = activeTag;
    blogsAPI.getAll(params)
      .then(r => {
        setPosts(r.data.data || []);
        setTotal(r.data.total || 0);
        setTotalPages(r.data.totalPages || 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, activeTag]);

  return (
    <>
      <SEOHead
        title="Health Blog - Dr. Sourav Kumar Mondal"
        description="Expert articles on homoeopathic health, treatment insights, and wellness tips by Dr. Sourav Kumar Mondal."
        url="/blog"
      />

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-teal-900 to-teal-700 text-white py-12 sm:py-14">
        <div className="page-container text-center px-4">
          <div className="inline-flex items-center gap-2 bg-teal-700/50 border border-teal-600/40 rounded-full px-4 py-1.5 text-sm text-teal-200 mb-4">
            <BookOpen className="w-4 h-4 flex-shrink-0" />
            Health Articles &amp; Insights
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
            Homoeopathic Health Blog
          </h1>
          <p className="text-teal-200 max-w-xl mx-auto text-base sm:text-lg">
            Expert articles on homoeopathic medicine, treatment insights, and natural wellness.
          </p>
        </div>
      </div>

      <div className="page-container py-8 sm:py-12">
        {/* ── Tag filters ── */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            <button
              onClick={() => { setActiveTag(''); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !activeTag ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => { setActiveTag(tag); setPage(1); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTag === tag ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <LoadingSpinner size="lg" className="py-20 mx-auto" text="Loading articles…" />
        ) : posts.length === 0 ? (
          <div className="text-center py-20 px-4">
            <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No articles yet</h2>
            <p className="text-gray-400">Check back soon for health insights and tips.</p>
          </div>
        ) : (
          <>
            {/* ── Cards grid: 1 col mobile → 2 col tablet → 3 col desktop ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-10">
              {posts.map(post => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="card-hover group flex flex-col overflow-hidden rounded-xl border border-gray-100"
                >
                  {/* Cover image — aspect-ratio based so it's fluid */}
                  <div className="relative w-full aspect-video bg-gradient-to-br from-teal-50 to-teal-100 overflow-hidden">
                    {post.cover_image ? (
                      <img
                        src={imgUrl(post.cover_image)}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => {
                          const t = e.target as HTMLImageElement;
                          t.style.display = 'none';
                          t.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-teal-300" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 sm:p-5 flex flex-col flex-1">
                    {/* Tags */}
                    {post.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {post.tags.slice(0, 3).map((t: string) => (
                          <span key={t} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <h2 className="font-heading font-bold text-gray-900 text-base sm:text-lg leading-snug mb-2
                                   group-hover:text-teal-700 transition-colors line-clamp-2">
                      {post.title}
                    </h2>

                    {post.excerpt && (
                      <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1 line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                        {formatDate(post.published_at || post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 flex-shrink-0" />
                        {post.view_count}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-teal-700 text-sm font-medium mt-3">
                      Read article <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <Pagination page={page} totalPages={totalPages} total={total} limit={9} onPageChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}
