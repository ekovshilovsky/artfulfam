import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TemplatesService } from '../templates/templates.service';
import { randomUUID } from 'crypto';

export interface CreateDraftDto {
  ownerId: string;
  templateId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  variants?: Array<{
    templateVariantId: string;
    enabled: boolean;
    priceOverride?: number;
  }>;
}

export interface UpdateDraftDto {
  title?: string;
  description?: string;
  imageUrl?: string;
  variants?: Array<{
    templateVariantId: string;
    enabled: boolean;
    priceOverride?: number;
  }>;
}

export interface Draft {
  id: string;
  ownerId: string;
  templateId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  variants: Array<{
    templateVariantId: string;
    enabled: boolean;
    priceOverride?: number;
  }>;
  previewToken?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class DraftsService {
  // TODO: Replace with database
  private drafts: Draft[] = [];

  constructor(private readonly templatesService: TemplatesService) {}

  findAll(filters: { ownerId?: string; status?: string }): Draft[] {
    let result = this.drafts;

    if (filters.ownerId) {
      result = result.filter((d) => d.ownerId === filters.ownerId);
    }

    if (filters.status) {
      result = result.filter(
        (d) => d.status.toLowerCase() === filters.status!.toLowerCase(),
      );
    }

    return result;
  }

  findOne(id: string): Draft {
    const draft = this.drafts.find((d) => d.id === id);
    if (!draft) {
      throw new NotFoundException(`Draft ${id} not found`);
    }
    return draft;
  }

  create(dto: CreateDraftDto): Draft {
    // Verify template exists
    const template = this.templatesService.findOne(dto.templateId);

    // Default variants from template
    const variants =
      dto.variants ||
      template.variants.map((v) => ({
        templateVariantId: v.id,
        enabled: true,
      }));

    const draft: Draft = {
      id: `draft_${randomUUID()}`,
      ownerId: dto.ownerId,
      templateId: dto.templateId,
      title: dto.title,
      description: dto.description,
      imageUrl: dto.imageUrl,
      status: 'DRAFT',
      variants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.drafts.push(draft);
    return draft;
  }

  update(id: string, dto: UpdateDraftDto): Draft {
    const draft = this.findOne(id);

    if (draft.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot update a published draft');
    }

    if (dto.title !== undefined) draft.title = dto.title;
    if (dto.description !== undefined) draft.description = dto.description;
    if (dto.imageUrl !== undefined) draft.imageUrl = dto.imageUrl;
    if (dto.variants !== undefined) draft.variants = dto.variants;

    draft.updatedAt = new Date().toISOString();
    return draft;
  }

  validate(id: string): { valid: boolean; errors: string[] } {
    const draft = this.findOne(id);
    const errors: string[] = [];

    if (!draft.title || draft.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!draft.imageUrl) {
      errors.push('Product image is required');
    }

    const enabledVariants = draft.variants.filter((v) => v.enabled);
    if (enabledVariants.length === 0) {
      errors.push('At least one variant must be enabled');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  createPreviewLink(id: string): { previewUrl: string; expiresAt: string } {
    const draft = this.findOne(id);

    // Generate preview token
    const token = randomUUID();
    draft.previewToken = token;

    // Preview expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // TODO: Use actual storefront URL from config
    const storefrontUrl =
      process.env.STOREFRONT_URL || 'http://localhost:3000';

    return {
      previewUrl: `${storefrontUrl}/preview/${draft.id}?t=${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  }
}
