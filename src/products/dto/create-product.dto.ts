import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsUrl, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Product name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Product description' })
  @IsString()
  description: string;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @Min(0.01)
  price: number;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  @IsUrl()
  imageUrl: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  stock: number;
}
