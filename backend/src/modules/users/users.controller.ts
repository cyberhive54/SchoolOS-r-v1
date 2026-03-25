import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolMembershipEntity } from './entities/school-membership.entity';
import { UserEntity } from './entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '@schoolos/types';

@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(SchoolMembershipEntity)
    private readonly membershipRepo: Repository<SchoolMembershipEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  /**
   * GET /users/school-members
   * Returns users who are members of the current school, optionally filtered by role.
   * Roles: teacher | admin | staff | parent | student
   */
  @Get('school-members')
  async listSchoolMembers(
    @CurrentUser() actor: AuthUser,
    @Query('role') role?: string,
  ) {
    const qb = this.membershipRepo
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.user', 'u')
      .where('m.school_id = :school_id', { school_id: actor.school_id })
      .andWhere('m.is_active = true');

    if (role) {
      qb.andWhere('m.role = :role', { role });
    }

    const memberships = await qb.orderBy('u.last_name', 'ASC').getMany();

    return memberships.map((m) => ({
      user_id: m.user_id,
      first_name: m.user?.first_name ?? '',
      last_name: m.user?.last_name ?? '',
      email: m.user?.email ?? '',
      role: m.role,
    }));
  }
}
