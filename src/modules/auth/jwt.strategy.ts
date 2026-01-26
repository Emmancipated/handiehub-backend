import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { jwtConstants } from './constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: any) {
    // Include role and userId in the validated user object
    return {
      userId: payload.userId || payload.sub,
      sub: payload.sub,
      username: payload.username,
      role: payload.role || [],
      firstName: payload.first_name,
      lastName: payload.last_name,
      bizName: payload.bizName,
    };
  }
}
