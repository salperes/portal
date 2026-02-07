import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull, Or } from 'typeorm';
import { Announcement } from '../common/entities/announcement.entity';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from './dto';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
  ) {}

  async create(dto: CreateAnnouncementDto, userId: string): Promise<Announcement> {
    const announcement = this.announcementRepository.create({
      ...dto,
      createdById: userId,
      publishDate: dto.publishDate ? new Date(dto.publishDate) : new Date(),
      expireDate: dto.expireDate ? new Date(dto.expireDate) : undefined,
    });

    const saved = await this.announcementRepository.save(announcement);
    this.logger.log(`Announcement created: ${saved.id} by ${userId}`);
    return saved;
  }

  async findAll(includeInactive = false): Promise<Announcement[]> {
    const now = new Date();

    if (includeInactive) {
      return this.announcementRepository.find({
        relations: ['createdBy'],
        order: { publishDate: 'DESC' },
      });
    }

    return this.announcementRepository.find({
      where: {
        isActive: true,
        publishDate: LessThanOrEqual(now),
        expireDate: Or(IsNull(), MoreThanOrEqual(now)),
      },
      relations: ['createdBy'],
      order: { priority: 'ASC', publishDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Announcement> {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!announcement) {
      throw new NotFoundException(`Duyuru bulunamadı: ${id}`);
    }

    return announcement;
  }

  async update(id: string, dto: UpdateAnnouncementDto): Promise<Announcement> {
    const announcement = await this.findOne(id);

    if (dto.title !== undefined) announcement.title = dto.title;
    if (dto.content !== undefined) announcement.content = dto.content;
    if (dto.category !== undefined) announcement.category = dto.category;
    if (dto.priority !== undefined) announcement.priority = dto.priority;
    if (dto.isActive !== undefined) announcement.isActive = dto.isActive;
    if (dto.publishDate) announcement.publishDate = new Date(dto.publishDate);
    if (dto.expireDate) announcement.expireDate = new Date(dto.expireDate);

    const saved = await this.announcementRepository.save(announcement);
    this.logger.log(`Announcement updated: ${id}`);
    return saved;
  }

  async remove(id: string): Promise<void> {
    const announcement = await this.findOne(id);
    await this.announcementRepository.remove(announcement);
    this.logger.log(`Announcement deleted: ${id}`);
  }

  async getLatest(limit = 5): Promise<Announcement[]> {
    const now = new Date();

    return this.announcementRepository.find({
      where: {
        isActive: true,
        publishDate: LessThanOrEqual(now),
        expireDate: Or(IsNull(), MoreThanOrEqual(now)),
      },
      relations: ['createdBy'],
      order: { priority: 'ASC', publishDate: 'DESC' },
      take: limit,
    });
  }
}
