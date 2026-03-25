import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { GuardiansService } from '../service';
import { GuardianEntity } from '../../../entities/guardian.entity';
import { StudentGuardianEntity } from '../../../entities/student-guardian.entity';
import { StudentEntity } from '../../../entities/student.entity';
import { AuditService } from '../../../../../modules/platform/audit/audit.service';

const mockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findByIds: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  count: jest.fn(),
});
const mockAudit = () => ({ log: jest.fn() });

describe('GuardiansService', () => {
  let service: GuardiansService;
  let studentRepo: ReturnType<typeof mockRepo>;

  const user = { id: 'u1', school_id: 'school1', role: 'admin', email: 'a@b.com' } as never;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GuardiansService,
        { provide: getRepositoryToken(GuardianEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(StudentGuardianEntity), useFactory: mockRepo },
        { provide: getRepositoryToken(StudentEntity), useFactory: mockRepo },
        { provide: AuditService, useFactory: mockAudit },
      ],
    }).compile();
    service = module.get(GuardiansService);
    studentRepo = module.get(getRepositoryToken(StudentEntity));
  });

  it('throws NotFoundException when student not found on findAll', async () => {
    studentRepo.findOne.mockResolvedValue(null);
    await expect(service.findAll('missing', 'school1')).rejects.toThrow(NotFoundException);
  });

  it('returns empty array when no guardians', async () => {
    studentRepo.findOne.mockResolvedValue({ id: 's1' });
    const linkRepo = service['linkRepo'];
    (linkRepo.find as jest.Mock).mockResolvedValue([]);
    const result = await service.findAll('s1', 'school1');
    expect(result).toHaveLength(0);
  });

  it('throws NotFoundException on remove when link not found', async () => {
    studentRepo.findOne.mockResolvedValue({ id: 's1' });
    const linkRepo = service['linkRepo'];
    (linkRepo.findOne as jest.Mock).mockResolvedValue(null);
    await expect(service.remove('s1', 'g1', user)).rejects.toThrow(NotFoundException);
  });
});
