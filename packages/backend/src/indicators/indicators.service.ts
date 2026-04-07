import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { compile, validateVisualGraph, convertVisualToIr } from '@indiforge/core';
import type { TargetPlatform } from '@indiforge/shared';

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

    // Also compile the IR and validate
    let irJson = '{}';
    let validationJson = '{}';
    
    try {
      const graph = JSON.parse(graphJson);
      const ir = convertVisualToIr(graph, {
        name: project.name,
        displayType: 'overlay',
        platforms: ['pinescript_v5'],
      });
      irJson = JSON.stringify(ir);
      
      const validation = validateVisualGraph(graph, ['pinescript_v5']);
      validationJson = JSON.stringify(validation);
    } catch (e) {
      console.error('Failed to compile IR:', e);
    }

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
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { indicatorDefinition: true },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Access denied');

    const definition = project.indicatorDefinition;
    if (!definition) throw new NotFoundException('Indicator definition not found');
    
    // Get latest version number
    const latestVersion = await this.prisma.indicatorVersion.findFirst({
      where: { indicatorDefinitionId: definition.id },
      orderBy: { versionNumber: 'desc' },
    });

    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    // Compile IR and validation at version creation time
    let canonicalIrJson = '{}';
    let validationReportJson = '{}';
    
    try {
      const graph = JSON.parse(definition.currentDraftGraphJson);
      
      // Convert to IR
      const ir = convertVisualToIr(graph, {
        name: definition.title,
        displayType: definition.displayType as 'overlay' | 'separate_pane',
        platforms: definition.selectedPlatforms as TargetPlatform[],
      });
      canonicalIrJson = JSON.stringify(ir);
      
      // Validate
      const validation = validateVisualGraph(graph, definition.selectedPlatforms as TargetPlatform[]);
      validationReportJson = JSON.stringify(validation);
    } catch (e) {
      console.error('Failed to compile version:', e);
    }

    const version = await this.prisma.indicatorVersion.create({
      data: {
        indicatorDefinitionId: definition.id,
        versionNumber: newVersionNumber,
        visualGraphJson: definition.currentDraftGraphJson,
        canonicalIrJson,
        validationReportJson,
        generatorVersion: '1.0.0',
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