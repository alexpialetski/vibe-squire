import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRepoMappingDto } from './dto/create-mapping.dto';
import type { UpdateRepoMappingDto } from './dto/update-mapping.dto';

@Injectable()
export class MappingsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.repoProjectMapping.findMany({
      orderBy: { githubRepo: 'asc' },
    });
  }

  async create(dto: CreateRepoMappingDto) {
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
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(`Mapping already exists for ${githubRepo}`);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateRepoMappingDto) {
    const existing = await this.prisma.repoProjectMapping.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Mapping ${id} not found`);
    }
    return this.prisma.repoProjectMapping.update({
      where: { id },
      data: {
        ...(dto.githubRepo !== undefined && {
          githubRepo: dto.githubRepo.trim().toLowerCase(),
        }),
        ...(dto.vibeKanbanRepoId !== undefined && {
          vibeKanbanRepoId: dto.vibeKanbanRepoId.trim(),
        }),
        ...(dto.label !== undefined && { label: dto.label.trim() || null }),
      },
    });
  }

  async remove(id: string) {
    try {
      await this.prisma.repoProjectMapping.delete({ where: { id } });
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code: string }).code === 'P2025'
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
