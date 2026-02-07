/**
 * Application Entity
 *
 * @portal/core - Shared across all modules
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ nullable: true, length: 500 })
  description: string;

  @Column({ length: 500 })
  url: string;

  @Column({ name: 'icon_url', nullable: true, length: 500 })
  iconUrl: string;

  @Column({ name: 'icon_name', nullable: true, length: 50 })
  iconName: string;

  @Column({ nullable: true, length: 50 })
  category: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'open_in_new_tab', default: true })
  openInNewTab: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
