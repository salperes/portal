import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus, ProjectAssignment, ProjectRole, Group } from '../common/entities';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  private static readonly DEFAULT_SUBGROUPS = [
    'Elektronik',
    'Kalite',
    'Mekanik',
    'Optik',
    'Otomasyon',
    'Proje Yönetim',
    'Test',
    'Yazılım',
  ];

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectAssignment)
    private readonly assignmentRepository: Repository<ProjectAssignment>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  async create(dto: CreateProjectDto, ownerId: string): Promise<Project> {
    // Unique code check
    const existing = await this.projectRepository.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(`"${dto.code}" kodlu bir proje zaten mevcut`);
    }

    const project = this.projectRepository.create({
      ...dto,
      ownerId,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
    });

    const saved = await this.projectRepository.save(project);

    // Auto-assign owner as PM
    const assignment = this.assignmentRepository.create({
      projectId: saved.id,
      userId: ownerId,
      projectRole: ProjectRole.PM,
    });
    await this.assignmentRepository.save(assignment);

    // Auto-create default subgroups
    const defaultGroups = ProjectsService.DEFAULT_SUBGROUPS.map((name) =>
      this.groupRepository.create({ name, projectId: saved.id }),
    );
    await this.groupRepository.save(defaultGroups);
    this.logger.log(`Default subgroups created for project ${saved.code}: ${ProjectsService.DEFAULT_SUBGROUPS.length} groups`);

    this.logger.log(`Project created: ${saved.code} - ${saved.name} (${saved.id})`);
    return saved;
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: ProjectStatus;
    search?: string;
  }): Promise<{ projects: Project[]; total: number }> {
    const { page = 1, limit = 20, status, search } = options || {};

    const queryBuilder = this.projectRepository.createQueryBuilder('project')
      .leftJoinAndSelect('project.owner', 'owner');

    if (status) {
      queryBuilder.andWhere('project.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(project.code ILIKE :search OR project.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);
    queryBuilder.orderBy('project.createdAt', 'DESC');

    const [projects, total] = await queryBuilder.getManyAndCount();

    // Add member counts
    const memberCounts = await this.assignmentRepository
      .createQueryBuilder('pa')
      .select('pa.project_id', 'projectId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('pa.project_id')
      .getRawMany();

    const countMap = new Map(memberCounts.map((mc) => [mc.projectId, parseInt(mc.count)]));

    const enriched = projects.map((p) => ({
      ...p,
      memberCount: countMap.get(p.id) || 0,
    }));

    return { projects: enriched, total };
  }

  async findOne(id: string): Promise<Project & { assignments: ProjectAssignment[] }> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!project) {
      throw new NotFoundException('Proje bulunamadı');
    }

    const assignments = await this.assignmentRepository.find({
      where: { projectId: id },
      relations: ['user', 'group'],
      order: { projectRole: 'ASC', assignedAt: 'ASC' },
    });

    return { ...project, assignments };
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Proje bulunamadı');
    }

    // Code uniqueness check
    if (dto.code && dto.code !== project.code) {
      const existing = await this.projectRepository.findOne({ where: { code: dto.code } });
      if (existing) {
        throw new ConflictException(`"${dto.code}" kodlu bir proje zaten mevcut`);
      }
    }

    if (dto.code !== undefined) project.code = dto.code;
    if (dto.name !== undefined) project.name = dto.name;
    if (dto.description !== undefined) project.description = dto.description;
    if (dto.status !== undefined) project.status = dto.status;
    if (dto.startDate) project.startDate = new Date(dto.startDate);
    if (dto.endDate) project.endDate = new Date(dto.endDate);

    const saved = await this.projectRepository.save(project);
    this.logger.log(`Project updated: ${saved.code} (${saved.id})`);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException('Proje bulunamadı');
    }

    // Remove all assignments first
    await this.assignmentRepository.delete({ projectId: id });
    await this.projectRepository.remove(project);
    this.logger.log(`Project deleted: ${project.code} (${id})`);
  }

  // Assignment management
  async getMembers(projectId: string): Promise<ProjectAssignment[]> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Proje bulunamadı');
    }

    return this.assignmentRepository.find({
      where: { projectId },
      relations: ['user', 'group'],
      order: { projectRole: 'ASC', assignedAt: 'ASC' },
    });
  }

  async assignMember(
    projectId: string,
    userId: string,
    projectRole: ProjectRole = ProjectRole.MEMBER,
    groupId?: string,
  ): Promise<ProjectAssignment> {
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Proje bulunamadı');
    }

    const existing = await this.assignmentRepository.findOne({
      where: { projectId, userId },
    });
    if (existing) {
      throw new ConflictException('Kullanıcı zaten bu projeye atanmış');
    }

    const assignment = this.assignmentRepository.create({
      projectId,
      userId,
      groupId: groupId || undefined,
      projectRole,
    });
    const saved = await this.assignmentRepository.save(assignment);
    this.logger.log(`Member assigned to project ${project.code}: user ${userId} as ${projectRole}`);

    return (await this.assignmentRepository.findOne({
      where: { id: saved.id },
      relations: ['user', 'group'],
    }))!;
  }

  async updateAssignment(
    projectId: string,
    userId: string,
    projectRole: ProjectRole,
    groupId?: string,
  ): Promise<ProjectAssignment> {
    const assignment = await this.assignmentRepository.findOne({
      where: { projectId, userId },
      relations: ['user', 'group'],
    });
    if (!assignment) {
      throw new NotFoundException('Atama bulunamadı');
    }

    assignment.projectRole = projectRole;
    if (groupId !== undefined) assignment.groupId = groupId as string;

    const saved = await this.assignmentRepository.save(assignment);
    this.logger.log(`Assignment updated in project ${projectId}: user ${userId} → ${projectRole}`);
    return saved;
  }

  async removeAssignment(projectId: string, userId: string): Promise<void> {
    const assignment = await this.assignmentRepository.findOne({
      where: { projectId, userId },
    });
    if (!assignment) {
      throw new NotFoundException('Atama bulunamadı');
    }

    await this.assignmentRepository.remove(assignment);
    this.logger.log(`Assignment removed from project ${projectId}: user ${userId}`);
  }
}
