import { ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';

// Validador para edad
export function edadValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }
    
    const edad = Number(valor);
    
    if (isNaN(edad)) {
      return { edadInvalida: 'La edad debe ser un número válido.' };
    }
    
    if (edad < 18) {
      return { edadMenor: 'Debes ser mayor de 18 años.' };
    }
    
    if (edad > 99) {
      return { edadMayor: 'La edad no puede ser mayor a 99 años.' };
    }
    
    return null;
  };
}

// Validador individual para nombre
export function nombreValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value?.toString().trim() || '';
    
    if (!valor) return null;
    
    if (valor.length < 3) {
      return { nombreCorto: 'El nombre debe tener al menos 3 letras.' };
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
    
    if (valor.length < 4) {
      return { apellidoCorto: 'El apellido debe tener al menos 4 letras.' };
    }
    
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(valor)) {
      return { apellidoInvalido: 'El apellido debe contener solo letras.' };
    }
    
    return null;
  };
}

// Validador individual para telefono 
export function telefonoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value?.toString().trim() || '';
    
    if (!valor) return null;
    
    if (!/^\d+$/.test(valor)) {
      return { telefonoInvalido: 'El teléfono debe contener solo números.' };
    }
    
    if (valor.length !== 10) {
      return { tamañoTelefono: 'El teléfono debe tener 10 números.' };
    }
    
    return null;
  };
}