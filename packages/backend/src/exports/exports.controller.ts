import { Controller, Post, Get, Body, Param, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('exports')
@Controller('exports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExportsController {
  constructor(private exportsService: ExportsService) {}

  @Post('project/:projectId/:platform')
  @ApiOperation({ summary: 'Export indicator to target platform' })
  async exportIndicator(
    @Param('projectId') projectId: string,
    @Param('platform') platform: string,
    @Request() req: { user: { id: string } },
    @Res() res: Response
  ) {
    const result = await this.exportsService.createExport(
      projectId,
      req.user.id,
      platform
    );

    // Set headers for file download
    const filename = `indicator_${projectId}_${platform}.${platform === 'pinescript_v5' ? 'pine' : 'mq5'}`;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    return res.send(result.code);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get export history for project' })
  async getExports(
    @Param('projectId') projectId: string,
    @Request() req: { user: { id: string } }
  ) {
    // This would query ExportJob table
    // For now, return empty
    return [];
  }
}