import { Controller, Get, Put, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IndicatorsService } from './indicators.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('indicators')
@Controller('indicators')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IndicatorsController {
  constructor(private indicatorsService: IndicatorsService) {}

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get indicator definition for project' })
  async getDefinition(
    @Param('projectId') projectId: string,
    @Request() req: { user: { id: string } }
  ) {
    return this.indicatorsService.findDefinition(projectId, req.user.id);
  }

  @Put('project/:projectId/graph')
  @ApiOperation({ summary: 'Save visual graph' })
  async saveGraph(
    @Param('projectId') projectId: string,
    @Body() body: { graphJson: string },
    @Request() req: { user: { id: string } }
  ) {
    return this.indicatorsService.saveGraph(projectId, req.user.id, body.graphJson);
  }

  @Post('project/:projectId/version')
  @ApiOperation({ summary: 'Create new version' })
  async createVersion(
    @Param('projectId') projectId: string,
    @Body() body: { changeNote?: string },
    @Request() req: { user: { id: string } }
  ) {
    return this.indicatorsService.createVersion(projectId, req.user.id, body.changeNote || '');
  }
}