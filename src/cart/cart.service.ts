import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cart } from './cart.entity';
import { Repository } from 'typeorm';
import { CartItem } from './cart-item.entity';
import { ProductsService } from 'src/products/products.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemQuantityDto } from './dto/update-cart-item-quantity.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly productsService: ProductsService,
  ) {}

  private async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });
    if (!cart) {
      cart = this.cartRepository.create({ userId });
      cart = await this.cartRepository.save(cart);
      cart.items = [];
    }
    return cart;
  }

  async getCart(userId: number) {
    const cart = await this.getOrCreateCart(userId);
    const items = (cart.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name ?? '',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: item.quantity * Number(item.unitPrice),
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);
    return { items, totalAmount };
  }

  async addItem(userId: number, dto: AddToCartDto) {
    const product = await this.productsService.findOne(dto.productId);
    const availableStock = Number(product.stock);
    if (dto.quantity > availableStock) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${availableStock}`,
      );
    }
    const cart = await this.getOrCreateCart(userId);
    const existingItem = (cart.items || []).find(
      (i) => i.productId === dto.productId,
    );
    const price = Number(product.price);
    if (existingItem) {
      const newQty = existingItem.quantity + dto.quantity;
      if (newQty > availableStock) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${availableStock}`,
        );
      }
      existingItem.quantity = newQty;
      await this.cartItemRepository.save(existingItem);
    } else {
      const newItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId: product.id,
        quantity: dto.quantity,
        unitPrice: price,
      });
      await this.cartItemRepository.save(newItem);
    }
    return this.getCart(userId);
  }

  async updateItemQuantity(
    userId: number,
    itemId: number,
    dto: UpdateCartItemQuantityDto,
  ) {
    const cart = await this.getOrCreateCart(userId);
    const item = (cart.items || []).find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    const product = await this.productsService.findOne(item.productId);
    if (dto.quantity > Number(product.stock)) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }
    item.quantity = dto.quantity;
    await this.cartItemRepository.save(item);
    return this.getCart(userId);
  }

  async removeItem(userId: number, itemId: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = (cart.items || []).find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    await this.cartItemRepository.remove(item);
    return this.getCart(userId);
  }
}
