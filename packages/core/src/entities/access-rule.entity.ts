import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ResourceType {
  FOLDER = 'folder',
  DOCUMENT = 'document',
  PROJECT = 'project',
}

export enum RuleType {
  GRANT = 'grant',
  DENY = 'deny',
}

export enum TargetType {
  USER = 'user',
  GROUP = 'group',
  ROLE = 'role',
  PROJECT_ROLE = 'project_role',
}

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  MANAGE = 'manage',
}

@Entity('access_rules')
export class AccessRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 20 })
  resourceType: ResourceType;

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ name: 'rule_type', type: 'varchar', length: 10 })
  ruleType: RuleType;

  @Column({ name: 'target_type', type: 'varchar', length: 20 })
  targetType: TargetType;

  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId: string;

  @Column({ name: 'target_role', type: 'varchar', length: 50, nullable: true })
  targetRole: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string;

  @Column({ type: 'simple-array' })
  permissions: string[];

  @Column({ default: true })
  inherit: boolean;

  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
