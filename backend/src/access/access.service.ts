import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccessRule,
  ResourceType,
  RuleType,
  TargetType,
  User,
  UserRole,
  UserGroup,
  ProjectAssignment,
} from '../common/entities';
import { CreateAccessRuleDto } from './dto/create-access-rule.dto';
import { RedisService } from '../common/services';

@Injectable()
export class AccessService {
  private readonly logger = new Logger(AccessService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectRepository(AccessRule)
    private readonly ruleRepository: Repository<AccessRule>,
    @InjectRepository(UserGroup)
    private readonly userGroupRepository: Repository<UserGroup>,
    @InjectRepository(ProjectAssignment)
    private readonly assignmentRepository: Repository<ProjectAssignment>,
    private readonly redisService: RedisService,
  ) {}

  async createRule(dto: CreateAccessRuleDto, createdById: string): Promise<AccessRule> {
    const rule = this.ruleRepository.create({
      ...dto,
      createdById,
    });
    const saved = await this.ruleRepository.save(rule);
    this.logger.log(`Access rule created: ${saved.id} by ${createdById}`);

    // Invalidate cache
    await this.invalidateCache(dto.resourceType, dto.resourceId);

    return saved;
  }

  async findRules(filters?: {
    resourceType?: ResourceType;
    resourceId?: string;
    targetType?: TargetType;
  }): Promise<AccessRule[]> {
    const queryBuilder = this.ruleRepository.createQueryBuilder('rule')
      .leftJoinAndSelect('rule.createdBy', 'createdBy');

    if (filters?.resourceType) {
      queryBuilder.andWhere('rule.resourceType = :resourceType', { resourceType: filters.resourceType });
    }
    if (filters?.resourceId) {
      queryBuilder.andWhere('rule.resourceId = :resourceId', { resourceId: filters.resourceId });
    }
    if (filters?.targetType) {
      queryBuilder.andWhere('rule.targetType = :targetType', { targetType: filters.targetType });
    }

    queryBuilder.orderBy('rule.createdAt', 'DESC');
    return queryBuilder.getMany();
  }

  async removeRule(id: string): Promise<void> {
    const rule = await this.ruleRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Erişim kuralı bulunamadı');
    }

    await this.invalidateCache(rule.resourceType, rule.resourceId);
    await this.ruleRepository.remove(rule);
    this.logger.log(`Access rule deleted: ${id}`);
  }

  /**
   * Permission Resolution Algorithm
   * 1. Admin → always allowed
   * 2. Check deny rules (user-specific, group, role, project_role)
   * 3. Check grant rules (user-specific, group, role, project_role)
   * 4. Default: deny
   */
  async checkPermission(
    userId: string,
    user: User,
    resourceType: ResourceType,
    resourceId: string,
    permission: string,
  ): Promise<{ allowed: boolean; reason: string }> {
    // Step 1: Admin bypass
    if (user.role === UserRole.ADMIN) {
      return { allowed: true, reason: 'Admin yetkisi' };
    }

    // Check cache
    const cacheKey = `access:${userId}:${resourceType}:${resourceId}:${permission}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Load user's groups and project assignments
    const userGroups = await this.userGroupRepository.find({ where: { userId } });
    const groupIds = userGroups.map((ug) => ug.groupId);

    const projectAssignments = await this.assignmentRepository.find({ where: { userId } });

    // Load all rules for this resource
    const rules = await this.ruleRepository.find({
      where: { resourceType, resourceId },
    });

    // Step 2: Check deny rules
    for (const rule of rules.filter((r) => r.ruleType === RuleType.DENY)) {
      if (this.ruleMatchesUser(rule, userId, user, groupIds, projectAssignments) &&
          rule.permissions.includes(permission)) {
        const result = { allowed: false, reason: `Deny kuralı: ${rule.id}` };
        await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
        return result;
      }
    }

    // Step 3: Check grant rules
    for (const rule of rules.filter((r) => r.ruleType === RuleType.GRANT)) {
      if (this.ruleMatchesUser(rule, userId, user, groupIds, projectAssignments) &&
          rule.permissions.includes(permission)) {
        const result = { allowed: true, reason: `Grant kuralı: ${rule.id}` };
        await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
        return result;
      }
    }

    // Step 4: Default deny
    const result = { allowed: false, reason: 'Varsayılan: erişim yok' };
    await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  /**
   * Get all resources a user can access
   */
  async getUserPermissions(userId: string): Promise<AccessRule[]> {
    const userGroups = await this.userGroupRepository.find({ where: { userId } });
    const groupIds = userGroups.map((ug) => ug.groupId);

    const queryBuilder = this.ruleRepository.createQueryBuilder('rule');

    const conditions: string[] = [];
    const params: any = {};

    // User-specific rules
    conditions.push('(rule.targetType = :userType AND rule.targetId = :userId)');
    params.userType = TargetType.USER;
    params.userId = userId;

    // Group rules
    if (groupIds.length > 0) {
      conditions.push('(rule.targetType = :groupType AND rule.targetId IN (:...groupIds))');
      params.groupType = TargetType.GROUP;
      params.groupIds = groupIds;
    }

    queryBuilder.where(conditions.join(' OR '), params);
    queryBuilder.andWhere('rule.ruleType = :grantType', { grantType: RuleType.GRANT });

    return queryBuilder.getMany();
  }

  /**
   * Get all users who can access a resource
   */
  async getResourceAccessors(resourceType: ResourceType, resourceId: string): Promise<AccessRule[]> {
    return this.ruleRepository.find({
      where: { resourceType, resourceId, ruleType: RuleType.GRANT },
      relations: ['createdBy'],
    });
  }

  private ruleMatchesUser(
    rule: AccessRule,
    userId: string,
    user: User,
    groupIds: string[],
    projectAssignments: ProjectAssignment[],
  ): boolean {
    switch (rule.targetType) {
      case TargetType.USER:
        return rule.targetId === userId;

      case TargetType.GROUP:
        return groupIds.includes(rule.targetId);

      case TargetType.ROLE:
        return user.role === rule.targetRole;

      case TargetType.PROJECT_ROLE:
        return projectAssignments.some(
          (pa) => pa.projectId === rule.projectId && pa.projectRole === rule.targetRole,
        );

      default:
        return false;
    }
  }

  private async invalidateCache(resourceType: ResourceType, resourceId: string): Promise<void> {
    const pattern = `access:*:${resourceType}:${resourceId}:*`;
    await this.redisService.deleteByPattern(pattern);
  }
}
