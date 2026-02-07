/**
 * Announcement Entity
 *
 * @portal/core - Shared across all modules
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AnnouncementCategory {
  GENERAL = 'general',
  HR = 'hr',
  IT = 'it',
  FINANCE = 'finance',
}

export enum AnnouncementPriority {
  CRITICAL = 'critical',
  IMPORTANT = 'important',
  INFO = 'info',
}

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  content: string;

  @Column({ length: 50 })
  category: AnnouncementCategory;

  @Column({ length: 20, default: AnnouncementPriority.INFO })
  priority: AnnouncementPriority;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'publish_date', default: () => 'NOW()' })
  publishDate: Date;

  @Column({ name: 'expire_date', nullable: true })
  expireDate: Date;

  @Column({ name: 'created_by', nullable: true })
  createdById: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
