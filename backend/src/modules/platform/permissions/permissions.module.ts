import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { PermissionEntity } from './entities/permission.entity';
import { SchoolMembershipEntity } from '../../users/entities/school-membership.entity';
import { PermissionsService } from './permissions.service';

/**
 * PermissionsModule — Global module so PermissionsService can be injected
 * anywhere without repeated imports.
 *
 * Imports SchoolMembershipEntity repository directly (not via UsersModule) to
 * avoid circular module dependencies.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RolePermissionEntity,
      PermissionEntity,
      SchoolMembershipEntity,
    ]),
  ],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
