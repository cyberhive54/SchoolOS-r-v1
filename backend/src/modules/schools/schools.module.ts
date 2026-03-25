import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolEntity } from './entities/school.entity';
import { SchoolsService } from './schools.service';
import { GetThemeController } from './endpoints/get-theme/controller';

@Module({
  imports: [TypeOrmModule.forFeature([SchoolEntity])],
  providers: [SchoolsService],
  controllers: [GetThemeController],
  exports: [SchoolsService, TypeOrmModule],
})
export class SchoolsModule {}
