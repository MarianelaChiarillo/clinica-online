// src/app/validators/paciente-validators.service.ts
import { Injectable } from '@angular/core';
import { Validators, FormGroup } from '@angular/forms';
import {
  nombreValidator,
  apellidoValidator,
  dniValidator,
  edadPacienteValidator,
  obraSocialValidator,
  archivoValidator,
  claveSeguraValidator,
  confirmarClaveValidator,
  emailDominioValidator
} from './paciente.validator';

@Injectable({
  providedIn: 'root'
})
export class PacienteValidatorsService {

  getNombreValidators() {
    return [Validators.required, nombreValidator()];
  }

  getApellidoValidators() {
    return [Validators.required, apellidoValidator()];
  }

  getEdadValidators() {
    return [Validators.required, edadPacienteValidator()];
  }

  getDniValidators() {
    return [Validators.required, dniValidator()];
  }

  getObraSocialValidators() {
    return [Validators.required, obraSocialValidator()];
  }

  
  getEmailValidators() {
    return [Validators.required, emailDominioValidator];
  }

  getClaveValidators() {
    return [Validators.required, Validators.minLength(6), claveSeguraValidator];
  }

  getImagenValidators() {
    return [Validators.required, archivoValidator()];
  }

  getConfirmarClaveValidator() {
    return confirmarClaveValidator();
  }

  getPacienteErrors(controlName: string, form: FormGroup): string | null {
    const control = form.get(controlName);
    if (!control || !control.touched || !control.errors) return null;
    const errors = control.errors;

    if (errors['required']) return this.obtenerCampoLabel(controlName) + ' es obligatorio.';
    if (errors['email']) return 'El formato del email es inválido.';
    if (errors['minlength']) return 'La clave debe tener al menos 6 caracteres.';
    if (errors['clavesNoCoinciden']) return 'Las claves no coinciden.';

    const erroresEspecificos = [
      'nombreCorto', 'nombreLargo', 'nombreInvalido',
      'apellidoCorto', 'apellidoLargo', 'apellidoInvalido',
      'edadInvalida', 'edadNegativa', 'edadMayor',
      'dniInvalido', 'tamañoDNI', 'rangoDNI',
      'obraSocialRequerida', 'obraSocialCorta', 'obraSocialInvalida',
      'dominioInvalido', 'claveInsegura',
      'tipoArchivoInvalido', 'archivoMuyGrande'
    ];

    for (const key of erroresEspecificos) {
      if (errors[key]) return errors[key];
    }

    return null;
  }

  private obtenerCampoLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      nombre: 'El nombre',
      apellido: 'El apellido',
      edad: 'La edad',
      dni: 'El DNI',
      obraSocial: 'La obra social',
      email: 'El email',
      clave: 'La clave',
      repiteClave: 'La confirmación de clave',
      imagen1: 'La primera imagen',
      imagen2: 'La segunda imagen',
      recaptcha: 'El captcha'
    };
    return labels[controlName] || 'Este campo';
  }
}
