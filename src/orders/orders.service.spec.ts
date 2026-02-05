import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { Cart } from 'src/cart/cart.entity';
import { CartItem } from 'src/cart/cart-item.entity';
import { ProductsService } from 'src/products/products.service';
import { Product } from 'src/products/product.entity';

const mockProduct: Product = {
  id: 1,
  name: 'Product A',
  description: 'Desc',
  price: 10,
  imageUrl: null,
  stock: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCartItem: CartItem = {
  id: 1,
  cartId: 1,
  productId: 1,
  quantity: 2,
  unitPrice: 10,
  cart: {} as Cart,
  product: mockProduct,
};

const mockCart: Cart = {
  id: 1,
  userId: 1,
  items: [mockCartItem],
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {} as never,
};

const mockOrder: Order = {
  id: 1,
  userId: 1,
  totalAmount: 20,
  status: 'PENDING',
  items: [],
  createdAt: new Date(),
};

describe('OrdersService', () => {
  let service: OrdersService;

  const mockOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockOrderItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCartRepository = {
    findOne: jest.fn(),
  };

  const mockCartItemRepository = {
    remove: jest.fn(),
  };

  const mockProductsService = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        { provide: getRepositoryToken(Cart), useValue: mockCartRepository },
        {
          provide: getRepositoryToken(CartItem),
          useValue: mockCartItemRepository,
        },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('createOrderFromCart', () => {
    it('should throw BadRequestException when cart is empty', async () => {
      mockCartRepository.findOne.mockResolvedValue(null);

      await expect(service.createOrderFromCart(1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createOrderFromCart(1)).rejects.toThrow(
        'Cart is empty',
      );

      expect(mockCartRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['items', 'items.product'],
      });
      expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when cart has no items', async () => {
      mockCartRepository.findOne.mockResolvedValue({ ...mockCart, items: [] });

      await expect(service.createOrderFromCart(1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createOrderFromCart(1)).rejects.toThrow(
        'Cart is empty',
      );
      expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when product stock is insufficient', async () => {
      mockCartRepository.findOne.mockResolvedValue(mockCart);
      mockProductsService.findOne.mockResolvedValue({
        ...mockProduct,
        stock: 1,
      });

      await expect(service.createOrderFromCart(1)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createOrderFromCart(1)).rejects.toThrow(
        /Insufficient stock/,
      );
      expect(mockProductsService.findOne).toHaveBeenCalledWith(1);
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    it('should create order, order items, decrement stock, clear cart and return order', async () => {
      mockCartRepository.findOne.mockResolvedValue(mockCart);
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      const createdOrder = {
        userId: 1,
        totalAmount: 20,
        status: 'PENDING',
      };
      mockOrderRepository.create.mockReturnValue(createdOrder);
      mockOrderRepository.save.mockImplementation((entity: { id?: number }) => {
        if (entity && typeof entity === 'object')
          (entity as { id?: number }).id = 1;
        return Promise.resolve({ ...entity, id: 1 } as Order);
      });
      mockOrderItemRepository.create.mockReturnValue({});
      mockOrderItemRepository.save.mockResolvedValue({});
      mockProductsService.update.mockResolvedValue({
        ...mockProduct,
        stock: 8,
      });

      const savedOrder = {
        ...mockOrder,
        items: [{ productId: 1, quantity: 2, unitPrice: 10, lineTotal: 20 }],
      };
      mockOrderRepository.findOne.mockResolvedValue(savedOrder);

      const result = await service.createOrderFromCart(1);

      expect(mockCartRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['items', 'items.product'],
      });
      expect(mockProductsService.findOne).toHaveBeenCalledWith(1);
      expect(mockOrderRepository.create).toHaveBeenCalledWith({
        userId: 1,
        totalAmount: 20,
        status: 'PENDING',
      });
      expect(mockOrderRepository.save).toHaveBeenCalled();
      expect(mockOrderItemRepository.create).toHaveBeenCalledWith({
        orderId: 1,
        productId: 1,
        quantity: 2,
        unitPrice: 10,
        lineTotal: 20,
      });
      expect(mockProductsService.update).toHaveBeenCalledWith(1, { stock: 8 });
      expect(mockCartItemRepository.remove).toHaveBeenCalledWith(
        mockCart.items,
      );
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['items', 'items.product'],
      });
      expect(result).toEqual(savedOrder);
    });

    it('should throw NotFoundException when order not found after creation', async () => {
      mockCartRepository.findOne.mockResolvedValue(mockCart);
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockOrderRepository.create.mockReturnValue({});
      mockOrderRepository.save.mockResolvedValue({ id: 1 });
      mockOrderItemRepository.create.mockReturnValue({});
      mockOrderItemRepository.save.mockResolvedValue({});
      mockProductsService.update.mockResolvedValue({});
      mockCartItemRepository.remove.mockResolvedValue(undefined);
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.createOrderFromCart(1)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.createOrderFromCart(1)).rejects.toThrow(
        'Order not found after creation',
      );
    });
  });

  describe('findAllForUser', () => {
    it('should return orders for user ordered by createdAt DESC', async () => {
      const orders = [mockOrder];
      mockOrderRepository.find.mockResolvedValue(orders);

      const result = await service.findAllForUser(1);

      expect(mockOrderRepository.find).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['items', 'items.product'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(orders);
    });
  });

  describe('findOneForUser', () => {
    it('should return order when found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOneForUser(1, 1);

      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        relations: ['items', 'items.product'],
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneForUser(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOneForUser(1, 999)).rejects.toThrow(
        'Order not found',
      );
    });
  });

  describe('updateStatusForUser', () => {
    it('should update status and return order', async () => {
      const updatedOrder = { ...mockOrder, status: 'COMPLETED' as OrderStatus };
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue(updatedOrder);

      const result = await service.updateStatusForUser(1, 1, 'COMPLETED');

      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        relations: ['items', 'items.product'],
      });
      expect(mockOrderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'COMPLETED' }),
      );
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw NotFoundException when order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatusForUser(1, 999, 'COMPLETED'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateStatusForUser(1, 999, 'COMPLETED'),
      ).rejects.toThrow('Order not found');
      expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });
  });
});
