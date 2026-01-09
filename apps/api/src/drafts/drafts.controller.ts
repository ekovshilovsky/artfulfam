import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { DraftsService, CreateDraftDto, UpdateDraftDto } from './drafts.service';

@Controller('drafts')
export class DraftsController {
  constructor(private readonly draftsService: DraftsService) {}

  @Get()
  findAll(@Query('ownerId') ownerId?: string, @Query('status') status?: string) {
    return this.draftsService.findAll({ ownerId, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.draftsService.findOne(id);
  }

  @Post()
  create(@Body() createDraftDto: CreateDraftDto) {
    return this.draftsService.create(createDraftDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDraftDto: UpdateDraftDto) {
    return this.draftsService.update(id, updateDraftDto);
  }

  @Post(':id/validate')
  validate(@Param('id') id: string) {
    return this.draftsService.validate(id);
  }

  @Post(':id/preview')
  createPreview(@Param('id') id: string) {
    return this.draftsService.createPreviewLink(id);
  }
}
