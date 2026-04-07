import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { compile, type TargetPlatform } from '@indiforge/core';

@Injectable()
export class ExportsService {
  constructor(private prisma: PrismaService) {}

  async createExport(
    projectId: string,
    userId: string,
    targetPlatform: string
  ) {
    // Get project and indicator definition
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        indicatorDefinition: true,
      },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId) throw new ForbiddenException('Access denied');

    const definition = project.indicatorDefinition;
    if (!definition) throw new NotFoundException('Indicator definition not found');

    // Parse the visual graph
    let graph;
    try {
      graph = JSON.parse(definition.currentDraftGraphJson);
    } catch {
      throw new Error('Invalid graph JSON');
    }

    // Compile to target platform
    const platform = targetPlatform as TargetPlatform;
    const result = compile(graph, [platform]);

    if (result.outputs.length === 0) {
      throw new Error('Failed to generate code');
    }

    const generatedCode = result.outputs[0];

    // Create export job
    const exportJob = await this.prisma.exportJob.create({
      data: {
        versionId: project.currentVersionId || '',
        targetPlatform: targetPlatform.toUpperCase() as 'PINESCRIPT_V5' | 'MQL5' | 'MQL4' | 'NINJATRADER_8',
        status: 'COMPLETED',
        warningsJson: JSON.stringify(generatedCode.warnings || []),
        checksum: this.computeChecksum(generatedCode.code),
      },
    });

    // Store the generated code (in a real app, this would go to S3)
    // For now, we return it directly
    return {
      jobId: exportJob.id,
      platform: targetPlatform,
      code: generatedCode.code,
      warnings: generatedCode.warnings,
      manifest: generatedCode.manifest,
    };
  }

  private computeChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}