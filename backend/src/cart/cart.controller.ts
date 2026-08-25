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
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { SessionQueryDto } from './dto/session-query.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@Query() query: SessionQueryDto) {
    return this.cartService.getCart(query.session_id);
  }

  @Post('items')
  addItem(@Query() query: SessionQueryDto, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(query.session_id, dto);
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
