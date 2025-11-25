import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class FormUtilsService {
  
  getError(controlName: string, form: FormGroup, fieldLabels: { [key: string]: string }): string | null {
    const control = form.get(controlName);
    if (!control || !control.touched || !control.errors) return null;

    const errors = control.errors;
    if (errors['required']) return `${this.getFieldLabel(controlName, fieldLabels)} es obligatorio.`;
    if (controlName === 'email' && errors['email']) return 'El formato del email es inválido.';
    if (controlName === 'clave' && errors['minlength']) return 'La clave debe tener al menos 6 caracteres.';
    if (controlName === 'repiteClave' && errors['clavesNoCoinciden']) return 'Las claves no coinciden.';
    if (controlName === 'edad' && errors['min']) return 'La edad mínima es 18 años.';
    if (controlName === 'recaptcha' && errors['captchaError']) return 'Error en la verificación. Intentá de nuevo.';
    
    return errors['customError'] || null;
  }

  private getFieldLabel(controlName: string, labels: { [key: string]: string }): string {
    return labels[controlName] || 'Este campo';
  }

  markAllAsTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      control?.markAsTouched();
    });
  }

  handleFileChange(event: any, form: FormGroup, fieldName: string): { nombreArchivo: string | null, archivo: File | null } {
    const archivo = event.target.files[0];
    if (archivo) {
      form.get(fieldName)?.setValue(archivo);
      return { nombreArchivo: archivo.name, archivo };
    }
    return { nombreArchivo: null, archivo: null };
  }

  quitarArchivo(form: FormGroup, fieldName: string, inputId: string): void {
    form.get(fieldName)?.setValue(null);
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) input.value = '';
  }
}