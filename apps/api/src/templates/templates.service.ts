import { Injectable, NotFoundException } from '@nestjs/common';

export interface Template {
  id: string;
  name: string;
  category: string;
  provider: string;
  variants: Array<{
    id: string;
    name: string;
    baseCost: number;
    inStock: boolean;
  }>;
}

@Injectable()
export class TemplatesService {
  // TODO: Replace with database queries
  private readonly templates: Template[] = [
    {
      id: 'tpl_1',
      name: 'Classic T-Shirt',
      category: 'TEE',
      provider: 'printful',
      variants: [
        { id: 'var_1', name: 'S / Black', baseCost: 1299, inStock: true },
        { id: 'var_2', name: 'M / Black', baseCost: 1299, inStock: true },
        { id: 'var_3', name: 'L / Black', baseCost: 1299, inStock: true },
        { id: 'var_4', name: 'XL / Black', baseCost: 1499, inStock: true },
      ],
    },
    {
      id: 'tpl_2',
      name: 'Canvas Print',
      category: 'CANVAS',
      provider: 'printful',
      variants: [
        { id: 'var_5', name: '8x10"', baseCost: 1999, inStock: true },
        { id: 'var_6', name: '12x12"', baseCost: 2499, inStock: true },
        { id: 'var_7', name: '16x20"', baseCost: 3499, inStock: true },
      ],
    },
  ];

  findAll(filters: { category?: string }): Template[] {
    let result = this.templates;

    if (filters.category) {
      result = result.filter(
        (t) => t.category.toLowerCase() === filters.category!.toLowerCase(),
      );
    }

    return result;
  }

  findOne(id: string): Template {
    const template = this.templates.find((t) => t.id === id);
    if (!template) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }
}
