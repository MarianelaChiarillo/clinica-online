import { CanDeactivate } from '@angular/router';
import { FormValid } from './form-valid';
import { Injectable } from '@angular/core';
import { MensajeComponent } from '../components/componentes/mensaje/mensaje.component';

@Injectable({ providedIn: 'root' })
export class FormDeactivateGuard implements CanDeactivate<FormValid> {
  
  async canDeactivate(component: FormValid): Promise<boolean> {
    if (component.isFormValid()) {
      return true;
    }

    const confirmado = await MensajeComponent.confirm(
      '¿Salir sin guardar?',
      'El formulario no se envió<br>¿Seguro que quieres salir?'
    );

    return confirmado;
  }
}