import { ApiProperty } from '@nestjs/swagger';
import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];
}
