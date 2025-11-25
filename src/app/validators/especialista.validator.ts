import { Injectable } from '@angular/core';
import { Validators, FormGroup } from '@angular/forms';
import { nombreValidator, apellidoValidator } from '../validators/nombre-apellido.validator';
import { claveSeguraValidator, confirmarClaveValidator } from '../validators/clave.validator';
import { emailDominioValidator } from '../validators/email-dominio.validator';
import { 
  dniValidator, 
  edadEspecialistaValidator, 
  archivoValidator 
} from '../validators/numeros.validator';

@Injectable({
  providedIn: 'root'
})
export class EspecialistaValidatorsService {
  
  getNombreValidators() {
    return [Validators.required, nombreValidator()];
  }

  getApellidoValidators() {
    return [Validators.required, apellidoValidator()];
  }

  getEdadValidators() {
    return [Validators.required, edadEspecialistaValidator()];
  }

  getDniValidators() {
    return [Validators.required, dniValidator()];
  }

  getEspecialidadesValidators() {
    return [Validators.required];
  }

  getEmailValidators() {
    return [Validators.required, Validators.email, emailDominioValidator];
  }

  getClaveValidators() {
    return [Validators.required, Validators.minLength(6), claveSeguraValidator];
  }

getImagenValidators() {
  return [archivoValidator()];
}


  getConfirmarClaveValidator() {
    return confirmarClaveValidator();
  }

  // Método para obtener todos los errores de un formulario de especialista
  getEspecialistaErrors(controlName: string, form: FormGroup): string | null {
    const control = form.get(controlName);
    if (!control || !control.touched || !control.errors) return null;

    const errors = control.errors;

    // Errores comunes
    if (errors['required']) return this.getFieldLabel(controlName) + ' es obligatorio.';
    if (errors['email']) return 'El formato del email es inválido.';
    if (errors['minlength']) return 'La clave debe tener al menos 6 caracteres.';
    if (errors['clavesNoCoinciden']) return 'Las claves no coinciden.';

    // Errores específicos
    if (errors['nombreCorto']) return errors['nombreCorto'];
    if (errors['nombreLargo']) return errors['nombreLargo'];
    if (errors['nombreInvalido']) return errors['nombreInvalido'];
    if (errors['apellidoCorto']) return errors['apellidoCorto'];
    if (errors['apellidoLargo']) return errors['apellidoLargo'];
    if (errors['apellidoInvalido']) return errors['apellidoInvalido'];
    if (errors['edadInvalida']) return errors['edadInvalida'];
    if (errors['edadMenor']) return errors['edadMenor'];
    if (errors['edadMayor']) return errors['edadMayor'];
    if (errors['dniInvalido']) return errors['dniInvalido'];
    if (errors['tamañoDNI']) return errors['tamañoDNI'];
    if (errors['rangoDNI']) return errors['rangoDNI'];
    if (errors['dominioInvalido']) return errors['dominioInvalido'];
    if (errors['claveInsegura']) return errors['claveInsegura'];
    if (errors['tipoArchivoInvalido']) return errors['tipoArchivoInvalido'];
    if (errors['archivoMuyGrande']) return errors['archivoMuyGrande'];

    return null;
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      nombre: 'El nombre',
      apellido: 'El apellido',
      edad: 'La edad',
      dni: 'El DNI',
      especialidades: 'Las especialidades',
      email: 'El email',
      clave: 'La clave',
      repiteClave: 'La confirmación de clave',
      imagen: 'La imagen de perfil',
      recaptcha: 'El captcha'
    };
    return labels[controlName] || 'Este campo';
  }
}