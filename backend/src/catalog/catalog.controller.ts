import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// ── DTO imports ───────────────────────────────────────────────────────────────
import { CreateAuthorDto, UpdateAuthorDto } from './dto/author.dto';
import { CreatePublisherDto, UpdatePublisherDto } from './dto/publisher.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { GetBooksQueryDto } from './dto/get-books-query.dto';

@ApiTags('Catalog')
@ApiBearerAuth('JWT')
@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // ─── AUTHORS ───────────────────────────────────────────────────────────────

  @Get('authors')
  @ApiOperation({ summary: 'List all authors' })
  async findAllAuthors() {
    return this.catalogService.findAllAuthors();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Post('authors')
  @ApiOperation({ summary: 'Create author (Super Admin only)' })
  async createAuthor(@Body() dto: CreateAuthorDto) {
    return this.catalogService.createAuthor(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Patch('authors/:id')
  @ApiOperation({ summary: 'Update author details (Super Admin only)' })
  async updateAuthor(@Param('id') id: string, @Body() dto: UpdateAuthorDto) {
    return this.catalogService.updateAuthor(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Delete('authors/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete author (Super Admin only)' })
  async deleteAuthor(@Param('id') id: string) {
    await this.catalogService.deleteAuthor(id);
  }

  // ─── PUBLISHERS ────────────────────────────────────────────────────────────

  @Get('publishers')
  @ApiOperation({ summary: 'List all publishers' })
  async findAllPublishers() {
    return this.catalogService.findAllPublishers();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Post('publishers')
  @ApiOperation({ summary: 'Create publisher (Super Admin only)' })
  async createPublisher(@Body() dto: CreatePublisherDto) {
    return this.catalogService.createPublisher(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Patch('publishers/:id')
  @ApiOperation({ summary: 'Update publisher details (Super Admin only)' })
  async updatePublisher(@Param('id') id: string, @Body() dto: UpdatePublisherDto) {
    return this.catalogService.updatePublisher(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Delete('publishers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete publisher (Super Admin only)' })
  async deletePublisher(@Param('id') id: string) {
    await this.catalogService.deletePublisher(id);
  }

  // ─── CATEGORIES ────────────────────────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'List all categories' })
  async findAllCategories() {
    return this.catalogService.findAllCategories();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Post('categories')
  @ApiOperation({ summary: 'Create category (Super Admin only)' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalogService.createCategory(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update category details (Super Admin only)' })
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.catalogService.updateCategory(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category (Super Admin only)' })
  async deleteCategory(@Param('id') id: string) {
    await this.catalogService.deleteCategory(id);
  }

  // ─── SUPPLIERS ─────────────────────────────────────────────────────────────

  @Get('suppliers')
  @ApiOperation({ summary: 'List all suppliers' })
  async findAllSuppliers() {
    return this.catalogService.findAllSuppliers();
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Post('suppliers')
  @ApiOperation({ summary: 'Create supplier (Super Admin only)' })
  async createSupplier(@Body() dto: CreateSupplierDto) {
    return this.catalogService.createSupplier(dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Patch('suppliers/:id')
  @ApiOperation({ summary: 'Update supplier details (Super Admin only)' })
  async updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.catalogService.updateSupplier(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Delete('suppliers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete supplier (Super Admin only)' })
  async deleteSupplier(@Param('id') id: string) {
    await this.catalogService.deleteSupplier(id);
  }

  // ─── BOOKS ─────────────────────────────────────────────────────────────────

  @Get('books')
  @ApiOperation({ summary: 'List and search books (paginated)' })
  async findAllBooks(@Query() query: GetBooksQueryDto) {
    return this.catalogService.findAllBooks(query);
  }

  @Get('books/barcode/:barcode')
  @ApiOperation({ summary: 'Get book details by barcode (billing lookup, cached)' })
  async findBookByBarcode(@Param('barcode') barcode: string) {
    return this.catalogService.findBookByBarcode(barcode);
  }

  @Get('books/:id')
  @ApiOperation({ summary: 'Get book details by ID (cached)' })
  async findBookById(@Param('id') id: string) {
    return this.catalogService.findBookById(id);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Post('books')
  @ApiOperation({ summary: 'Create book in catalog (Super Admin only)' })
  async createBook(
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBookDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.catalogService.createBook(dto, user.userId, ip);
  }

  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CENTRAL_INVENTORY_MANAGER)
  @Patch('books/:id')
  @ApiOperation({ summary: 'Update book details in catalog (Super Admin only)' })
  async updateBook(
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return this.catalogService.updateBook(id, dto, user.userId, ip);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete('books/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete book from catalog (Super Admin only)' })
  async deleteBook(
    @Req() req: Request,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    await this.catalogService.deleteBook(id, user.userId, ip);
  }
}
