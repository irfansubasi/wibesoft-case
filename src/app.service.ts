import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo(): { name: string; version: string; docs: string; status: string } {
    return {
      name: 'E-Commerce API',
      version: '1.0.0',
      docs: '/api-docs',
      status: 'ok',
    };
  }
}
