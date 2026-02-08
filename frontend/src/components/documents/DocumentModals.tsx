import { useState, useRef, useCallback } from 'react';
import { X, Upload, Loader2, FileText, Download, Trash2, Clock, Plus, Eye, Edit } from 'lucide-react';
import type { DocumentInfo, DocumentVersionInfo, FolderInfo } from '@portal/core';
import { formatFileSize } from '@portal/core';
import { canOpenWithOnlyOffice, canEditWithOnlyOffice, canOpenWithCadViewer } from '../../services/documentsApi';

/* ─── CreateFolderModal ────────────────────────────────────── */

interface CreateFolderModalProps {
  parentId: string | null;
  folders: FolderInfo[];
  onSubmit: (name: string, parentId: string | null) => void;
  onClose: () => void;
  isPending: boolean;
}

export function CreateFolderModal({ parentId, folders, onSubmit, onClose, isPending }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [selectedParent, setSelectedParent] = useState<string>(parentId || '');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Yeni Klasör</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Klasör Adı *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ör. Teknik Dökümanlar"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) onSubmit(name.trim(), selectedParent || null);
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Üst Klasör</label>
            <select
              value={selectedParent}
              onChange={(e) => setSelectedParent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Kök klasör</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => name.trim() && onSubmit(name.trim(), selectedParent || null)}
            disabled={!name.trim() || isPending}
            className="px-4 py-2 text-sm bg-[#1890FF] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── UploadModal ──────────────────────────────────────────── */

interface UploadModalProps {
  folderId: string;
  folderName: string;
  onUpload: (files: File[], description: string) => void;
  onClose: () => void;
  isPending: boolean;
}

export function UploadModal({ folderId: _folderId, folderName, onUpload, onClose, isPending }: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Dosya Yükle — {folderName}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Dosyaları sürükleyip bırakın veya <span className="text-blue-600 font-medium">tıklayarak seçin</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Maksimum 100MB</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Selected files */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 text-sm truncate text-gray-700 dark:text-gray-200">{file.name}</span>
                  <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>
                  <button
                    onClick={() => removeFile(i)}
                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dosya açıklaması (opsiyonel)..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => files.length > 0 && onUpload(files, description)}
            disabled={files.length === 0 || isPending}
            className="px-4 py-2 text-sm bg-[#1890FF] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Yükle ({files.length})
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DocumentDetailPanel ─────────────────────────────────── */

interface DocumentDetailPanelProps {
  document: DocumentInfo;
  versions: DocumentVersionInfo[];
  isLoadingVersions: boolean;
  onClose: () => void;
  onDownload: (id: string, filename: string) => void;
  onDownloadVersion: (docId: string, versionNumber: number, filename: string) => void;
  onDelete: (id: string) => void;
  onUploadVersion: (docId: string, file: File, changeNote: string) => void;
  isDeleting: boolean;
  isUploadingVersion: boolean;
  onView?: (id: string, name: string) => void;
  onEdit?: (id: string, name: string) => void;
  onViewCad?: (id: string, name: string) => void;
}

export function DocumentDetailPanel({
  document: doc,
  versions,
  isLoadingVersions,
  onClose,
  onDownload,
  onDownloadVersion,
  onDelete,
  onUploadVersion,
  isDeleting,
  isUploadingVersion,
  onView,
  onEdit,
  onViewCad,
}: DocumentDetailPanelProps) {
  const [showVersionUpload, setShowVersionUpload] = useState(false);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const versionInputRef = useRef<HTMLInputElement>(null);

  const handleUploadVersion = () => {
    if (versionFile) {
      onUploadVersion(doc.id, versionFile, changeNote);
      setVersionFile(null);
      setChangeNote('');
      setShowVersionUpload(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate pr-4">{doc.name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Boyut</span>
              <p className="text-gray-900 dark:text-white font-medium">{formatFileSize(doc.sizeBytes)}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Tür</span>
              <p className="text-gray-900 dark:text-white font-medium">{doc.mimeType}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Versiyon</span>
              <p className="text-gray-900 dark:text-white font-medium">v{doc.currentVersion}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Tarih</span>
              <p className="text-gray-900 dark:text-white font-medium">
                {new Date(doc.createdAt).toLocaleDateString('tr-TR')}
              </p>
            </div>
            {doc.description && (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Açıklama</span>
                <p className="text-gray-900 dark:text-white">{doc.description}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {onViewCad && canOpenWithCadViewer(doc.name) && (
              <button
                onClick={() => onViewCad(doc.id, doc.name)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Eye className="w-4 h-4" />
                Görüntüle (CAD)
              </button>
            )}
            {onView && canOpenWithOnlyOffice(doc.name) && (
              <button
                onClick={() => onView(doc.id, doc.name)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Eye className="w-4 h-4" />
                Görüntüle
              </button>
            )}
            {onEdit && canEditWithOnlyOffice(doc.name) && (
              <button
                onClick={() => onEdit(doc.id, doc.name)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
              >
                <Edit className="w-4 h-4" />
                Düzenle
              </button>
            )}
            <button
              onClick={() => onDownload(doc.id, doc.name)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#1890FF] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              İndir
            </button>
            <button
              onClick={() => {
                if (confirm('Bu dokümanı silmek istediğinizden emin misiniz?')) onDelete(doc.id);
              }}
              disabled={isDeleting}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Version history */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Versiyon Geçmişi
              </h4>
              <button
                onClick={() => setShowVersionUpload(!showVersionUpload)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3 h-3" />
                Yeni Versiyon
              </button>
            </div>

            {/* Version upload */}
            {showVersionUpload && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => versionInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                  >
                    Dosya Seç
                  </button>
                  <span className="text-xs text-gray-500 truncate">
                    {versionFile ? versionFile.name : 'Dosya seçilmedi'}
                  </span>
                  <input
                    ref={versionInputRef}
                    type="file"
                    onChange={(e) => e.target.files?.[0] && setVersionFile(e.target.files[0])}
                    className="hidden"
                  />
                </div>
                <input
                  type="text"
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  placeholder="Değişiklik notu..."
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />
                <button
                  onClick={handleUploadVersion}
                  disabled={!versionFile || isUploadingVersion}
                  className="w-full px-3 py-1.5 text-xs bg-[#1890FF] text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isUploadingVersion ? 'Yükleniyor...' : 'Yükle'}
                </button>
              </div>
            )}

            {isLoadingVersions ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        v{v.versionNumber}
                      </p>
                      {v.changeNote && (
                        <p className="text-xs text-gray-500 truncate">{v.changeNote}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {formatFileSize(v.sizeBytes)} — {new Date(v.createdAt).toLocaleString('tr-TR')}
                      </p>
                    </div>
                    <button
                      onClick={() => onDownloadVersion(doc.id, v.versionNumber, `v${v.versionNumber}_${doc.name}`)}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-500 hover:text-blue-600"
                      title="İndir"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {versions.length === 0 && (
                  <p className="text-center text-gray-400 py-2 text-xs">Versiyon geçmişi yok</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── RenameModal ──────────────────────────────────────────── */

interface RenameModalProps {
  currentName: string;
  type: 'folder' | 'document';
  onSubmit: (newName: string) => void;
  onClose: () => void;
  isPending: boolean;
}

export function RenameModal({ currentName, type, onSubmit, onClose, isPending }: RenameModalProps) {
  const [name, setName] = useState(currentName);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {type === 'folder' ? 'Klasörü Yeniden Adlandır' : 'Dokümanı Yeniden Adlandır'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim() && name !== currentName) onSubmit(name.trim());
            }}
          />
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => name.trim() && name !== currentName && onSubmit(name.trim())}
            disabled={!name.trim() || name === currentName || isPending}
            className="px-4 py-2 text-sm bg-[#1890FF] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── DeleteConfirmModal ───────────────────────────────────── */

interface DeleteConfirmModalProps {
  name: string;
  type: 'folder' | 'document';
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}

export function DeleteConfirmModal({ name, type, onConfirm, onClose, isPending }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-red-600">
            {type === 'folder' ? 'Klasörü Sil' : 'Dokümanı Sil'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>{name}</strong> {type === 'folder' ? 'klasörünü' : 'dokümanını'} silmek istediğinizden emin misiniz?
            {type === 'folder' && (
              <span className="block mt-1 text-xs text-gray-500">
                Alt klasör veya doküman içeriyorsa silinemez.
              </span>
            )}
            {type === 'document' && (
              <span className="block mt-1 text-xs text-gray-500">
                Tüm versiyonlar kalıcı olarak silinecektir.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}
