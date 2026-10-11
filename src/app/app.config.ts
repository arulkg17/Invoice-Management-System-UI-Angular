import { ApplicationConfig } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';

import {
  provideHttpClient,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';

import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';

import { routes } from './app.routes';

import { authFeature } from './store/auth/auth.reducer';
import { AuthEffects } from './store/auth/auth.effects';
import { JwtInterceptor } from './services/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideNativeDateAdapter(),
    // Router
    provideRouter(routes),

    // HTTP
    provideHttpClient(withInterceptorsFromDi()),

    // JWT interceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true,
    },

    // NgRx
    provideStore({
      [authFeature.name]: authFeature.reducer,
    }),

    provideEffects([AuthEffects]),

    // Angular animations
    provideAnimations(),
  ],
};