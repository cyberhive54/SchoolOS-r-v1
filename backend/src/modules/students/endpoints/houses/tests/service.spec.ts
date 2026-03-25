import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { HousesService } from '../service';
import { StudentHouseEntity } from '../../../entities/student-house.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});
const mockAudit = () => ({ log: jest.fn() });

describe('HousesService', () => {
  let service: HousesService;
  let repo: ReturnType<typeof mockRepo>;

  const user = { id: 'u1', school_id: 'school1', role: 'admin', email: 'a@b.com' } as never;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        HousesService,
        { provide: getRepositoryToken(StudentHouseEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();
    service = module.get(HousesService);
    repo = module.get(getRepositoryToken(StudentHouseEntity));
  });

  it('creates a house', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.create.mockReturnValue({ id: 'h1', name: 'Red House', school_id: 'school1' });
    repo.save.mockResolvedValue({ id: 'h1', name: 'Red House', school_id: 'school1' });
    const result = await service.create({ name: 'Red House' }, user);
    expect(result.id).toBe('h1');
  });

  it('throws conflict when house name exists', async () => {
    repo.findOne.mockResolvedValue({ id: 'existing' });
    await expect(service.create({ name: 'Red House' }, user)).rejects.toThrow(ConflictException);
  });

  it('throws not found when removing non-existent house', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.remove('missing', user)).rejects.toThrow(NotFoundException);
  });
});
