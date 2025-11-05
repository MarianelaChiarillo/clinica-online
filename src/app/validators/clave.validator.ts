import { AbstractControl, ValidationErrors } from '@angular/forms';

export function claveSeguraValidator(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (!valor) return null;

  const esValida = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/.test(valor);

  if (!esValida) {
    return {
      claveInsegura: 'La contraseña debe tener al menos 6 caracteres, una letra y un número.',
    };
  }

  return null;
}
