import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_ROUTE } from './auth.decorators';
import {
  TOKEN_VERIFIER,
  type AuthenticatedUser,
  type TokenVerifier,
  type VerifiedClaims,
} from './auth.types';
import { appRoles, type AppRole } from './roles';
import { UserProvisioningError, UserProvisioningService } from '../users/user-provisioning.service';

type RequestLike = { headers: { authorization?: string }; user?: AuthenticatedUser };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
    private readonly provisioning: UserProvisioningService,
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
    let claims: VerifiedClaims;
    try {
      claims = await this.verifier.verify(header.slice(7));
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    const realmRoles = claims.realm_access?.roles ?? [];
    const roles = realmRoles.filter((role): role is AppRole => appRoles.includes(role as AppRole));
    const authenticated = {
      id: claims.sub,
      email: claims.email,
      name: claims.name ?? claims.email,
      emailVerified: claims.email_verified === true,
      roles,
    };
    try {
      request.user = await this.provisioning.provision(authenticated);
    } catch (error) {
      if (error instanceof UserProvisioningError && error.code === 'DEACTIVATED')
        throw new ForbiddenException('Application user is deactivated');
      throw new ServiceUnavailableException('User provisioning unavailable');
    }
    return true;
  }
}
