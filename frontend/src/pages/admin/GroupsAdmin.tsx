import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Users,
  Edit2,
  Trash2,
  X,
  Loader2,
  FolderTree,
  UserPlus,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { groupsApi, GroupRoleLabels, GroupRoleColors } from '../../services/groupsApi';
import type { Group, UserGroup, GroupRole } from '../../services/groupsApi';
import { usersApi } from '../../services/usersApi';
import type { User } from '../../services/usersApi';

export default function GroupsAdmin() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRole, setMemberRole] = useState<GroupRole>('member');

  // Queries
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: groupsApi.getAll,
  });

  const { data: groupDetail } = useQuery({
    queryKey: ['group', selectedGroup],
    queryFn: () => groupsApi.getById(selectedGroup!),
    enabled: !!selectedGroup,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-for-groups', memberSearch],
    queryFn: () => usersApi.getUsers({ search: memberSearch, limit: 10 }),
    enabled: showMemberModal && memberSearch.length > 1,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; parentId?: string }) => groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => groupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setSelectedGroup(null);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, userId, role }: { groupId: string; userId: string; role?: GroupRole }) =>
      groupsApi.addMember(groupId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroup] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setMemberSearch('');
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ groupId, userId, role }: { groupId: string; userId: string; role: GroupRole }) =>
      groupsApi.updateMember(groupId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroup] });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupsApi.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', selectedGroup] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const resetForm = () => {
    setShowCreateModal(false);
    setEditingGroup(null);
    setFormName('');
    setFormDescription('');
    setFormParentId('');
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormDescription(group.description || '');
    setFormParentId(group.parentId || '');
    setShowCreateModal(true);
  };

  const handleSubmit = () => {
    const data = {
      name: formName,
      description: formDescription || undefined,
      parentId: formParentId || undefined,
    };

    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build tree structure
  const rootGroups = groups.filter((g) => !g.parentId);
  const getChildren = (parentId: string) => groups.filter((g) => g.parentId === parentId);

  const filteredGroups = searchQuery
    ? groups.filter((g) => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  const renderGroupItem = (group: Group & { memberCount?: number }, depth = 0) => {
    const children = getChildren(group.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedGroups.has(group.id);
    const isSelected = selectedGroup === group.id;

    return (
      <div key={group.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg mx-1 transition-colors ${
            isSelected ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => setSelectedGroup(group.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(group.id); }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <FolderTree className="w-4 h-4 text-gray-400" />
          <span className="flex-1 text-sm font-medium truncate">{group.name}</span>
          {!group.isActive && (
            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">Pasif</span>
          )}
          <span className="text-xs text-gray-400">{(group as any).memberCount || 0}</span>
        </div>
        {hasChildren && isExpanded && children.map((child) => renderGroupItem(child as any, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grup Yönetimi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Departman ve disiplin gruplarını yönetin
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="flex items-center gap-2 bg-[#1890FF] text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Yeni Grup
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <FolderTree className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{groups.length}</p>
              <p className="text-xs text-gray-500">Toplam Grup</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {groups.filter((g) => g.isActive).length}
              </p>
              <p className="text-xs text-gray-500">Aktif Grup</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {groups.reduce((sum, g) => sum + ((g as any).memberCount || 0), 0)}
              </p>
              <p className="text-xs text-gray-500">Toplam Üyelik</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content: Two-panel layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left panel - Group tree */}
        <div className="col-span-5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Grup ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="p-2 max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : filteredGroups ? (
              filteredGroups.map((g) => renderGroupItem(g as any))
            ) : (
              rootGroups.map((g) => renderGroupItem(g as any))
            )}
            {!isLoading && groups.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">Henüz grup yok</p>
            )}
          </div>
        </div>

        {/* Right panel - Group detail */}
        <div className="col-span-7 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {selectedGroup && groupDetail ? (
            <div>
              {/* Group header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{groupDetail.name}</h2>
                  {groupDetail.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{groupDetail.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(groupDetail)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Bu grubu silmek istediğinizden emin misiniz?')) deleteMutation.mutate(selectedGroup); }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Members */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Üyeler ({groupDetail.members?.length || 0})
                  </h3>
                  <button
                    onClick={() => { setShowMemberModal(true); setMemberSearch(''); }}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <UserPlus className="w-4 h-4" />
                    Üye Ekle
                  </button>
                </div>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {groupDetail.members?.map((member: UserGroup) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#1890FF] flex items-center justify-center text-white text-xs font-medium">
                        {member.user?.displayName?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {member.user?.displayName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{member.user?.department}</p>
                      </div>
                      <select
                        value={member.role}
                        onChange={(e) =>
                          updateMemberMutation.mutate({
                            groupId: selectedGroup,
                            userId: member.userId,
                            role: e.target.value as GroupRole,
                          })
                        }
                        className={`text-xs px-2 py-1 rounded-md border-0 ${GroupRoleColors[member.role as GroupRole]?.bg || 'bg-gray-100'} ${GroupRoleColors[member.role as GroupRole]?.text || 'text-gray-700'}`}
                      >
                        <option value="member">Üye</option>
                        <option value="lead">Lider</option>
                        <option value="manager">Yönetici</option>
                      </select>
                      <button
                        onClick={() => {
                          if (confirm('Bu üyeyi gruptan çıkarmak istediğinizden emin misiniz?'))
                            removeMemberMutation.mutate({ groupId: selectedGroup, userId: member.userId });
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!groupDetail.members || groupDetail.members.length === 0) && (
                    <p className="text-center text-gray-400 py-4 text-sm">Bu grupta henüz üye yok</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[300px] text-gray-400">
              <div className="text-center">
                <FolderTree className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Detay görmek için bir grup seçin</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {editingGroup ? 'Grup Düzenle' : 'Yeni Grup'}
              </h3>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grup Adı *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ör. Mekanik Mühendislik"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Grup açıklaması..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Üst Grup</label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                >
                  <option value="">Yok (Kök grup)</option>
                  {groups
                    .filter((g) => g.id !== editingGroup?.id)
                    .map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formName || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-sm bg-[#1890FF] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingGroup ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Üye Ekle</h3>
              <button onClick={() => setShowMemberModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kullanıcı Ara</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="İsim veya e-posta..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as GroupRole)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                >
                  <option value="member">Üye</option>
                  <option value="lead">Lider</option>
                  <option value="manager">Yönetici</option>
                </select>
              </div>

              {/* User search results */}
              {usersData?.users && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {usersData.users.map((user: User) => {
                    const alreadyMember = groupDetail?.members?.some((m: UserGroup) => m.userId === user.id);
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          alreadyMember ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!alreadyMember) {
                            addMemberMutation.mutate({ groupId: selectedGroup, userId: user.id, role: memberRole });
                          }
                        }}
                      >
                        <div className="w-7 h-7 rounded-full bg-[#1890FF] flex items-center justify-center text-white text-xs">
                          {user.displayName?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.displayName}</p>
                          <p className="text-xs text-gray-500 truncate">{user.department}</p>
                        </div>
                        {alreadyMember && <span className="text-xs text-gray-400">Zaten üye</span>}
                        {addMemberMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowMemberModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { GroupsAdmin as GroupsAdminPage };
