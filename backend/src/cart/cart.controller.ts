import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { SessionQueryDto } from './dto/session-query.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

/**
 * Le panier reste ouvert aux visiteurs non connectes : `OptionalJwtAuthGuard`
 * n'exige pas de token, mais permet de rattacher le panier au compte quand il
 * y en a un.
 */
@Controller('cart')
@UseGuards(OptionalJwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(
    @Query() query: SessionQueryDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.cartService.getCart(query.session_id, user?.userId);
  }

  @Post('items')
  addItem(
    @Query() query: SessionQueryDto,
    @Body() dto: AddCartItemDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.cartService.addItem(query.session_id, dto, user?.userId);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.cartService.removeItem(itemId);
  }
}
