import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { type OrderStatus } from '../order.entity';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ['PENDING', 'COMPLETED', 'CANCELLED'] })
  @Transform(({ value }): OrderStatus => {
    if (typeof value === 'string') {
      const normalized = value.trim().replace(/\s+/g, '').toUpperCase();
      if (['PENDING', 'COMPLETED', 'CANCELLED'].includes(normalized)) {
        return normalized as OrderStatus;
      }
    }
    return value as OrderStatus;
  })
  @IsIn(['PENDING', 'COMPLETED', 'CANCELLED'])
  status: OrderStatus;
}
