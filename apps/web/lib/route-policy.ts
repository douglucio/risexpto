const publicPaths = ['/login'];

export function isPublicPath(pathname: string) {
  return (
    pathname === '/' ||
    pathname.startsWith('/brand/') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/auth/') ||
    publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  );
}

export function isAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}
