import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/usuarios/historia-clinica.service';

@Component({
  selector: 'app-historia-clinica-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './historia-clinica.component.html',
  styleUrls: ['./historia-clinica.component.scss']
})
export class HistoriaClinicaFormComponent {
  @Input() turnoId!: number;
  @Input() pacienteId!: number;
  @Input() especialistaId!: number;
  @Input() especialidadId!: number;
  @Output() guardado = new EventEmitter<any>();

  historiaForm: FormGroup;
  procesando = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private historiaService: HistoriaClinicaService
  ) {
    this.historiaForm = this.crearForm();
  }

  private crearForm(): FormGroup {
    return this.fb.group({
      // Datos fijos SOLO estos 4 campos
      altura: ['', [Validators.required, Validators.min(0), Validators.max(250)]],
      peso: ['', [Validators.required, Validators.min(1), Validators.max(300)]],
      temperatura: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      presion: ['', [Validators.required, Validators.pattern(/^\d{2,3}\/\d{2,3}$/)]],
      
      // Datos dinámicos
      datosDinamicos: this.fb.array([this.crearDatoDinamico()]),
        comentario: ['']   // <-- acá

    });
  }

  private crearDatoDinamico(): FormGroup {
    return this.fb.group({
      clave: ['', [Validators.required]],
      valor: ['', [Validators.required]]
    });
  }

  get datosDinamicos(): FormArray {
    return this.historiaForm.get('datosDinamicos') as FormArray;
  }

  agregarDatoDinamico(): void {
    if (this.datosDinamicos.length < 3) {
      this.datosDinamicos.push(this.crearDatoDinamico());
    }
  }

  removerDatoDinamico(index: number): void {
    if (this.datosDinamicos.length > 1) {
      this.datosDinamicos.removeAt(index);
    }
  }

  async onSubmit(): Promise<void> {
  console.log('🟡 Validando formulario...');
  console.log('📋 Estado del formulario:', this.historiaForm.status);
  console.log('❌ Errores del formulario:', this.historiaForm.errors);
  
  // Mostrar estado de cada campo
  Object.keys(this.historiaForm.controls).forEach(key => {
    const control = this.historiaForm.get(key);
    console.log(`📝 Campo ${key}:`, {
      valor: control?.value,
      valido: control?.valid,
      errores: control?.errors,
      sucio: control?.dirty,
      tocado: control?.touched
    });
  });

  if (this.historiaForm.valid) {
    console.log('✅ Formulario VÁLIDO - Enviando datos...');
    this.procesando = true;
    this.error = '';

    try {
      const formValue = this.historiaForm.value;
      console.log('📦 Datos a enviar:', formValue);

      const historiaGuardada = await this.historiaService.crearHistoriaClinicaCompleta({
        turno_id: this.turnoId,
        paciente_id: this.pacienteId,
        especialista_id: this.especialistaId,
        especialidad_id: this.especialidadId,
        altura: parseFloat(formValue.altura),
        peso: parseFloat(formValue.peso),
        temperatura: parseFloat(formValue.temperatura),
        presion: formValue.presion
      }, formValue.datosDinamicos);

      console.log('✅ Historia clínica guardada:', historiaGuardada);
      
     this.guardado.emit({
  success: true,
  comentario: this.historiaForm.value.comentario,   // ← clave
  historia: historiaGuardada
});


    } catch (error: any) {
      console.error('❌ Error guardando historia clínica:', error);
      this.error = error.message || 'Error al guardar la historia clínica';
      
      this.guardado.emit({
        success: false,
        error: this.error
      });
    } finally {
      this.procesando = false;
    }
  } else {
    console.log('❌ Formulario INVÁLIDO - Mostrando errores...');
    this.marcarCamposComoSucios();
    this.error = 'Por favor completá todos los campos requeridos correctamente';
    
    // Debug adicional de campos inválidos
    const camposInvalidos = Object.keys(this.historiaForm.controls)
      .filter(key => this.historiaForm.get(key)?.invalid);
    console.log('🚫 Campos inválidos:', camposInvalidos);
  }
}
  private marcarCamposComoSucios(): void {
  Object.keys(this.historiaForm.controls).forEach(key => {
    const control = this.historiaForm.get(key);
    if (control) {
      control.markAsTouched();
    }
  });
  
  // Marcar también los controles del FormArray - CORREGIDO
  this.datosDinamicos.controls.forEach((control: AbstractControl) => {
    if (control instanceof FormGroup) {
      Object.keys(control.controls).forEach(key => {
        control.get(key)?.markAsTouched();
      });
    }
  });
} 
  mostrarError(controlName: string): boolean {
    const control = this.historiaForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  // Helper para datos dinámicos
  mostrarErrorDatoDinamico(index: number, controlName: string): boolean {
    const control = this.datosDinamicos.at(index).get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }


}