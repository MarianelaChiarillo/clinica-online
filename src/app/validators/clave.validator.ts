import { ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';

export function claveSeguraValidator(control: AbstractControl) {
  const valor = control.value || '';
  const errores: any = {};

  if (!valor) {
    errores.requerido = 'La contraseña es obligatoria';
    return errores;
  }

  if (valor.length < 6) {
    errores.largoMin = 'Debe tener al menos 6 caracteres';
  }

  if (!/(?=.*[A-Za-z])(?=.*\d)/.test(valor)) {
    errores.letraNumero = 'Debe contener al menos una letra y un número';
  }

  return Object.keys(errores).length ? errores : null;
}

export function confirmarClaveValidator(): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const clave = formGroup.get('clave');
    const repiteClave = formGroup.get('repiteClave');

    if (!clave || !repiteClave) {
      return null;
    }

    if (clave.value && repiteClave.value && clave.value !== repiteClave.value) {
      return { clavesNoCoinciden: 'Las claves no coinciden.' };
    }

    return null;
  };
}