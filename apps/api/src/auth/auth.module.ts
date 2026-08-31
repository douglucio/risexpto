import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { TOKEN_VERIFIER } from './auth.types';
import { KeycloakJwtVerifier } from './keycloak-jwt.verifier';
import { RolesGuard } from './roles.guard';
@Module({
  providers: [
    { provide: TOKEN_VERIFIER, useClass: KeycloakJwtVerifier },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [TOKEN_VERIFIER],
})
export class AuthModule {}
