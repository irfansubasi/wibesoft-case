import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { OrderItem } from 'src/orders/order-item.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) {}

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);

    const orderItems = await this.orderItemRepository.find({
      where: { productId: id },
      relations: ['order'],
    });

    if (orderItems.length > 0) {
      const hasPending = orderItems.some(
        (item) => item.order?.status === 'PENDING',
      );
      if (hasPending) {
        throw new BadRequestException(
          'This product is in pending orders and cannot be deleted.',
        );
      }
      for (const item of orderItems) {
        item.productId = null;
        await this.orderItemRepository.save(item);
      }
    }

    await this.productRepository.remove(product);
  }
}
