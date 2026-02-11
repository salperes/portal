/**
 * User Entity
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

export enum UserRole {
  VIEWER = 'viewer',
  USER = 'user',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
}

export const RoleLevel: Record<UserRole, number> = {
  [UserRole.VIEWER]: 1,
  [UserRole.USER]: 2,
  [UserRole.SUPERVISOR]: 3,
  [UserRole.ADMIN]: 4,
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ad_username', unique: true, length: 100 })
  adUsername: string;

  @Column({ nullable: true, length: 255 })
  email: string;

  @Column({ name: 'display_name', nullable: true, length: 255 })
  displayName: string;

  @Column({ nullable: true, length: 100 })
  department: string;

  @Column({ nullable: true, length: 100 })
  title: string;

  @Column({ nullable: true, length: 50 })
  phone: string;

  @Column({ name: 'manager_id', nullable: true })
  managerId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'manager_id' })
  manager: User;

  @Column({ name: 'avatar_url', nullable: true, length: 500 })
  avatarUrl: string;

  @Column({ default: 'light', length: 20 })
  theme: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  settings: Record<string, any>;

  @Column({ name: 'last_login', nullable: true })
  lastLogin: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  hasMinimumRole(requiredRole: UserRole): boolean {
    return RoleLevel[this.role] >= RoleLevel[requiredRole];
  }
}
