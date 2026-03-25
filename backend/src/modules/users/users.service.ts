import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { SchoolMembershipEntity } from './entities/school-membership.entity';
import type { UserProfile } from '@schoolos/types';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(SchoolMembershipEntity)
    private readonly membershipRepo: Repository<SchoolMembershipEntity>,
  ) {}

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException({
        error: { code: 'USER_NOT_FOUND', message: 'User not found.' },
      });
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  async findMembership(
    schoolId: string,
    userId: string,
  ): Promise<SchoolMembershipEntity | null> {
    return this.membershipRepo.findOne({
      where: { school_id: schoolId, user_id: userId, is_active: true },
    });
  }

  async findMembershipBySchoolAndUser(
    schoolId: string,
    userId: string,
  ): Promise<SchoolMembershipEntity | null> {
    return this.findMembership(schoolId, userId);
  }

  toProfile(user: UserEntity): UserProfile {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: user.is_active,
      created_at: user.created_at.toISOString(),
    };
  }
}
