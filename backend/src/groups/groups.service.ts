import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group, UserGroup, GroupRole } from '../common/entities';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>,
  ) {}

  async create(dto: CreateGroupDto): Promise<Group> {
    // Unique name check
    const existing = await this.groupRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`"${dto.name}" adında bir grup zaten mevcut`);
    }

    // Parent check
    if (dto.parentId) {
      const parent = await this.groupRepository.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException('Üst grup bulunamadı');
      }
    }

    const group = this.groupRepository.create(dto);
    const saved = await this.groupRepository.save(group);
    this.logger.log(`Group created: ${saved.name} (${saved.id})`);
    return saved;
  }

  async findAll(projectId?: string): Promise<Group[]> {
    const where: any = {};
    if (projectId) {
      where.projectId = projectId;
    }

    const groups = await this.groupRepository.find({
      where,
      relations: ['parent', 'children'],
      order: { name: 'ASC' },
    });

    // Add member counts
    const memberCounts = await this.userGroupRepository
      .createQueryBuilder('ug')
      .select('ug.group_id', 'groupId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ug.group_id')
      .getRawMany();

    const countMap = new Map(memberCounts.map((mc) => [mc.groupId, parseInt(mc.count)]));

    return groups.map((g) => ({
      ...g,
      memberCount: countMap.get(g.id) || 0,
    }));
  }

  async findOne(id: string): Promise<Group & { members: UserGroup[] }> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!group) {
      throw new NotFoundException('Grup bulunamadı');
    }

    const members = await this.userGroupRepository.find({
      where: { groupId: id },
      relations: ['user'],
      order: { role: 'ASC', joinedAt: 'ASC' },
    });

    return { ...group, members };
  }

  async update(id: string, dto: UpdateGroupDto): Promise<Group> {
    const group = await this.groupRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException('Grup bulunamadı');
    }

    // Name uniqueness check
    if (dto.name && dto.name !== group.name) {
      const existing = await this.groupRepository.findOne({ where: { name: dto.name } });
      if (existing) {
        throw new ConflictException(`"${dto.name}" adında bir grup zaten mevcut`);
      }
    }

    // Parent check
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ConflictException('Grup kendisinin üst grubu olamaz');
      }
      const parent = await this.groupRepository.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException('Üst grup bulunamadı');
      }
    }

    Object.assign(group, dto);
    const saved = await this.groupRepository.save(group);
    this.logger.log(`Group updated: ${saved.name} (${saved.id})`);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const group = await this.groupRepository.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException('Grup bulunamadı');
    }

    // Check for members
    const memberCount = await this.userGroupRepository.count({ where: { groupId: id } });
    if (memberCount > 0) {
      throw new ConflictException(`Bu grupta ${memberCount} üye var. Önce üyeleri çıkarın.`);
    }

    // Check for child groups
    const childCount = await this.groupRepository.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ConflictException(`Bu grubun ${childCount} alt grubu var. Önce alt grupları kaldırın.`);
    }

    await this.groupRepository.remove(group);
    this.logger.log(`Group deleted: ${group.name} (${id})`);
  }

  // Member management
  async addMember(groupId: string, userId: string, role: GroupRole = GroupRole.MEMBER): Promise<UserGroup> {
    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Grup bulunamadı');
    }

    const existing = await this.userGroupRepository.findOne({
      where: { groupId, userId },
    });
    if (existing) {
      throw new ConflictException('Kullanıcı zaten bu grubun üyesi');
    }

    const userGroup = this.userGroupRepository.create({ groupId, userId, role });
    const saved = await this.userGroupRepository.save(userGroup);
    this.logger.log(`Member added to group ${group.name}: user ${userId} as ${role}`);

    return (await this.userGroupRepository.findOne({
      where: { id: saved.id },
      relations: ['user', 'group'],
    }))!;
  }

  async updateMemberRole(groupId: string, userId: string, role: GroupRole): Promise<UserGroup> {
    const userGroup = await this.userGroupRepository.findOne({
      where: { groupId, userId },
      relations: ['user', 'group'],
    });
    if (!userGroup) {
      throw new NotFoundException('Üyelik bulunamadı');
    }

    userGroup.role = role;
    const saved = await this.userGroupRepository.save(userGroup);
    this.logger.log(`Member role updated in group ${groupId}: user ${userId} → ${role}`);
    return saved;
  }

  async removeMember(groupId: string, userId: string): Promise<void> {
    const userGroup = await this.userGroupRepository.findOne({
      where: { groupId, userId },
    });
    if (!userGroup) {
      throw new NotFoundException('Üyelik bulunamadı');
    }

    await this.userGroupRepository.remove(userGroup);
    this.logger.log(`Member removed from group ${groupId}: user ${userId}`);
  }
}
