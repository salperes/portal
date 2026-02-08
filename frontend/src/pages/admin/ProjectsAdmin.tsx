import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  FolderKanban,
  UserPlus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { projectsApi, ProjectStatusLabels, ProjectStatusColors, ProjectRoleLabels, ProjectRoleColors } from '../../services/projectsApi';
import type { Project, ProjectAssignment, ProjectStatus, ProjectRole } from '../../services/projectsApi';
import { groupsApi } from '../../services/groupsApi';
import type { Group } from '../../services/groupsApi';
import { usersApi } from '../../services/usersApi';
import type { User } from '../../services/usersApi';

export default function ProjectsAdmin() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<ProjectStatus>('draft');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRole, setMemberRole] = useState<ProjectRole>('member');
  const [detailTab, setDetailTab] = useState<'members' | 'subgroups'>('members');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [showGroupMemberPicker, setShowGroupMemberPicker] = useState<string | null>(null);

  // Queries
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', page, statusFilter, searchQuery],
    queryFn: () => projectsApi.getAll({
      page,
      limit,
      status: statusFilter || undefined,
      search: searchQuery || undefined,
    }),
  });

  const { data: projectDetail } = useQuery({
    queryKey: ['project', selectedProject],
    queryFn: () => projectsApi.getById(selectedProject!),
    enabled: !!selectedProject,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-for-projects', memberSearch],
    queryFn: () => usersApi.getUsers({ search: memberSearch, limit: 10 }),
    enabled: showMemberModal && memberSearch.length > 1,
  });

  // Project subgroups
  const { data: projectGroups = [] } = useQuery({
    queryKey: ['project-groups', selectedProject],
    queryFn: () => groupsApi.getAll({ projectId: selectedProject! }),
    enabled: !!selectedProject && detailTab === 'subgroups',
  });

  // Expanded group detail (members)
  const { data: expandedGroupDetail } = useQuery({
    queryKey: ['group-detail', expandedGroup],
    queryFn: () => groupsApi.getById(expandedGroup!),
    enabled: !!expandedGroup,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedProject(null);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ projectId, userId, projectRole }: { projectId: string; userId: string; projectRole?: ProjectRole }) =>
      projectsApi.assignMember(projectId, userId, projectRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setMemberSearch('');
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: ({ projectId, userId, projectRole }: { projectId: string; userId: string; projectRole: ProjectRole }) =>
      projectsApi.updateAssignment(projectId, userId, projectRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', selectedProject] });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      projectsApi.removeAssignment(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', selectedProject] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // Group mutations
  const createGroupMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; projectId: string }) =>
      groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-groups', selectedProject] });
      setShowCreateGroupModal(false);
      setGroupName('');
      setGroupDescription('');
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => groupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-groups', selectedProject] });
      setExpandedGroup(null);
    },
  });

  const addGroupMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupsApi.addMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', expandedGroup] });
      queryClient.invalidateQueries({ queryKey: ['project-groups', selectedProject] });
    },
  });

  const removeGroupMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupsApi.removeMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', expandedGroup] });
      queryClient.invalidateQueries({ queryKey: ['project-groups', selectedProject] });
    },
  });

  const resetForm = () => {
    setShowCreateModal(false);
    setEditingProject(null);
    setFormCode('');
    setFormName('');
    setFormDescription('');
    setFormStatus('draft');
    setFormStartDate('');
    setFormEndDate('');
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormCode(project.code);
    setFormName(project.name);
    setFormDescription(project.description || '');
    setFormStatus(project.status);
    setFormStartDate(project.startDate ? project.startDate.split('T')[0] : '');
    setFormEndDate(project.endDate ? project.endDate.split('T')[0] : '');
    setShowCreateModal(true);
  };

  const handleSubmit = () => {
    const data = {
      code: formCode,
      name: formName,
      description: formDescription || undefined,
      status: formStatus,
      startDate: formStartDate || undefined,
      endDate: formEndDate || undefined,
    };

    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const projects = projectsData?.projects || [];
  const total = projectsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proje Yönetimi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Projeleri oluşturun, üye atayın ve durumlarını takip edin
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreateModal(true); }}
          className="flex items-center gap-2 bg-[#1890FF] text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Yeni Proje
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(['draft', 'active', 'archived'] as ProjectStatus[]).map((status) => (
          <div key={status} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${ProjectStatusColors[status].bg} flex items-center justify-center`}>
                <FolderKanban className={`w-5 h-5 ${ProjectStatusColors[status].text}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {projects.filter((p) => p.status === status).length}
                </p>
                <p className="text-xs text-gray-500">{ProjectStatusLabels[status]}</p>
              </div>
            </div>
          </div>
        ))}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{total}</p>
              <p className="text-xs text-gray-500">Toplam</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Proje kodu veya adı ara..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tüm Durumlar</option>
            <option value="draft">Taslak</option>
            <option value="active">Aktif</option>
            <option value="archived">Arşiv</option>
          </select>
        </div>
      </div>

      {/* Projects table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Kod</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Proje</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Durum</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sahip</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Üye</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tarihler</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer ${
                    selectedProject === project.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                  onClick={() => setSelectedProject(project.id)}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-medium text-blue-600">{project.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</p>
                    {project.description && (
                      <p className="text-xs text-gray-500 truncate max-w-xs">{project.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-md ${ProjectStatusColors[project.status].bg} ${ProjectStatusColors[project.status].text}`}>
                      {ProjectStatusLabels[project.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {project.owner?.displayName || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {(project as any).memberCount || 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {project.startDate ? new Date(project.startDate).toLocaleDateString('tr-TR') : '-'}
                      {project.endDate && ` → ${new Date(project.endDate).toLocaleDateString('tr-TR')}`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(project); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Bu projeyi silmek istediğinizden emin misiniz?'))
                            deleteMutation.mutate(project.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">
                    Henüz proje yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500">
              Toplam {total} proje, Sayfa {page}/{totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Project detail panel */}
      {selectedProject && projectDetail && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-blue-600">{projectDetail.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-md ${ProjectStatusColors[projectDetail.status].bg} ${ProjectStatusColors[projectDetail.status].text}`}>
                    {ProjectStatusLabels[projectDetail.status]}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{projectDetail.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {detailTab === 'members' && (
                  <button
                    onClick={() => { setShowMemberModal(true); setMemberSearch(''); }}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
                  >
                    <UserPlus className="w-4 h-4" />
                    Uye Ata
                  </button>
                )}
                {detailTab === 'subgroups' && (
                  <button
                    onClick={() => { setShowCreateGroupModal(true); setGroupName(''); setGroupDescription(''); }}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Yeni Alt Grup
                  </button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-3">
              <button
                onClick={() => setDetailTab('members')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  detailTab === 'members'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Uyeler ({projectDetail.assignments?.length || 0})
              </button>
              <button
                onClick={() => setDetailTab('subgroups')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  detailTab === 'subgroups'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Alt Gruplar ({projectGroups.length})
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Members Tab */}
            {detailTab === 'members' && (
              <div className="space-y-2">
                {projectDetail.assignments?.map((assignment: ProjectAssignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#1890FF] flex items-center justify-center text-white text-xs font-medium">
                      {assignment.user?.displayName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {assignment.user?.displayName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{assignment.user?.department}</p>
                    </div>
                    <select
                      value={assignment.projectRole}
                      onChange={(e) =>
                        updateAssignmentMutation.mutate({
                          projectId: selectedProject,
                          userId: assignment.userId,
                          projectRole: e.target.value as ProjectRole,
                        })
                      }
                      className={`text-xs px-2 py-1 rounded-md border-0 ${ProjectRoleColors[assignment.projectRole as ProjectRole]?.bg || 'bg-gray-100'} ${ProjectRoleColors[assignment.projectRole as ProjectRole]?.text || 'text-gray-700'}`}
                    >
                      <option value="viewer">Goruntuleyen</option>
                      <option value="member">Uye</option>
                      <option value="lead">Lider</option>
                      <option value="pm">Proje Yoneticisi</option>
                    </select>
                    <button
                      onClick={() => {
                        if (confirm('Bu atamayi kaldirmak istediginizden emin misiniz?'))
                          removeAssignmentMutation.mutate({ projectId: selectedProject, userId: assignment.userId });
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {(!projectDetail.assignments || projectDetail.assignments.length === 0) && (
                  <p className="text-center text-gray-400 py-4 text-sm">Henuz uye atanmamis</p>
                )}
              </div>
            )}

            {/* Subgroups Tab */}
            {detailTab === 'subgroups' && (
              <div className="space-y-2">
                {projectGroups.map((group: Group) => (
                  <div
                    key={group.id}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden"
                  >
                    {/* Group header */}
                    <div
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                      onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-gray-500 truncate">{group.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {group.memberCount || 0} uye
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGroupMemberPicker(group.id);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="Uye ekle"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`"${group.name}" grubunu silmek istediginizden emin misiniz?`))
                            deleteGroupMutation.mutate(group.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Grubu sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedGroup === group.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>

                    {/* Expanded: group members */}
                    {expandedGroup === group.id && (
                      <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-750/50 p-3">
                        {/* Member picker inline */}
                        {showGroupMemberPicker === group.id && (
                          <div className="mb-3 p-2 bg-white dark:bg-gray-700 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs font-medium text-gray-500 mb-2">Proje uyesini gruba ekle:</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {projectDetail.assignments?.map((a: ProjectAssignment) => {
                                const alreadyInGroup = expandedGroupDetail?.members?.some(
                                  (m) => m.userId === a.userId,
                                );
                                return (
                                  <div
                                    key={a.userId}
                                    className={`flex items-center gap-2 p-1.5 rounded ${
                                      alreadyInGroup
                                        ? 'opacity-40'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer'
                                    }`}
                                    onClick={() => {
                                      if (!alreadyInGroup) {
                                        addGroupMemberMutation.mutate({ groupId: group.id, userId: a.userId });
                                      }
                                    }}
                                  >
                                    <div className="w-6 h-6 rounded-full bg-[#1890FF] flex items-center justify-center text-white text-[10px]">
                                      {a.user?.displayName?.charAt(0) || '?'}
                                    </div>
                                    <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">
                                      {a.user?.displayName}
                                    </span>
                                    {alreadyInGroup && <span className="text-[10px] text-gray-400">Mevcut</span>}
                                    {addGroupMemberMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                  </div>
                                );
                              })}
                              {(!projectDetail.assignments || projectDetail.assignments.length === 0) && (
                                <p className="text-xs text-gray-400 text-center py-2">
                                  Once projeye uye atayin
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => setShowGroupMemberPicker(null)}
                              className="mt-2 w-full text-xs text-gray-500 hover:text-gray-700 py-1"
                            >
                              Kapat
                            </button>
                          </div>
                        )}

                        {/* Current group members */}
                        {expandedGroupDetail?.members && expandedGroupDetail.members.length > 0 ? (
                          <div className="space-y-1">
                            {expandedGroupDetail.members.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center gap-2 p-1.5 rounded hover:bg-white dark:hover:bg-gray-700"
                              >
                                <div className="w-6 h-6 rounded-full bg-[#1890FF] flex items-center justify-center text-white text-[10px]">
                                  {m.user?.displayName?.charAt(0) || '?'}
                                </div>
                                <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">
                                  {m.user?.displayName}
                                </span>
                                <span className="text-[10px] text-gray-400">{m.user?.department}</span>
                                <button
                                  onClick={() =>
                                    removeGroupMemberMutation.mutate({ groupId: group.id, userId: m.userId })
                                  }
                                  className="p-0.5 text-gray-400 hover:text-red-500"
                                  title="Uyeyi cikar"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 text-center py-2">
                            Bu grupta henuz uye yok
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {projectGroups.length === 0 && (
                  <p className="text-center text-gray-400 py-4 text-sm">
                    Henuz alt grup olusturulmamis
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {editingProject ? 'Proje Düzenle' : 'Yeni Proje'}
              </h3>
              <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proje Kodu *</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="ör. PRJ-001"
                    maxLength={20}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durum</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  >
                    <option value="draft">Taslak</option>
                    <option value="active">Aktif</option>
                    <option value="archived">Arşiv</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proje Adı *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ör. Yeni Fabrika Projesi"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Proje açıklaması..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Başlangıç</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bitiş</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                  />
                </div>
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
                disabled={!formCode || !formName || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 text-sm bg-[#1890FF] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingProject ? 'Güncelle' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Subgroup Modal */}
      {showCreateGroupModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Yeni Alt Grup</h3>
              <button onClick={() => setShowCreateGroupModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grup Adi *</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="or. Tasarim Ekibi"
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aciklama</label>
                <input
                  type="text"
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Opsiyonel aciklama"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={() =>
                  createGroupMutation.mutate({
                    name: groupName,
                    description: groupDescription || undefined,
                    projectId: selectedProject,
                  })
                }
                disabled={!groupName.trim() || createGroupMutation.isPending}
                className="px-4 py-2 text-sm bg-[#1890FF] text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {createGroupMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : 'Olustur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">Üye Ata</h3>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proje Rolü</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as ProjectRole)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                >
                  <option value="viewer">Görüntüleyici</option>
                  <option value="member">Üye</option>
                  <option value="lead">Lider</option>
                  <option value="pm">Proje Yöneticisi</option>
                </select>
              </div>

              {usersData?.users && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {usersData.users.map((user: User) => {
                    const alreadyAssigned = projectDetail?.assignments?.some((a: ProjectAssignment) => a.userId === user.id);
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          alreadyAssigned ? 'opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer'
                        }`}
                        onClick={() => {
                          if (!alreadyAssigned) {
                            assignMutation.mutate({ projectId: selectedProject, userId: user.id, projectRole: memberRole });
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
                        {alreadyAssigned && <span className="text-xs text-gray-400">Zaten atanmış</span>}
                        {assignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
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

export { ProjectsAdmin as ProjectsAdminPage };
