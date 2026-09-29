import { SetMetadata } from '@nestjs/common';

// Đánh dấu route public (bỏ qua JwtAuthGuard toàn cục)
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
