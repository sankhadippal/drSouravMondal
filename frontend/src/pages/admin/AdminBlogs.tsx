import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Image, X, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { blogsAPI, getErrorMessage } from '../../services/api';
import { formatDate } from '../../utils';
import { imgUrl } from '../../utils/imageUrl';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface Post {
  id: string; title: string; slug: string; status: 'draft' | 'published';
  cover_image?: string; author_name?: string;
  published_at?: string; view_count: number; created_at: string;
}

interface PostForm {
  title: string; excerpt: string; content: string;
  tags: string; status: 'draft' | 'published';
  meta_title: string; meta_description: string;
}

const EMPTY_FORM: PostForm = {
  title: '', excerpt: '', content: '', tags: '', status: 'draft', meta_title: '', meta_description: '',
};

export default function AdminBlogs() {
  const [posts, setPosts]       = useState<Post[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm]           = useState<PostForm>(EMPTY_FORM);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile]     = useState<File | null>(null);
  const [saving, setSaving]           = useState(false);
  const [deleteId, setDeleteId]       = useState('');
  const [tagInput, setTagInput]       = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (statusFilter) params.status = statusFilter;
    blogsAPI.adminList(params)
      .then(r => {
        setPosts(r.data.data || []);
        setTotal(r.data.total || 0);
        setTotalPages(r.data.totalPages || 1);
      })
      .catch(() => toast.error('Failed to load posts'))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null); setForm(EMPTY_FORM); setCoverFile(null); setCoverPreview(null);
    setTagInput(''); setModalOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const r = await blogsAPI.adminGet(id);
      const p = r.data.data;
      setEditingId(id);
      setForm({
        title: p.title, excerpt: p.excerpt || '', content: p.content,
        tags: (p.tags || []).join(', '), status: p.status,
        meta_title: p.meta_title || '', meta_description: p.meta_description || '',
      });
      setCoverPreview(p.cover_image ? `http://localhost:5000${p.cover_image}` : null);
      setCoverFile(null);
      setTagInput('');
      setModalOpen(true);
    } catch { toast.error('Failed to load post'); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    const existing = form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!existing.includes(t)) {
      setForm(f => ({ ...f, tags: [...existing, t].join(', ') }));
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    const remaining = form.tags.split(',').map(s => s.trim()).filter(s => s && s !== tag);
    setForm(f => ({ ...f, tags: remaining.join(', ') }));
  };

  const parsedTags = form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [];

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.content.trim()) { toast.error('Content is required'); return; }

    setSaving(true);
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('excerpt', form.excerpt);
    fd.append('content', form.content);
    fd.append('tags', JSON.stringify(parsedTags));
    fd.append('status', form.status);
    fd.append('meta_title', form.meta_title);
    fd.append('meta_description', form.meta_description);
    if (coverFile) fd.append('cover_image', coverFile);

    try {
      if (editingId) {
        await blogsAPI.update(editingId, fd);
        toast.success('Post updated');
      } else {
        await blogsAPI.create(fd);
        toast.success('Post created');
      }
      setModalOpen(false);
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await blogsAPI.delete(deleteId);
      toast.success('Post deleted');
      setDeleteId('');
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  const toggleStatus = async (post: Post) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    const fd = new FormData();
    fd.append('status', newStatus);
    try {
      await blogsAPI.update(post.id, fd);
      toast.success(newStatus === 'published' ? 'Post published' : 'Post unpublished');
      load();
    } catch (e) { toast.error(getErrorMessage(e)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-xl font-bold text-gray-900">
          Blog Posts <span className="text-gray-400 font-normal text-base">({total})</span>
        </h1>
        <button onClick={openCreate} className="btn-primary gap-2 text-sm py-2">
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex gap-3">
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field py-2 text-sm w-36">
          <option value="">All</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <button onClick={() => { setStatusFilter(''); setPage(1); }} className="btn-outline text-sm py-2">Clear</button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead><tr><th>Cover</th><th>Title</th><th>Status</th><th>Author</th><th>Published</th><th>Views</th><th>Actions</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="py-12 text-center"><LoadingSpinner size="sm" className="mx-auto" /></td></tr>}
              {!loading && posts.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No posts yet. Create your first blog post!</td></tr>}
              {posts.map(p => (
                <tr key={p.id}>
                  <td>
                    {p.cover_image ? (
                      <img src={imgUrl(p.cover_image)} alt="" className="w-14 h-10 object-cover rounded-lg" />
                    ) : (
                      <div className="w-14 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Image className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td>
                    <p className="font-medium text-gray-900 max-w-xs truncate">{p.title}</p>
                    <p className="text-xs text-gray-400 font-mono truncate max-w-xs">/blog/{p.slug}</p>
                  </td>
                  <td><Badge status={p.status} /></td>
                  <td className="text-sm text-gray-500">{p.author_name || '—'}</td>
                  <td className="text-sm text-gray-500 whitespace-nowrap">{p.published_at ? formatDate(p.published_at) : '—'}</td>
                  <td className="text-sm text-gray-500">{p.view_count}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => toggleStatus(p)} title={p.status === 'published' ? 'Unpublish' : 'Publish'}
                        className={`p-1.5 rounded hover:bg-gray-100 ${p.status === 'published' ? 'text-green-600' : 'text-gray-400'}`}>
                        {p.status === 'published' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(p.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && <div className="px-4 py-3 border-t border-gray-100"><Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} /></div>}
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Blog Post' : 'New Blog Post'} size="xl">
        <div className="space-y-5">
          {/* Cover Image */}
          <div>
            <label className="label">Cover Image</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-teal-400 transition-colors"
              style={{ minHeight: 160 }}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" className="w-full h-48 object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <Image className="w-10 h-10 mb-2 text-gray-300" />
                  <p className="text-sm">Click to upload cover image</p>
                  <p className="text-xs mt-1">JPEG, PNG, WebP — max 5 MB</p>
                </div>
              )}
              {coverPreview && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setCoverPreview(null); setCoverFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>

          {/* Title */}
          <div>
            <label className="label">Title <span className="text-red-500">*</span></label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" placeholder="Article title" />
          </div>

          {/* Excerpt */}
          <div>
            <label className="label">Excerpt <span className="text-xs text-gray-400">(short summary shown in listing)</span></label>
            <textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} className="input-field resize-none" rows={2} placeholder="Brief summary of the article..." />
          </div>

          {/* Content */}
          <div>
            <label className="label">Content <span className="text-red-500">*</span></label>
            <p className="text-xs text-gray-400 mb-1.5">Supports: **bold**, *italic*, ## heading, &gt; blockquote, [link](url)</p>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="input-field resize-y font-mono text-sm"
              rows={14}
              placeholder="Write your article content here...&#10;&#10;## Introduction&#10;&#10;Your content here..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="label">Tags</label>
            <div className="flex gap-2 mb-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                className="input-field flex-1 py-2 text-sm"
                placeholder="Type a tag and press Enter or Add"
              />
              <button type="button" onClick={addTag} className="btn-outline text-sm py-2 gap-1">
                <Tag className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {parsedTags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 text-sm rounded-full border border-teal-200">
                    {t}
                    <button type="button" onClick={() => removeTag(t)} className="hover:text-teal-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <div className="flex gap-3">
              {(['draft', 'published'] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all capitalize ${form.status === s ? (s === 'published' ? 'border-green-500 bg-green-50 text-green-700' : 'border-teal-500 bg-teal-50 text-teal-700') : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {s === 'published' ? '🌐 Published' : '📝 Draft'}
                </button>
              ))}
            </div>
          </div>

          {/* SEO */}
          <details className="group">
            <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-900 list-none flex items-center gap-2">
              <span className="w-4 h-4 border border-gray-300 rounded text-xs flex items-center justify-center group-open:bg-teal-50">+</span>
              SEO Settings (optional)
            </summary>
            <div className="mt-3 space-y-3 pl-6">
              <div>
                <label className="label">Meta Title</label>
                <input value={form.meta_title} onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))} className="input-field text-sm" placeholder="SEO page title" />
              </div>
              <div>
                <label className="label">Meta Description</label>
                <textarea value={form.meta_description} onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))} className="input-field resize-none text-sm" rows={2} placeholder="SEO description (150-160 chars)" />
              </div>
            </div>
          </details>

          <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
            <button onClick={() => setModalOpen(false)} className="btn-secondary text-sm py-2">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm py-2 px-6">
              {saving ? 'Saving…' : editingId ? 'Update Post' : 'Create Post'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId('')}
        onConfirm={handleDelete}
        title="Delete Blog Post"
        message="This will permanently delete the post and cannot be undone."
        confirmLabel="Delete Post"
      />
    </div>
  );
}
