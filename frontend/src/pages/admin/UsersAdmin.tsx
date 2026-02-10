import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Users,
  UserCheck,
  Shield,
  LogIn,
  Edit2,
  Trash2,
  MoreVertical,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { usersApi, RoleLabels, RoleColors } from '../../services/usersApi';
import type { User, UserRole, UserStats } from '../../services/usersApi';
import { groupsApi } from '../../services/groupsApi';

type TabType = 'all' | 'admins' | 'users' | 'inactive';

export default function UsersAdmin() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('user');
  const [groupsUser, setGroupsUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const limit = 15;

  // API Queries
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', page, activeTab, departmentFilter, searchQuery],
    queryFn: () =>
      usersApi.getUsers({
        page,
        limit,
        role: activeTab === 'admins' ? 'admin' : activeTab === 'users' ? 'user' : undefined,
        isActive: activeTab === 'inactive' ? false : activeTab !== 'all' ? true : undefined,
        department: departmentFilter !== 'all' ? departmentFilter : undefined,
        search: searchQuery || undefined,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['userStats'],
    queryFn: () => usersApi.getStats(),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => usersApi.getDepartments(),
  });

  // Mutations
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      setEditingUser(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => usersApi.activateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    },
  });

  const users = usersData?.users || [];
  const total = usersData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastLogin = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = Date.now();
    const diff = now - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Az önce';
    if (hours < 24) return `${hours} saat önce`;
    if (days === 1) return 'Dün';
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  const toggleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleEditRole = (user: User) => {
    setEditingUser(user);
    setEditRole(user.role);
  };

  const handleSaveRole = () => {
    if (editingUser) {
      updateRoleMutation.mutate({ id: editingUser.id, role: editRole });
    }
  };

  const handleToggleActive = (user: User) => {
    if (user.isActive) {
      deactivateMutation.mutate(user.id);
    } else {
      activateMutation.mutate(user.id);
    }
  };

  const handleDelete = (user: User) => {
    if (confirm(`${user.displayName} kullanıcısını silmek istediğinize emin misiniz?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sistemdeki tüm kullanıcıları yönetin
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-[#1890FF] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Kullanıcı</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats?.total || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-[#1890FF]" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aktif Kullanıcı</p>
              <p className="text-2xl font-semibold text-green-600">{stats?.active || 0}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Admin Sayısı</p>
              <p className="text-2xl font-semibold text-purple-600">{stats?.admins || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bu Hafta Giriş</p>
              <p className="text-2xl font-semibold text-orange-600">{stats?.weeklyLogins || 0}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <LogIn className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          {[
            { key: 'all', label: 'Tüm Kullanıcılar' },
            { key: 'admins', label: 'Adminler' },
            { key: 'users', label: 'Standart Kullanıcılar' },
            { key: 'inactive', label: 'Pasif Kullanıcılar' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as TabType);
                setPage(1);
              }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[#1890FF] text-[#1890FF]'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sub Filters */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setDepartmentFilter('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                departmentFilter === 'all'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-[#1890FF] border-[#1890FF]'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Tüm Departmanlar
            </button>
            {departments?.map((dept) => (
              <button
                key={dept}
                onClick={() => {
                  setDepartmentFilter(dept);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                  departmentFilter === dept
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-[#1890FF] border-[#1890FF]'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {usersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#1890FF]" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mb-4" />
              <p>Kullanıcı bulunamadı</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    E-posta
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Departman
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Son Giriş
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-750 ${
                      !user.isActive ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                            user.isActive ? 'bg-[#1890FF]' : 'bg-gray-400'
                          }`}
                        >
                          {getInitials(user.displayName)}
                        </div>
                        <div>
                          <p className={`font-medium ${user.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                            {user.displayName || user.adUsername}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.adUsername}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${user.isActive ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`}>
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${RoleColors[user.role].bg} ${RoleColors[user.role].text}`}
                      >
                        {RoleLabels[user.role]}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${user.isActive ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`}>
                      {user.department || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {user.lastLogin ? (
                        <span className="text-gray-600 dark:text-gray-300">{formatLastLogin(user.lastLogin)}</span>
                      ) : (
                        <span className="text-orange-500">Hiç giriş yapmadı</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {user.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setGroupsUser(user)}
                          className="p-1.5 text-gray-400 hover:text-[#1890FF] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="Gruplar"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditRole(user)}
                          className="p-1.5 text-gray-400 hover:text-[#1890FF] hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title="Rol Değiştir"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`p-1.5 rounded ${
                            user.isActive
                              ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                              : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          title={user.isActive ? 'Pasif Yap' : 'Aktif Et'}
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
          )}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Toplam <span className="font-medium">{total}</span> kullanıcıdan{' '}
              <span className="font-medium">
                {(page - 1) * limit + 1}-{Math.min(page * limit, total)}
              </span>{' '}
              arası gösteriliyor
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 text-sm border rounded ${
                      page === pageNum
                        ? 'bg-[#1890FF] text-white border-[#1890FF]'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rol Değiştir</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#1890FF] flex items-center justify-center text-white text-lg font-medium">
                  {getInitials(editingUser.displayName)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{editingUser.displayName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{editingUser.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Yeni Rol</label>
                <div className="space-y-2">
                  {(['viewer', 'user', 'supervisor', 'admin'] as UserRole[]).map((role) => (
                    <label
                      key={role}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        editRole === role
                          ? 'border-[#1890FF] bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={editRole === role}
                        onChange={() => setEditRole(role)}
                        className="text-[#1890FF]"
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{RoleLabels[role]}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {role === 'viewer' && 'Sadece görüntüleme yetkisi'}
                          {role === 'user' && 'Standart kullanıcı yetkileri'}
                          {role === 'supervisor' && 'Yönetici seviyesi yetkiler'}
                          {role === 'admin' && 'Tam yönetici yetkisi'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              >
                İptal
              </button>
              <button
                onClick={handleSaveRole}
                disabled={updateRoleMutation.isPending}
                className="px-4 py-2 text-sm bg-[#1890FF] text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
              >
                {updateRoleMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Groups Modal */}
      {groupsUser && (
        <UserGroupsModal
          user={groupsUser}
          onClose={() => setGroupsUser(null)}
          getInitials={getInitials}
        />
      )}
    </div>
  );
}

function UserGroupsModal({
  user,
  onClose,
  getInitials,
}: {
  user: User;
  onClose: () => void;
  getInitials: (name: string) => string;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { data: allGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['allGroups'],
    queryFn: () => groupsApi.getAll(),
  });

  const { data: userGroups = [], isLoading: userGroupsLoading } = useQuery({
    queryKey: ['userGroups', user.id],
    queryFn: () => usersApi.getUserGroups(user.id),
  });

  const memberGroupIds = new Set(userGroups.map((ug: any) => ug.groupId || ug.group?.id));

  // Build tree: filter out project subgroups, then build parent→children map
  const nonProjectGroups = allGroups.filter((g: any) => !g.projectId);
  const groupMap = new Map(nonProjectGroups.map((g: any) => [g.id, g]));
  const childrenMap = new Map<string | null, any[]>();
  for (const g of nonProjectGroups) {
    const pid = g.parentId && groupMap.has(g.parentId) ? g.parentId : null;
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(g);
  }
  const rootGroups = childrenMap.get(null) || [];

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggle = async (groupId: string, isMember: boolean) => {
    setBusy(groupId);
    try {
      if (isMember) {
        await groupsApi.removeMember(groupId, user.id);
      } else {
        await groupsApi.addMember(groupId, user.id);
      }
      queryClient.invalidateQueries({ queryKey: ['userGroups', user.id] });
      queryClient.invalidateQueries({ queryKey: ['allGroups'] });
    } catch (err: any) {
      // silently handle
    } finally {
      setBusy(null);
    }
  };

  const loading = groupsLoading || userGroupsLoading;

  const renderNode = (group: any, depth: number) => {
    const children = childrenMap.get(group.id) || [];
    const hasChildren = children.length > 0;
    const isCollapsed = collapsed.has(group.id);
    const isMember = memberGroupIds.has(group.id);
    const isBusy = busy === group.id;

    return (
      <div key={group.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${
            isMember
              ? 'bg-blue-50 dark:bg-blue-900/20'
              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          {/* Expand/collapse toggle */}
          {hasChildren ? (
            <button
              onClick={() => toggleCollapse(group.id)}
              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0"
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-5 flex-shrink-0" />
          )}

          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isMember}
            onChange={() => handleToggle(group.id, isMember)}
            disabled={isBusy}
            className="rounded border-gray-300 dark:border-gray-600 text-[#1890FF] focus:ring-[#1890FF] flex-shrink-0"
          />

          {/* Label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{group.name}</span>
              {group.isSystem && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded flex-shrink-0">
                  Sistem
                </span>
              )}
              {group.memberCount != null && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                  ({group.memberCount})
                </span>
              )}
            </div>
            {group.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{group.description}</p>
            )}
          </div>

          {isBusy && <Loader2 className="w-4 h-4 animate-spin text-[#1890FF] flex-shrink-0" />}
        </div>

        {/* Children */}
        {hasChildren && !isCollapsed && children.map((child: any) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Grup Atamalari</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1890FF] flex items-center justify-center text-white font-medium">
              {getInitials(user.displayName)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{user.displayName || user.adUsername}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.department || user.adUsername}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#1890FF]" />
            </div>
          ) : rootGroups.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">Henuz grup yok</p>
          ) : (
            <div className="space-y-0.5">
              {rootGroups.map((group: any) => renderNode(group, 0))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {memberGroupIds.size} grup uyesi
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-[#1890FF] text-white rounded-lg hover:bg-blue-600"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
