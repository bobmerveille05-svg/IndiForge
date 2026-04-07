import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { IndicatorsModule } from './indicators/indicators.module';
import { VersionsModule } from './versions/versions.module';
import { ExportsModule } from './exports/exports.module';
import { TemplatesModule } from './templates/templates.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Database
    PrismaModule,
    
    // Feature modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    IndicatorsModule,
    VersionsModule,
    ExportsModule,
    TemplatesModule,
  ],
})
export class AppModule {
  constructor(private configService: ConfigService) {}
}