import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { ownerId: userId },
      include: { indicatorDefinition: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { indicatorDefinition: { include: { versions: true } } },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Access denied');

    return project;
  }

  async create(userId: string, data: { name: string; description?: string }) {
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    return this.prisma.project.create({
      data: {
        ownerId: userId,
        name: data.name,
        slug: `${slug}-${Date.now()}`,
        indicatorDefinition: {
          create: {
            title: data.name,
            description: data.description || '',
          },
        },
      },
      include: { indicatorDefinition: true },
    });
  }

  async update(id: string, userId: string, data: { name?: string; visibility?: string }) {
    const project = await this.findOne(id, userId);

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.visibility && { visibility: data.visibility as never }),
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.project.delete({ where: { id } });
  }
}