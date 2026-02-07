import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Save,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { announcementsApi } from '../../services/announcements';
import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '../../types';

const categoryOptions: { value: AnnouncementCategory; label: string }[] = [
  { value: 'general', label: 'Genel' },
  { value: 'hr', label: 'İnsan Kaynakları' },
  { value: 'it', label: 'Bilgi Teknolojileri' },
  { value: 'finance', label: 'Finans' },
];

const priorityOptions: { value: AnnouncementPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Kritik', color: 'bg-red-50 text-red-700' },
  { value: 'important', label: 'Önemli', color: 'bg-amber-50 text-amber-700' },
  { value: 'info', label: 'Bilgi', color: 'bg-blue-50 text-[#0078d4]' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().slice(0, 16);
}

interface FormData {
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  publishDate: string;
  expireDate: string;
  isActive: boolean;
}

const initialFormData: FormData = {
  title: '',
  content: '',
  category: 'general',
  priority: 'info',
  publishDate: '',
  expireDate: '',
  isActive: true,
};

export default function AnnouncementsAdmin() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements-admin'],
    queryFn: () => announcementsApi.getAll(true),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAnnouncementDto) => announcementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-admin'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements-latest'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAnnouncementDto }) =>
      announcementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-admin'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements-latest'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements-admin'] });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcements-latest'] });
      setDeleteConfirm(null);
    },
  });

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setFormData({
      ...initialFormData,
      publishDate: new Date().toISOString().slice(0, 16),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      priority: announcement.priority,
      publishDate: formatDateForInput(announcement.publishDate),
      expireDate: formatDateForInput(announcement.expireDate),
      isActive: announcement.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAnnouncement(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dto: CreateAnnouncementDto = {
      title: formData.title,
      content: formData.content,
      category: formData.category,
      priority: formData.priority,
      publishDate: formData.publishDate || undefined,
      expireDate: formData.expireDate || undefined,
      isActive: formData.isActive,
    };

    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data: dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const toggleActive = (announcement: Announcement) => {
    updateMutation.mutate({
      id: announcement.id,
      data: { isActive: !announcement.isActive },
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* SharePoint Style Header */}
      <div className="bg-white border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#0078d4] flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Duyuru Yönetimi</h1>
              <p className="text-sm text-gray-500">Duyuruları oluşturun, düzenleyin ve yönetin</p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#0078d4] text-white text-sm font-medium hover:bg-[#106ebe] transition"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Duyuru</span>
          </button>
        </div>
      </div>

      {/* SharePoint Style Table */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-[#0078d4] animate-spin mx-auto" />
          </div>
        ) : announcements?.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p>Henüz duyuru oluşturulmamış.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f3f2f1] border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Duyuru
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Öncelik
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Yayın Tarihi
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {announcements?.map((ann) => (
                  <tr key={ann.id} className="hover:bg-[#f3f2f1] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 max-w-xs truncate">
                        {ann.title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {categoryOptions.find((c) => c.value === ann.category)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium ${
                          priorityOptions.find((p) => p.value === ann.priority)?.color
                        }`}
                      >
                        {priorityOptions.find((p) => p.value === ann.priority)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(ann.publishDate)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(ann)}
                        className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${
                          ann.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ann.isActive ? (
                          <>
                            <Eye className="w-3 h-3" /> Aktif
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Pasif
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(ann)}
                          className="p-1.5 text-gray-500 hover:text-[#0078d4] hover:bg-blue-50 transition"
                          title="Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(ann.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SharePoint Style Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#f3f2f1]">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAnnouncement ? 'Duyuruyu Düzenle' : 'Yeni Duyuru'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Başlık
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-[#0078d4] text-sm"
                  required
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  İçerik
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-[#0078d4] text-sm"
                  required
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as AnnouncementCategory })
                    }
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-[#0078d4] text-sm"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Öncelik
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value as AnnouncementPriority })
                    }
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-[#0078d4] text-sm"
                  >
                    {priorityOptions.map((pri) => (
                      <option key={pri.value} value={pri.value}>
                        {pri.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Yayın Tarihi
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.publishDate}
                    onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-[#0078d4] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bitiş Tarihi (Opsiyonel)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expireDate}
                    onChange={(e) => setFormData({ ...formData, expireDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-[#0078d4] text-sm"
                  />
                </div>
              </div>

              {/* Active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 border-gray-300 text-[#0078d4] focus:ring-[#0078d4]"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Duyuruyu yayınla
                </label>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 hover:bg-gray-50 text-sm font-medium transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0078d4] text-white text-sm font-medium hover:bg-[#106ebe] transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{editingAnnouncement ? 'Güncelle' : 'Oluştur'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Duyuruyu Sil</h3>
                  <p className="text-sm text-gray-500 mt-1">Bu işlem geri alınamaz. Duyuru kalıcı olarak silinecektir.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 hover:bg-gray-50 text-sm font-medium transition"
                >
                  İptal
                </button>
                <button
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
