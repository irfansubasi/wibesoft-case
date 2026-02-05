import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
