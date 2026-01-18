import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthOptionalGuard extends AuthGuard('jwt') {
    // Override to not throw error when no token is provided
    handleRequest(err: any, user: any) {
        // If there's an error or no user, just return null instead of throwing
        if (err || !user) {
            return null;
        }
        return user;
    }

    canActivate(context: ExecutionContext) {
        // Call the parent canActivate but catch any errors
        return super.canActivate(context);
    }
}
