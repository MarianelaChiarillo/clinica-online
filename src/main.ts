import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { provideAnimations } from '@angular/platform-browser/animations';

bootstrapApplication(App, {
  ...appConfig,          // spread de tu configuración actual
  providers: [
    ...appConfig.providers, // los providers que ya tenías
    provideAnimations()      // habilita animaciones
  ]
}).catch(err => console.error(err));
