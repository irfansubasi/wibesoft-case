import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { Product } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const mockProduct: Product = {
  id: 1,
  name: 'Test Product',
  description: 'Description',
  price: 99.99,
  imageUrl: 'https://example.com/image.jpg',
  stock: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProductsService', () => {
  let service: ProductsService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('should return products ordered by createdAt DESC', async () => {
      const products = [mockProduct];
      mockRepository.find.mockResolvedValue(products);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(products);
    });

    it('should return empty array when no products', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return product when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow('Product not found');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('create', () => {
    it('should create and return product', async () => {
      const createDto: CreateProductDto = {
        name: 'New Product',
        description: 'Desc',
        price: 49.99,
        imageUrl: 'https://example.com/img.jpg',
        stock: 5,
      };
      const created = { ...mockProduct, ...createDto };
      mockRepository.create.mockReturnValue(created);
      mockRepository.save.mockResolvedValue(created);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update and return product', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);
      const updateDto: UpdateProductDto = { name: 'Updated Name', stock: 20 };
      const updated = { ...mockProduct, ...updateDto };
      mockRepository.save.mockResolvedValue(updated);

      const result = await service.update(1, updateDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateDto),
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update(999, { name: 'Updated' })).rejects.toThrow(
        'Product not found',
      );

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove product', async () => {
      mockRepository.findOne.mockResolvedValue(mockProduct);
      mockRepository.remove.mockResolvedValue(mockProduct);

      await service.remove(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockProduct);
    });

    it('should throw NotFoundException when product not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      await expect(service.remove(999)).rejects.toThrow('Product not found');

      expect(mockRepository.remove).not.toHaveBeenCalled();
    });
  });
});
