import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Shield, Trash2, UserPlus, Users, FolderOpen, Briefcase, FileText, Lock } from 'lucide-react';
import { documentsApi } from '../../services/documentsApi';
import type { FolderPermissionRule, PermissionRule } from '../../services/documentsApi';
import { groupsApi } from '../../services/groupsApi';
import { usersApi } from '../../services/usersApi';
import { projectsApi } from '../../services/projectsApi';

interface PermissionsModalProps {
  resourceType: 'folder' | 'document';
  resourceId: string;
  resourceName: string;
  onClose: () => void;
}

const PERMISSION_LABELS: Record<string, string> = {
  read: 'Okuma',
  write: 'Yazma',
  delete: 'Silme',
  manage: 'Yonetim',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  user: 'Kullanici',
  group: 'Grup',
};

type TargetTab = 'user' | 'group' | 'project';

export function PermissionsModal({ resourceType, resourceId, resourceName, onClose }: PermissionsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TargetTab>('user');
  const [targetId, setTargetId] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['read']);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const isDocument = resourceType === 'document';
  const queryKey = isDocument ? ['document-permissions', resourceId] : ['folder-permissions', resourceId];

  // Fetch existing rules
  const { data: rawRules = [], isLoading: rulesLoading } = useQuery({
    queryKey,
    queryFn: () =>
      isDocument
        ? documentsApi.getDocumentPermissions(resourceId)
        : documentsApi.getFolderPermissions(resourceId),
  });

  // Split rules into self and inherited (only for documents)
  const selfRules = isDocument
    ? (rawRules as PermissionRule[]).filter((r) => r.source === 'self')
    : (rawRules as FolderPermissionRule[]);
  const inheritedRules = isDocument
    ? (rawRules as PermissionRule[]).filter((r) => r.source === 'inherited')
    : [];

  // Fetch users for picker
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.getUsers({ limit: 200, isActive: true }),
    enabled: activeTab === 'user',
  });

  // Fetch groups for picker (all groups, no project filter)
  const { data: groups = [] } = useQuery({
    queryKey: ['groups-list'],
    queryFn: () => groupsApi.getAll(),
    enabled: activeTab === 'group',
  });

  // Fetch projects for project tab
  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsApi.getAll({ limit: 100 }),
    enabled: activeTab === 'project',
  });

  // Fetch project groups when a project is selected
  const { data: projectGroups = [], isLoading: projectGroupsLoading } = useQuery({
    queryKey: ['project-groups', selectedProjectId],
    queryFn: () => groupsApi.getAll({ projectId: selectedProjectId }),
    enabled: activeTab === 'project' && !!selectedProjectId,
  });

  const [isBulkAdding, setIsBulkAdding] = useState(false);

  const addMutation = useMutation({
    mutationFn: (data: { targetType: 'user' | 'group'; targetId: string; permissions: string[] }) =>
      isDocument
        ? documentsApi.addDocumentPermission(resourceId, data)
        : documentsApi.addFolderPermission(resourceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setTargetId('');
      setSelectedPerms(['read']);
      setSearchTerm('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (ruleId: string) =>
      isDocument
        ? documentsApi.removeDocumentPermission(resourceId, ruleId)
        : documentsApi.removeFolderPermission(resourceId, ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const users = usersData?.users || [];
  const projects = projectsData?.projects || [];

  const filteredUsers = searchTerm
    ? users.filter(
        (u) =>
          u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.adUsername?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : users;

  const filteredGroups = searchTerm
    ? groups.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : groups;

  const filteredProjectGroups = searchTerm
    ? projectGroups.filter((g) => g.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : projectGroups;

  const togglePerm = (perm: string) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleTabChange = (tab: TargetTab) => {
    setActiveTab(tab);
    setTargetId('');
    setSearchTerm('');
    if (tab !== 'project') {
      setSelectedProjectId('');
    }
  };

  const handleAdd = async () => {
    if (selectedPerms.length === 0) return;

    // Project tab: "all" means assign to every project group
    if (activeTab === 'project' && (targetId === '__all__' || !targetId) && projectGroups.length > 0) {
      setIsBulkAdding(true);
      try {
        for (const g of projectGroups) {
          if (isDocument) {
            await documentsApi.addDocumentPermission(resourceId, {
              targetType: 'group',
              targetId: g.id,
              permissions: selectedPerms,
            });
          } else {
            await documentsApi.addFolderPermission(resourceId, {
              targetType: 'group',
              targetId: g.id,
              permissions: selectedPerms,
            });
          }
        }
        queryClient.invalidateQueries({ queryKey });
        setTargetId('');
        setSelectedPerms(['read']);
        setSearchTerm('');
      } finally {
        setIsBulkAdding(false);
      }
      return;
    }

    if (!targetId) return;
    // For project tab with specific group, still assign to the group
    const actualTargetType = activeTab === 'project' ? 'group' : activeTab;
    addMutation.mutate({ targetType: actualTargetType as 'user' | 'group', targetId, permissions: selectedPerms });
  };

  const tabBtnClass = (tab: TargetTab) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      activeTab === tab
        ? 'bg-blue-600 text-white'
        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
    }`;

  const renderRuleItem = (rule: FolderPermissionRule | PermissionRule, canDelete: boolean) => (
    <div
      key={rule.id}
      className={`flex items-center justify-between p-3 rounded-lg border ${
        canDelete
          ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
          : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600/50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              rule.targetType === 'user'
                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}
          >
            {TARGET_TYPE_LABELS[rule.targetType] || rule.targetType}
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {rule.targetName}
          </span>
          {!canDelete && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400">
              <Lock className="w-3 h-3" />
              Miras
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1">
          {rule.permissions.map((p) => (
            <span
              key={p}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            >
              {PERMISSION_LABELS[p] || p}
            </span>
          ))}
        </div>
      </div>
      {canDelete && (
        <button
          onClick={() => removeMutation.mutate(rule.id)}
          disabled={removeMutation.isPending}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors ml-2"
          title="Kurali sil"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Erisim Yonetimi</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              -- {isDocument ? '📄' : '📁'} {resourceName}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Add new rule */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Yeni Erisim Kurali Ekle
            </h4>

            {/* Target type tabs */}
            <div className="flex gap-2">
              <button onClick={() => handleTabChange('user')} className={tabBtnClass('user')}>
                <UserPlus className="w-3.5 h-3.5" />
                Kullanici
              </button>
              <button onClick={() => handleTabChange('group')} className={tabBtnClass('group')}>
                <Users className="w-3.5 h-3.5" />
                Grup
              </button>
              <button onClick={() => handleTabChange('project')} className={tabBtnClass('project')}>
                <Briefcase className="w-3.5 h-3.5" />
                Proje
              </button>
            </div>

            {/* Project selector (only for project tab) */}
            {activeTab === 'project' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Proje Secin
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setTargetId('');
                    setSearchTerm('');
                  }}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">-- Proje secin --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Target search + select */}
            {(activeTab !== 'project' || selectedProjectId) && (
              <div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    activeTab === 'user'
                      ? 'Kullanici ara...'
                      : activeTab === 'group'
                        ? 'Grup ara...'
                        : 'Proje grubu ara...'
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mb-2"
                />

                {activeTab === 'project' && projectGroupsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : activeTab === 'project' && projectGroups.length === 0 && !projectGroupsLoading ? (
                  <div className="text-center py-4 text-sm text-gray-400">
                    Bu projeye ait grup bulunamadi.
                    <br />
                    <span className="text-xs">Once projeye alt gruplar tanimlayin.</span>
                  </div>
                ) : (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    size={activeTab === 'project' ? 5 : 4}
                  >
                    {activeTab === 'project' ? (
                      <>
                        <option value="__all__">
                          Tum Proje Gruplari ({filteredProjectGroups.length} grup)
                        </option>
                        {filteredProjectGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </>
                    ) : (
                      <>
                        <option value="" disabled>
                          {activeTab === 'user' ? 'Kullanici secin' : 'Grup secin'}
                        </option>
                        {activeTab === 'user'
                          ? filteredUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.displayName || u.adUsername} {u.department ? `(${u.department})` : ''}
                              </option>
                            ))
                          : filteredGroups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.name}
                              </option>
                            ))}
                      </>
                    )}
                  </select>
                )}
              </div>
            )}

            {/* Permissions */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Izinler
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer border transition-colors ${
                      selectedPerms.includes(key)
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPerms.includes(key)}
                      onChange={() => togglePerm(key)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Add button */}
            <button
              onClick={handleAdd}
              disabled={
                selectedPerms.length === 0 ||
                addMutation.isPending ||
                isBulkAdding ||
                (activeTab === 'project'
                  ? !selectedProjectId || projectGroups.length === 0
                  : !targetId)
              }
              className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addMutation.isPending || isBulkAdding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  {activeTab === 'project' && (targetId === '__all__' || !targetId)
                    ? `Tum Gruplara Yetki Ver (${projectGroups.length})`
                    : 'Erisim Kurali Ekle'}
                </>
              )}
            </button>
          </div>

          {/* Self rules list */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              {isDocument ? <FileText className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
              {isDocument ? 'Dokuman Erisim Kurallari' : 'Mevcut Erisim Kurallari'}
              {selfRules.length > 0 && (
                <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                  {selfRules.length}
                </span>
              )}
            </h4>

            {rulesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : selfRules.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                {isDocument
                  ? 'Bu dokumana tanimli ozel erisim kurali yok.'
                  : 'Bu klasore tanimli erisim kurali yok.'}
                <br />
                <span className="text-xs">Varsayilan: Tum kullanicilar erisebilir</span>
              </div>
            ) : (
              <div className="space-y-2">
                {selfRules.map((rule) => renderRuleItem(rule, true))}
              </div>
            )}
          </div>

          {/* Inherited rules (only for documents) */}
          {isDocument && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Klasorden Miras Alinan Kurallar
                {inheritedRules.length > 0 && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                    {inheritedRules.length}
                  </span>
                )}
              </h4>

              {inheritedRules.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-400">
                  Ust klasorde tanimli erisim kurali yok.
                </div>
              ) : (
                <div className="space-y-2">
                  {inheritedRules.map((rule) => renderRuleItem(rule, false))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
