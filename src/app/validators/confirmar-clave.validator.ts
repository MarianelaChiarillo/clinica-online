import { ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';

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