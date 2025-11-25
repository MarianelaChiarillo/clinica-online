// src/app/validators/paciente.validators.ts
import { ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';

export function nombreValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value?.toString().trim() || '';
    if (!valor) return null;
    if (valor.length < 2) return { nombreCorto: 'El nombre debe tener al menos 2 letras.' };
    if (valor.length > 50) return { nombreLargo: 'El nombre no puede tener más de 50 caracteres.' };
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(valor)) return { nombreInvalido: 'El nombre debe contener solo letras.' };
    return null;
  };
}

export function apellidoValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value?.toString().trim() || '';
    if (!valor) return null;
    if (valor.length < 2) return { apellidoCorto: 'El apellido debe tener al menos 2 letras.' };
    if (valor.length > 50) return { apellidoLargo: 'El apellido no puede tener más de 50 caracteres.' };
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(valor)) return { apellidoInvalido: 'El apellido debe contener solo letras.' };
    return null;
  };
}

export function dniValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value?.toString().trim() || '';
    if (!valor) return null;
    if (!/^\d+$/.test(valor)) return { dniInvalido: 'El DNI debe contener solo números.' };
    if (valor.length < 7 || valor.length > 8) return { tamañoDNI: 'El DNI debe tener entre 7 y 8 dígitos.' };
    const dniNumber = parseInt(valor, 10);
    if (dniNumber < 1000000 || dniNumber > 99999999) return { rangoDNI: 'El DNI debe estar entre 1.000.000 y 99.999.999.' };
    return null;
  };
}

export function edadPacienteValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (valor === null || valor === undefined || valor === '') return null;
    const edad = Number(valor);
    if (isNaN(edad)) return { edadInvalida: 'La edad debe ser un número válido.' };
    if (edad < 0) return { edadNegativa: 'La edad no puede ser negativa.' };
    if (edad > 100) return { edadMayor: 'La edad no puede ser mayor a 100 años.' };
    return null;
  };
}

export function edadEspecialistaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value;
    if (valor === null || valor === undefined || valor === '') return null;
    const edad = Number(valor);
    if (isNaN(edad)) return { edadInvalida: 'La edad debe ser un número válido.' };
    if (edad < 18) return { edadMenor: 'Debes ser mayor de 18 años.' };
    if (edad > 100) return { edadMayor: 'La edad no puede ser mayor a 100 años.' };
    return null;
  };
}

export function obraSocialValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value?.toString().trim() || '';
    if (!valor) return { obraSocialRequerida: 'La obra social es obligatoria.' };
    if (valor.length < 3) return { obraSocialCorta: 'La obra social debe tener al menos 3 caracteres.' };
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-]+$/.test(valor)) return { obraSocialInvalida: 'La obra social contiene caracteres inválidos.' };
    return null;
  };
}

export function archivoValidator(
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/jpg']
): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {

    const archivo = control.value as File;

    if (!archivo) {
      return { required: true }; // imagen obligatoria
    }

    if (!allowedTypes.includes(archivo.type)) {
      return { tipoArchivoInvalido: `Solo se permiten archivos: ${allowedTypes.join(', ')}` };
    }

    if (archivo.size > 5 * 1024 * 1024) {
      return { archivoMuyGrande: 'La imagen no puede ser mayor a 5MB.' };
    }

    return null;
  };
}

export function claveSeguraValidator(control: AbstractControl) {
  const valor = control.value || '';
  const errores: any = {};
  if (!valor) errores.requerido = 'La contraseña es obligatoria';
  if (valor.length < 6) errores.largoMin = 'Debe tener al menos 6 caracteres';
  if (!/(?=.*[A-Za-z])(?=.*\d)/.test(valor)) errores.letraNumero = 'Debe contener al menos una letra y un número';
  return Object.keys(errores).length ? errores : null;
}

export function confirmarClaveValidator(): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const clave = formGroup.get('clave');
    const repiteClave = formGroup.get('repiteClave');
    if (!clave || !repiteClave) return null;
    if (clave.value && repiteClave.value && clave.value !== repiteClave.value) return { clavesNoCoinciden: 'Las claves no coinciden.' };
    return null;
  };
}

export function emailDominioValidator(control: AbstractControl): ValidationErrors | null {
  const email = control.value?.trim();
  const errores: any = {};
  if (!email) { errores.requerido = 'El correo es obligatorio'; return errores; }
  if (!/^\S+@\S+\.\S+$/.test(email)) return { emailInvalido: 'Formato de email inválido' };
  const dominio = email.split('@')[1]?.toLowerCase();
  const dominiosPermitidos = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];
  if (dominio && !dominiosPermitidos.includes(dominio)) errores['dominioInvalido'] = `Usá un dominio válido: ${dominiosPermitidos.join(', ')}`;
  return Object.keys(errores).length ? errores : null;
}


