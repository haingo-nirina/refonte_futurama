import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { PromotionsService } from '../promotions/promotions.service';
import { RELATION_TYPE, USER_ROLE } from '../common/constants';
import { AdminOnly } from '../auth/decorators/admin-only.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { BulkDeleteProductsDto } from './dto/bulk-delete-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { FindMostViewedQueryDto } from './dto/find-most-viewed-query.dto';
import { FindProductsQueryDto } from './dto/find-products-query.dto';
import { ReplaceProductImagesDto } from './dto/replace-product-images.dto';
import { ReplaceProductRelationsDto } from './dto/replace-product-relations.dto';
import { ReplaceProductSpecsDto } from './dto/replace-product-specs.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly promotionsService: PromotionsService,
  ) {}

  @Post()
  @AdminOnly()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  /**
   * Suppression groupee. En POST plutot qu'en `DELETE /products` : un corps
   * sur un DELETE n'est pas garanti par tous les intermediaires HTTP, et la
   * liste d'identifiants ne tient pas proprement en query string.
   *
   * `HttpCode(200)` : rien n'est cree, le 201 par defaut d'un POST mentirait.
   */
  @Post('bulk-delete')
  @HttpCode(200)
  @AdminOnly()
  removeMany(@Body() dto: BulkDeleteProductsDto) {
    return this.productsService.removeMany(dto);
  }

  /**
   * Lecture publique, mais `OptionalJwtAuthGuard` sert a distinguer l'admin :
   * un produit desactive ne doit pas apparaitre au catalogue, alors que le
   * backoffice doit pouvoir le lister et le rouvrir.
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(
    @Query() query: FindProductsQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.productsService.findAll(query, isAdmin(user));
  }

  /**
   * La « promotion du mois » mise en avant sur l'accueil. Lecture publique.
   *
   * Doit rester declaree AVANT `@Get(':id')` : Nest resout les routes dans
   * l'ordre de declaration, et le `ParseUUIDPipe` de `:id` repondrait 400 sur
   * le segment litteral.
   */
  @Get('featured-promotion')
  findFeaturedPromotion() {
    return this.promotionsService.findFeatured();
  }

  /**
   * La section « Le plus consulte » de l'accueil. Lecture publique.
   *
   * Meme contrainte que `featured-promotion` : a declarer AVANT `@Get(':id')`,
   * sinon le `ParseUUIDPipe` de `:id` repond 400 sur le segment litteral.
   */
  @Get('most-viewed')
  findMostViewed(@Query() query: FindMostViewedQueryDto) {
    return this.productsService.findMostViewed(query);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.productsService.findOne(id, isAdmin(user));
  }

  /**
   * Promotion active sur ce produit, ou `null`. Le prix reduit est calcule a
   * la volee cote serveur : la fiche produit n'a pas a refaire l'arithmetique,
   * et rien n'est stocke sur le produit.
   */
  @Get(':id/active-promotion')
  findActivePromotion(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionsService.getActivePromotionForProduct(id);
  }

  @Get(':id/similar')
  findSimilar(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findRelated(id, RELATION_TYPE.SIMILAR);
  }

  @Get(':id/frequently-bought-together')
  findFrequentlyBoughtTogether(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findRelated(
      id,
      RELATION_TYPE.FREQUENTLY_BOUGHT_TOGETHER,
    );
  }

  @Patch(':id')
  @AdminOnly()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @AdminOnly()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }

  /**
   * Galerie, specifications et produits lies se remplacent en bloc plutot que
   * ligne par ligne : c'est ce que soumet un formulaire d'edition, et ca evite
   * neuf routes la ou trois suffisent. Rien ne reference ces lignes, les
   * recreer est sans consequence.
   */
  @Put(':id/images')
  @AdminOnly()
  replaceImages(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceProductImagesDto,
  ) {
    return this.productsService.replaceImages(id, dto);
  }

  @Put(':id/specs')
  @AdminOnly()
  replaceSpecs(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceProductSpecsDto,
  ) {
    return this.productsService.replaceSpecs(id, dto);
  }

  @Put(':id/relations')
  @AdminOnly()
  replaceRelations(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceProductRelationsDto,
  ) {
    return this.productsService.replaceRelations(id, dto);
  }
}

function isAdmin(user: AuthenticatedUser | undefined): boolean {
  return user?.role === USER_ROLE.ADMIN;
}
