import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CreateMappingInput = {
  githubRepo: string;
  vibeKanbanRepoId: string;
};

@Injectable()
export class MappingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.repoProjectMapping.findMany({
      orderBy: { githubRepo: 'asc' },
    });
  }

  async create(dto: CreateMappingInput) {
    const githubRepo = dto.githubRepo.trim().toLowerCase();
    try {
      return await this.prisma.repoProjectMapping.create({
        data: {
          githubRepo,
          vibeKanbanRepoId: dto.vibeKanbanRepoId.trim(),
        },
      });
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(`Mapping already exists for ${githubRepo}`);
      }
      throw e;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.repoProjectMapping.delete({ where: { id } });
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(`Mapping ${id} not found`);
      }
      throw e;
    }
  }

  async count(): Promise<number> {
    return this.prisma.repoProjectMapping.count();
  }
}
