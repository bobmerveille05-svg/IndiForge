import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class IndicatorsService {
  constructor(private prisma: PrismaService) {}

  async findDefinition(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { indicatorDefinition: true },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Access denied');

    return project.indicatorDefinition;
  }

  async saveGraph(projectId: string, userId: string, graphJson: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Access denied');

    const definition = await this.prisma.indicatorDefinition.upsert({
      where: { projectId },
      create: {
        projectId,
        title: project.name,
        currentDraftGraphJson: graphJson,
        latestSemanticHash: this.computeHash(graphJson),
      },
      update: {
        currentDraftGraphJson: graphJson,
        latestSemanticHash: this.computeHash(graphJson),
      },
    });

    return definition;
  }

  async createVersion(projectId: string, userId: string, changeNote: string) {
    const definition = await this.findDefinition(projectId, userId);
    
    // Get latest version number
    const latestVersion = await this.prisma.indicatorVersion.findFirst({
      where: { indicatorDefinitionId: definition.id },
      orderBy: { versionNumber: 'desc' },
    });

    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    const version = await this.prisma.indicatorVersion.create({
      data: {
        indicatorDefinitionId: definition.id,
        versionNumber: newVersionNumber,
        visualGraphJson: definition.currentDraftGraphJson,
        canonicalIrJson: '{}',
        validationReportJson: '{}',
        createdBy: userId,
        changeNote: changeNote || `Version ${newVersionNumber}`,
      },
    });

    // Update project current version
    await this.prisma.project.update({
      where: { id: projectId },
      data: { currentVersionId: version.id },
    });

    return version;
  }

  private computeHash(json: string): string {
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}