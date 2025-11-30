import { Injectable } from '@angular/core';
import { FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

@Injectable({ providedIn: 'root' })
export class RegistroValidatorsService {

  getNombreValidators() { return [Validators.required, Validators.minLength(2), Validators.maxLength(50)]; }
  getApellidoValidators() { return [Validators.required, Validators.minLength(2), Validators.maxLength(50)]; }
  getEdadPacienteValidators() { return [Validators.required, Validators.min(0), Validators.max(120)]; }
  getEdadEspecialistaValidators() { return [Validators.required, Validators.min(18), Validators.max(100)]; }
  getDniValidators() { return [Validators.required, Validators.pattern(/^\d{7,10}$/)]; }
  getObraSocialValidators() { return [Validators.required, Validators.minLength(3)]; }
  getEmailValidators() { return [Validators.required, Validators.email]; }
  getClaveValidators() { return [Validators.required, Validators.minLength(6), this.claveSegura]; }
  getConfirmarClaveValidator(claveControlName: string) {
    return (control: AbstractControl): ValidationErrors | null => {
      const form = control.parent;
      if (!form) return null;
      const clave = form.get(claveControlName)?.value;
      if (clave !== control.value) return { clavesNoCoinciden: true };
      return null;
    };
  }
  getImagenValidators() { return []; }
  getEspecialidadesValidators() { return [Validators.required]; }

  private claveSegura(control: AbstractControl): ValidationErrors | null {
    const valor = control.value;
    if (!valor) return null;
    const tieneNumero = /\d/.test(valor);
    const tieneLetra = /[a-zA-Z]/.test(valor);
    if (!tieneNumero || !tieneLetra) return { claveInsegura: 'La clave debe tener letras y números' };
    return null;
  }

  getRegistroError(controlName: string, form: FormGroup, etiquetasCampos: { [key: string]: string }): string | null {
    const control = form.get(controlName);
    if (!control || !control.touched || !control.errors) return null;

    const errors = control.errors;

    if (errors['required']) return `${etiquetasCampos[controlName]} es obligatorio.`;
    if (errors['email']) return 'Formato de email inválido.';
    if (errors['minlength']) return 'Demasiado corto.';
    if (errors['maxlength']) return 'Demasiado largo.';
    if (errors['pattern']) return 'Formato inválido.';
    if (errors['claveInsegura']) return errors['claveInsegura'];
    if (errors['clavesNoCoinciden']) return 'Las claves no coinciden.';

    return null;
  }
}
