export { auth as proxy } from '@/auth';

export const config = {
  matcher: ['/dashboard/:path*', '/generate/:path*', '/scripts/:path*', '/videos/:path*'],
};