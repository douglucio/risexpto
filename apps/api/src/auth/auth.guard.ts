import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_ROUTE } from './auth.decorators';
import { TOKEN_VERIFIER, type AuthenticatedUser, type TokenVerifier } from './auth.types';
import { appRoles, type AppRole } from './roles';

type RequestLike = { headers: { authorization?: string }; user?: AuthenticatedUser };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<RequestLike>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ') || header.length <= 7)
      throw new UnauthorizedException('Authentication required');
    try {
      const claims = await this.verifier.verify(header.slice(7));
      const realmRoles = claims.realm_access?.roles ?? [];
      const roles = realmRoles.filter((role): role is AppRole =>
        appRoles.includes(role as AppRole),
      );
      request.user = {
        id: claims.sub,
        email: claims.email,
        name: claims.name ?? claims.email,
        emailVerified: claims.email_verified === true,
        roles,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
