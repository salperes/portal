import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';
import { Group } from './group.entity';

export enum ProjectRole {
  VIEWER = 'viewer',
  MEMBER = 'member',
  LEAD = 'lead',
  PM = 'pm',
}

@Entity('project_assignments')
@Unique(['projectId', 'userId'])
export class ProjectAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'group_id', nullable: true })
  groupId: string;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'project_role', type: 'varchar', length: 20, default: ProjectRole.MEMBER })
  projectRole: ProjectRole;

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
