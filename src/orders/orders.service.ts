import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Cart } from 'src/cart/cart.entity';
import { CartItem } from 'src/cart/cart-item.entity';
import { ProductsService } from 'src/products/products.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    private readonly productsService: ProductsService,
  ) {}

  async createOrderFromCart(userId: number): Promise<Order> {
    const cart = await this.cartRepository.findOne({
      where: { userId },
      relations: ['items', 'items.product'],
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    let totalAmount = 0;
    for (const item of cart.items) {
      const product = await this.productsService.findOne(item.productId);
      if (item.quantity > product.stock) {
        throw new BadRequestException(
          `Insufficient stock for product ${product.id} (${product.name}). Available: ${product.stock}`,
        );
      }
      const unitPrice = Number(item.unitPrice);
      const lineTotal = unitPrice * item.quantity;
      totalAmount += lineTotal;
    }

    const order = this.orderRepository.create({
      userId,
      totalAmount,
      status: 'PENDING',
    });
    await this.orderRepository.save(order);

    for (const item of cart.items) {
      const product = await this.productsService.findOne(item.productId);
      const unitPrice = Number(item.unitPrice);
      const lineTotal = unitPrice * item.quantity;

      const orderItem = this.orderItemRepository.create({
        orderId: order.id,
        productId: product.id,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      });
      await this.orderItemRepository.save(orderItem);

      product.stock = product.stock - item.quantity;
      await this.productsService.update(product.id, { stock: product.stock });
    }

    await this.cartItemRepository.remove(cart.items);

    const savedOrder = await this.orderRepository.findOne({
      where: { id: order.id },
      relations: ['items', 'items.product'],
    });

    if (!savedOrder) {
      throw new NotFoundException('Order not found after creation');
    }

    return savedOrder;
  }

  async findAllForUser(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { userId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneForUser(userId: number, orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId },
      relations: ['items', 'items.product'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }
}
