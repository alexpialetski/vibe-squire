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
  label?: string;
};

type UpdateMappingInput = Partial<CreateMappingInput>;

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
          label: dto.label?.trim() || null,
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

  async update(id: string, dto: UpdateMappingInput) {
    const existing = await this.prisma.repoProjectMapping.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Mapping ${id} not found`);
    }

    const githubRepo =
      dto.githubRepo !== undefined
        ? dto.githubRepo.trim().toLowerCase()
        : undefined;

    try {
      return await this.prisma.repoProjectMapping.update({
        where: { id },
        data: {
          ...(githubRepo !== undefined && { githubRepo }),
          ...(dto.vibeKanbanRepoId !== undefined && {
            vibeKanbanRepoId: dto.vibeKanbanRepoId.trim(),
          }),
          ...(dto.label !== undefined && { label: dto.label.trim() || null }),
        },
      });
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          `Mapping already exists for ${githubRepo ?? existing.githubRepo}`,
        );
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
