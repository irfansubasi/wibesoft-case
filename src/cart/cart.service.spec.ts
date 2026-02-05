import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { Cart } from './cart.entity';
import { CartItem } from './cart-item.entity';
import { ProductsService } from 'src/products/products.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemQuantityDto } from './dto/update-cart-item-quantity.dto';
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

describe('CartService', () => {
  let service: CartService;

  const mockCartRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCartItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockProductsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(Cart), useValue: mockCartRepository },
        {
          provide: getRepositoryToken(CartItem),
          useValue: mockCartItemRepository,
        },
        { provide: ProductsService, useValue: mockProductsService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('getCart', () => {
    it('should return cart with items and totalAmount when cart exists', async () => {
      mockCartRepository.findOne.mockResolvedValue(mockCart);

      const result = await service.getCart(1);

      expect(mockCartRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 1 },
        relations: ['items', 'items.product'],
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 1,
        productId: 1,
        productName: 'Product A',
        quantity: 2,
        unitPrice: 10,
        lineTotal: 20,
      });
      expect(result.totalAmount).toBe(20);
    });

    it('should create cart when user has no cart and return empty items', async () => {
      mockCartRepository.findOne.mockResolvedValue(null);
      mockCartRepository.create.mockReturnValue({ userId: 1 });
      mockCartRepository.save.mockImplementation((entity: { id?: number }) => {
        if (entity && typeof entity === 'object')
          (entity as { id?: number }).id = 1;
        return Promise.resolve({ ...entity, id: 1, items: [] });
      });

      const result = await service.getCart(1);

      expect(mockCartRepository.create).toHaveBeenCalledWith({ userId: 1 });
      expect(mockCartRepository.save).toHaveBeenCalled();
      expect(result.items).toEqual([]);
      expect(result.totalAmount).toBe(0);
    });
  });

  describe('addItem', () => {
    const addDto: AddToCartDto = { productId: 1, quantity: 2 };

    it('should throw BadRequestException when quantity exceeds stock', async () => {
      mockProductsService.findOne.mockResolvedValue({
        ...mockProduct,
        stock: 1,
      });

      await expect(service.addItem(1, addDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.addItem(1, addDto)).rejects.toThrow(
        /Insufficient stock. Available: 1/,
      );
      expect(mockCartItemRepository.create).not.toHaveBeenCalled();
    });

    it('should create new cart item when product not in cart', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockCartRepository.findOne.mockResolvedValue({ ...mockCart, items: [] });
      mockCartItemRepository.create.mockReturnValue({});
      mockCartItemRepository.save.mockResolvedValue({});

      const result = await service.addItem(1, addDto);

      expect(mockCartItemRepository.create).toHaveBeenCalledWith({
        cartId: 1,
        productId: 1,
        quantity: 2,
        unitPrice: 10,
      });
      expect(mockCartItemRepository.save).toHaveBeenCalled();
      expect(result.items).toBeDefined();
      expect(result.totalAmount).toBeDefined();
    });

    it('should update quantity when product already in cart', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockCartRepository.findOne.mockResolvedValue(mockCart);
      mockCartItemRepository.save.mockResolvedValue({
        ...mockCartItem,
        quantity: 5,
      });

      const result = await service.addItem(1, { productId: 1, quantity: 3 });

      expect(mockCartItemRepository.create).not.toHaveBeenCalled();
      expect(mockCartItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 5 }),
      );
      expect(result.items).toBeDefined();
    });

    it('should throw BadRequestException when existing item + new quantity exceeds stock', async () => {
      mockProductsService.findOne.mockResolvedValue({
        ...mockProduct,
        stock: 5,
      });
      mockCartRepository.findOne.mockResolvedValue(mockCart);

      await expect(
        service.addItem(1, { productId: 1, quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addItem(1, { productId: 1, quantity: 10 }),
      ).rejects.toThrow(/Insufficient stock. Available: 5/);
      expect(mockCartItemRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateItemQuantity', () => {
    const updateDto: UpdateCartItemQuantityDto = { quantity: 3 };

    it('should throw NotFoundException when cart item not found', async () => {
      mockCartRepository.findOne.mockResolvedValue({ ...mockCart, items: [] });

      await expect(
        service.updateItemQuantity(1, 999, updateDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateItemQuantity(1, 999, updateDto),
      ).rejects.toThrow('Cart item not found');
      expect(mockCartItemRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when quantity exceeds stock', async () => {
      mockCartRepository.findOne.mockResolvedValue(mockCart);
      mockProductsService.findOne.mockResolvedValue({
        ...mockProduct,
        stock: 1,
      });

      await expect(
        service.updateItemQuantity(1, 1, { quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateItemQuantity(1, 1, { quantity: 5 }),
      ).rejects.toThrow(/Insufficient stock/);
      expect(mockCartItemRepository.save).not.toHaveBeenCalled();
    });

    it('should update item quantity and return cart', async () => {
      mockCartRepository.findOne.mockResolvedValue(mockCart);
      mockProductsService.findOne.mockResolvedValue(mockProduct);
      mockCartItemRepository.save.mockResolvedValue({
        ...mockCartItem,
        quantity: 3,
      });

      const result = await service.updateItemQuantity(1, 1, updateDto);

      expect(mockProductsService.findOne).toHaveBeenCalledWith(1);
      expect(mockCartItemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 3 }),
      );
      expect(result.items).toBeDefined();
      expect(result.totalAmount).toBeDefined();
    });
  });

  describe('removeItem', () => {
    it('should throw NotFoundException when cart item not found', async () => {
      mockCartRepository.findOne.mockResolvedValue({ ...mockCart, items: [] });

      await expect(service.removeItem(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeItem(1, 999)).rejects.toThrow(
        'Cart item not found',
      );
      expect(mockCartItemRepository.remove).not.toHaveBeenCalled();
    });

    it('should remove item and return cart', async () => {
      mockCartRepository.findOne.mockResolvedValue(mockCart);
      mockCartItemRepository.remove.mockResolvedValue(mockCartItem);

      const result = await service.removeItem(1, 1);

      expect(mockCartItemRepository.remove).toHaveBeenCalledWith(mockCartItem);
      expect(result.items).toBeDefined();
      expect(result.totalAmount).toBeDefined();
    });
  });
});
