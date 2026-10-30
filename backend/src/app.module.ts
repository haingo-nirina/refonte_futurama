import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { PromotionsModule } from './promotions/promotions.module';
import { MarquesModule } from './marques/marques.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ResellersModule } from './resellers/resellers.module';
import { PostsModule } from './posts/posts.module';
import { StatsModule } from './stats/stats.module';
import { UploadsModule } from './uploads/uploads.module';
import { DeliveryZonesModule } from './delivery-zones/delivery-zones.module';
import { StoresModule } from './stores/stores.module';
import { LivesModule } from './lives/lives.module';
import { FacebookLiveModule } from './facebook-live/facebook-live.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    PromotionsModule,
    MarquesModule,
    CartModule,
    OrdersModule,
    ReviewsModule,
    ResellersModule,
    PostsModule,
    StatsModule,
    UploadsModule,
    DeliveryZonesModule,
    StoresModule,
    LivesModule,
    FacebookLiveModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
