import { Injectable } from '@angular/core';
import { FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class LoginValidatorsService {

  getEmailValidators() {
    return [Validators.required, Validators.email];
  }

  getClaveValidators() {
    return [Validators.required, Validators.minLength(6), this.claveSegura];
  }

  private claveSegura(control: AbstractControl): ValidationErrors | null {
    const valor = control.value;
    if (!valor) return null;
    const tieneNumero = /\d/.test(valor);
    const tieneLetra = /[a-zA-Z]/.test(valor);
    if (!tieneNumero || !tieneLetra) return { claveInsegura: 'La clave debe tener letras y números' };
    return null;
  }

  getLoginError(controlName: string, form: FormGroup, etiquetasCampos: { [key: string]: string }): string | null {
    const control = form.get(controlName);
    if (!control || !control.touched || !control.errors) return null;

    const errors = control.errors;

    if (errors['required']) return `${etiquetasCampos[controlName]} es obligatorio.`;
    if (errors['email']) return 'Formato de email inválido.';
    if (errors['minlength']) return 'La contraseña debe tener al menos 6 caracteres.';
    if (errors['claveInsegura']) return errors['claveInsegura'];

    return null;
  }
}
