import { AbstractControl, ValidationErrors } from '@angular/forms';

export function emailDominioValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.value?.trim();
  const errores: any = {};

  if (!email) {
    errores.requerido = 'El correo es obligatorio';
    return errores;
  }

  const formatoCorrecto = /^\S+@\S+\.\S+$/.test(email);
  if (!formatoCorrecto) {
    return { emailInvalido: 'Formato de email inválido' };
  }

  const dominio = email.split('@')[1]?.toLowerCase();
  const dominiosPermitidos = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];

  if (dominio && !dominiosPermitidos.includes(dominio)) {
    errores['dominioInvalido'] = `Usá un dominio válido: ${dominiosPermitidos.join(', ')}`;
  }

  return Object.keys(errores).length ? errores : null;
}
