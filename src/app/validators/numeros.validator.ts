import { ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';

// Validador para DNI (común para ambos)
export function dniValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value?.toString().trim() || '';
    
    if (!valor) return null;
    
    if (!/^\d+$/.test(valor)) {
      return { dniInvalido: 'El DNI debe contener solo números.' };
    }
    
    if (valor.length < 7 || valor.length > 8) {
      return { tamañoDNI: 'El DNI debe tener entre 7 y 8 dígitos.' };
    }
    
    const dniNumber = parseInt(valor, 10);
    if (dniNumber < 1000000 || dniNumber > 99999999) {
      return { rangoDNI: 'El DNI debe estar entre 1.000.000 y 99.999.999.' };
    }
    
    return null;
  };
}

// Validador para edad de paciente (0-100)
export function edadPacienteValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }
    
    const edad = Number(valor);
    
    if (isNaN(edad)) {
      return { edadInvalida: 'La edad debe ser un número válido.' };
    }
    
    if (edad < 0) {
      return { edadNegativa: 'La edad no puede ser negativa.' };
    }
    
    if (edad > 100) {
      return { edadMayor: 'La edad no puede ser mayor a 100 años.' };
    }
    
    return null;
  };
}

// Validador para edad de especialista (18-100)
export function edadEspecialistaValidator(): ValidatorFn {
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
    
    if (edad > 100) {
      return { edadMayor: 'La edad no puede ser mayor a 100 años.' };
    }
    
    return null;
  };
}

// Validador para obra social (requerido para pacientes)
export function obraSocialValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value?.toString().trim() || '';
    
    if (!valor) {
      return { obraSocialRequerida: 'La obra social es obligatoria.' };
    }
    
    if (valor.length < 3) {
      return { obraSocialCorta: 'La obra social debe tener al menos 3 caracteres.' };
    }
    
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-]+$/.test(valor)) {
      return { obraSocialInvalida: 'La obra social contiene caracteres inválidos.' };
    }
    
    return null;
  };
}

// Validador para archivos (imágenes)
export function archivoValidator(allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/jpg']): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const archivo = control.value as File;
    
    if (!archivo) return null;
    
    if (!allowedTypes.includes(archivo.type)) {
      return { 
        tipoArchivoInvalido: `Solo se permiten archivos: ${allowedTypes.join(', ')}` 
      };
    }
    
    // Tamaño máximo 5MB
    if (archivo.size > 5 * 1024 * 1024) {
      return { archivoMuyGrande: 'La imagen no puede ser mayor a 5MB.' };
    }
    
    return null;
  };
}