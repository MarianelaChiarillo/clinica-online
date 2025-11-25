import { ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';

// Validador individual para nombre
export function nombreValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value?.toString().trim() || '';
    
    if (!valor) return null;
    
    if (valor.length < 2) {
      return { nombreCorto: 'El nombre debe tener al menos 2 letras.' };
    }
    
    if (valor.length > 50) {
      return { nombreLargo: 'El nombre no puede tener más de 50 caracteres.' };
    }
    
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(valor)) {
      return { nombreInvalido: 'El nombre debe contener solo letras.' };
    }
    
    return null;
  };
}

// Validador individual para apellido
export function apellidoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value?.toString().trim() || '';
    
    if (!valor) return null; 
    
    if (valor.length < 2) {
      return { apellidoCorto: 'El apellido debe tener al menos 2 letras.' };
    }
    
    if (valor.length > 50) {
      return { apellidoLargo: 'El apellido no puede tener más de 50 caracteres.' };
    }
    
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(valor)) {
      return { apellidoInvalido: 'El apellido debe contener solo letras.' };
    }
    
    return null;
  };
}