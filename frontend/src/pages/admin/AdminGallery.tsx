import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Trash2, Eye, EyeOff, ImageIcon, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { galleryAPI, getErrorMessage } from '../../services/api';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { imgUrl } from '../../utils/imageUrl';

interface GalleryImage {
  id: string; title?: string; caption?: string;
  image_url: string; sort_order: number; is_active: boolean; created_at: string;
}

export default function AdminGallery() {
  const [images, setImages]     = useState<GalleryImage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await galleryAPI.getAdmin(); setImages(r.data.data || []); }
    catch { toast.error('Failed to load gallery'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { toast.error(`${file.name} is not an image`); continue; }
      const fd = new FormData();
      fd.append('image', file);
      fd.append('sort_order', String(images.length + uploaded));
      try { await galleryAPI.upload(fd); uploaded++; }
      catch (e) { toast.error(`Failed to upload ${file.name}: ${getErrorMessage(e)}`); }
    }
    if (uploaded > 0) { toast.success(`${uploaded} image${uploaded > 1 ? 's' : ''} uploaded`); load(); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const toggleActive = async (img: GalleryImage) => {
    try {
      await galleryAPI.update(img.id, { is_active: !img.is_active });
      setImages(imgs => imgs.map(i => i.id === img.id ? { ...i, is_active: !i.is_active } : i));
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await galleryAPI.delete(deleteId); toast.success('Image deleted'); setDeleteId(''); load(); }
    catch (e) { toast.error(getErrorMessage(e)); }
    finally { setDeleting(false); }
  };

  const moveImage = async (idx: number, dir: 'up' | 'down') => {
    const newImages = [...images];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newImages.length) return;
    [newImages[idx], newImages[swapIdx]] = [newImages[swapIdx], newImages[idx]];
    const order = newImages.map((img, i) => ({ id: img.id, sort_order: i }));
    setImages(newImages);
    try { await galleryAPI.reorder(order); }
    catch { toast.error('Failed to reorder'); load(); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-gray-900">Gallery</h1>
          <p className="text-xs text-gray-400 mt-0.5">Images scroll right-to-left above the footer on the public site</p>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="btn-primary gap-2 text-sm py-2 disabled:opacity-60">
          {uploading ? <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" /> Uploading…</> : <><Plus className="w-4 h-4" /> Upload Images</>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handleFiles(e.target.files)} className="hidden" />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
        }`}
      >
        <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Drag &amp; drop images here, or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP, GIF — max 8 MB each — multiple files supported</p>
      </div>

      {/* Image grid */}
      {loading ? (
        <LoadingSpinner size="md" className="py-16 mx-auto" />
      ) : images.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ImageIcon className="w-14 h-14 mx-auto mb-3 text-gray-200" />
          <p>No images yet. Upload your first gallery image!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img, idx) => (
            <div key={img.id} className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
              img.is_active ? 'border-gray-200' : 'border-red-200 opacity-60'
            }`}>
              {/* Image */}
              <div className="aspect-square bg-gray-100">
                <img
                  src={imgUrl(img.image_url)}
                  alt={img.title || 'Gallery'}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f3f4f6" width="100" height="100"/><text y="55" x="50" text-anchor="middle" fill="%239ca3af" font-size="12">No image</text></svg>'; }}
                />
              </div>

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => toggleActive(img)}
                  title={img.is_active ? 'Hide' : 'Show'}
                  className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                  {img.is_active ? <Eye className="w-4 h-4 text-teal-700" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                </button>
                <button onClick={() => setDeleteId(img.id)}
                  className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>

              {/* Sort controls */}
              <div className="absolute top-1 left-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveImage(idx, 'up')} disabled={idx === 0}
                  className="w-5 h-5 bg-white/90 rounded text-xs flex items-center justify-center disabled:opacity-30 hover:bg-white">▲</button>
                <button onClick={() => moveImage(idx, 'down')} disabled={idx === images.length - 1}
                  className="w-5 h-5 bg-white/90 rounded text-xs flex items-center justify-center disabled:opacity-30 hover:bg-white">▼</button>
              </div>

              {/* Order badge */}
              <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs rounded px-1.5 py-0.5">
                #{idx + 1}
              </div>

              {!img.is_active && (
                <div className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded px-1.5 py-0.5">Hidden</div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId('')} onConfirm={handleDelete}
        loading={deleting} title="Delete Image" message="Remove this image from the gallery?" confirmLabel="Delete" />
    </div>
  );
}
