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
import { Group } from './group.entity';

export enum GroupRole {
  MEMBER = 'member',
  LEAD = 'lead',
  MANAGER = 'manager',
}

@Entity('user_groups')
@Unique(['userId', 'groupId'])
export class UserGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'group_id' })
  groupId: string;

  @ManyToOne(() => Group)
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ type: 'varchar', length: 20, default: GroupRole.MEMBER })
  role: GroupRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;
}
