import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { 
  FormBuilder, 
  FormGroup, 
  FormArray, 
  Validators, 
  ReactiveFormsModule, 
  AbstractControl, 
  FormsModule 
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/usuarios/historia-clinica.service';

@Component({
  selector: 'app-historia-clinica-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './historia-clinica.component.html',
  styleUrls: ['./historia-clinica.component.scss']
})
export class HistoriaClinicaFormComponent implements OnInit {
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

  ngOnInit() {
    // Configurar suscripciones para cambios en tipo_control
    this.datosDinamicos.controls.forEach((control, index) => {
      const tipoControl = control.get('tipo_control');
      if (tipoControl) {
        tipoControl.valueChanges.subscribe((nuevoTipo: string) => {
          this.cambiarTipoControl(index, nuevoTipo);
        });
      }
    });
  }

  private crearForm(): FormGroup {
    return this.fb.group({
      altura: ['', [Validators.required, Validators.min(0), Validators.max(250)]],
      peso: ['', [Validators.required, Validators.min(1), Validators.max(300)]],
      temperatura: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      presion: ['', [Validators.required, Validators.pattern(/^\d{2,3}\/\d{2,3}$/)]],

      datosDinamicos: this.fb.array([this.crearDatoDinamico()], {
        validators: this.validarDatosDinamicos.bind(this)
      }),

      comentario: ['']
    });
  }

  private crearDatoDinamico(): FormGroup {
    return this.fb.group({
      clave: ['', [Validators.required]],
      tipo_control: ['texto'],
      
      // Campos para cada tipo
      valor_texto: [''],
      valor_rango: [50, [Validators.min(0), Validators.max(100)]],
      valor_numerico: ['', [Validators.min(0)]],
      valor_switch: [false]
    }, { validators: this.validarDatoDinamico.bind(this) });
  }

  // Validador para cada dato dinámico
  private validarDatoDinamico(group: AbstractControl) {
    if (!(group instanceof FormGroup)) return null;
    
    const tipo = group.get('tipo_control')?.value;
    
    if (!tipo || tipo === 'texto') {
      const texto = group.get('valor_texto')?.value;
      if (!texto || texto.trim() === '') {
        return { textoRequerido: true };
      }
    } else if (tipo === 'rango') {
      const rango = group.get('valor_rango')?.value;
      if (rango === null || rango === undefined) {
        return { rangoRequerido: true };
      }
    } else if (tipo === 'numerico') {
      const numero = group.get('valor_numerico')?.value;
      if (!numero || numero === '' || isNaN(numero)) {
        return { numeroRequerido: true };
      }
    }
    
    return null;
  }

  // Validador para el array completo
  private validarDatosDinamicos(control: AbstractControl) {
    if (!(control instanceof FormArray)) {
      return null;
    }
    
    const array = control as FormArray;
    
    // Verificar que no haya claves duplicadas
    const claves = array.controls.map(c => {
      if (c instanceof FormGroup) {
        const claveControl = c.get('clave');
        return claveControl?.value?.toLowerCase().trim();
      }
      return null;
    }).filter(clave => clave && clave !== '');
    
    const clavesUnicas = new Set(claves);
    
    if (claves.length !== clavesUnicas.size) {
      return { clavesDuplicadas: true };
    }
    
    return null;
  }

  get datosDinamicos(): FormArray {
    return this.historiaForm.get('datosDinamicos') as FormArray;
  }

  agregarDatoDinamico(): void {
    if (this.datosDinamicos.length < 3) {
      const nuevoGrupo = this.crearDatoDinamico();
      this.datosDinamicos.push(nuevoGrupo);
      
      // Suscribirse a cambios en el nuevo grupo
      const tipoControl = nuevoGrupo.get('tipo_control');
      if (tipoControl) {
        tipoControl.valueChanges.subscribe((nuevoTipo: string) => {
          const index = this.datosDinamicos.length - 1;
          this.cambiarTipoControl(index, nuevoTipo);
        });
      }
    }
  }

  removerDatoDinamico(index: number): void {
    if (this.datosDinamicos.length > 1) {
      this.datosDinamicos.removeAt(index);
    }
  }

  cambiarTipoControl(index: number, tipo: string) {
    const grupo = this.datosDinamicos.at(index) as FormGroup;
    
    // Resetear valores según el tipo
    const nuevosValores: any = {
      tipo_control: tipo
    };
    
    switch (tipo) {
      case 'texto':
        nuevosValores.valor_texto = '';
        nuevosValores.valor_rango = null;
        nuevosValores.valor_numerico = null;
        nuevosValores.valor_switch = null;
        break;
      case 'rango':
        nuevosValores.valor_texto = '';
        nuevosValores.valor_rango = 50;
        nuevosValores.valor_numerico = null;
        nuevosValores.valor_switch = null;
        break;
      case 'numerico':
        nuevosValores.valor_texto = '';
        nuevosValores.valor_rango = null;
        nuevosValores.valor_numerico = '';
        nuevosValores.valor_switch = null;
        break;
      case 'switch':
        nuevosValores.valor_texto = '';
        nuevosValores.valor_rango = null;
        nuevosValores.valor_numerico = null;
        nuevosValores.valor_switch = false;
        break;
    }
    
    grupo.patchValue(nuevosValores, { emitEvent: false });
    
    // Forzar validación
    grupo.updateValueAndValidity();
  }

  async onSubmit(): Promise<void> {
    // Marcar todos los controles como tocados
    this.marcarCamposComoSucios();
    
    if (this.historiaForm.valid) {
      this.procesando = true;
      this.error = '';

      try {
        const formValue = this.historiaForm.value;
        
        // Preparar datos dinámicos para guardar
        const datosDinamicosPreparados = this.prepararDatosParaGuardar();
        
        console.log('📤 Datos dinámicos preparados:', datosDinamicosPreparados);

        const historiaGuardada = await this.historiaService.crearHistoriaClinicaCompleta(
          {
            turno_id: this.turnoId,
            paciente_id: this.pacienteId,
            especialista_id: this.especialistaId,
            especialidad_id: this.especialidadId,
            altura: parseFloat(formValue.altura),
            peso: parseFloat(formValue.peso),
            temperatura: parseFloat(formValue.temperatura),
            presion: formValue.presion
          },
          datosDinamicosPreparados
        );

        this.guardado.emit({
          success: true,
          comentario: formValue.comentario,
          historia: historiaGuardada
        });

      } catch (error: any) {
        console.error('❌ Error al guardar:', error);
        this.error = error.message || 'Error al guardar la historia clínica';
        this.guardado.emit({ success: false, error: this.error });
      } finally {
        this.procesando = false;
      }
    } else {
      console.log('❌ Formulario inválido');
      this.mostrarErroresFormulario();
      
      if (this.datosDinamicos.errors?.['clavesDuplicadas']) {
        this.error = 'No pueden haber claves duplicadas en los datos dinámicos';
      } else {
        this.error = 'Por favor completá todos los campos requeridos correctamente';
      }
    }
  }

  // Método para debug: mostrar todos los errores
  private mostrarErroresFormulario() {
    Object.keys(this.historiaForm.controls).forEach(key => {
      const control = this.historiaForm.get(key);
      if (control?.errors) {
        console.log(`❌ ${key}:`, control.errors);
      }
    });
    
    this.datosDinamicos.controls.forEach((control, index) => {
      if (control.errors) {
        console.log(`❌ Dato dinámico ${index}:`, control.errors);
      }
    });
  }

  private prepararDatosParaGuardar() {
    return this.datosDinamicos.value.map((dato: any) => {
      const tipo = dato.tipo_control || 'texto';
      let valor_texto = '';
      
      switch (tipo) {
        case 'texto':
          valor_texto = dato.valor_texto || '';
          break;
        case 'rango':
          valor_texto = `${dato.valor_rango || 50}%`;
          break;
        case 'numerico':
          valor_texto = dato.valor_numerico?.toString() || '';
          break;
        case 'switch':
          valor_texto = dato.valor_switch ? 'Sí' : 'No';
          break;
        default:
          valor_texto = dato.valor_texto || '';
      }
      
      return {
        clave: dato.clave,
        tipo_control: tipo,
        valor_texto: valor_texto,
        valor_rango: tipo === 'rango' ? (dato.valor_rango || 50) : null,
        valor_numerico: tipo === 'numerico' ? (dato.valor_numerico || 0) : null,
        valor_switch: tipo === 'switch' ? (dato.valor_switch || false) : null
      };
    });
  }

  private marcarCamposComoSucios(): void {
    Object.keys(this.historiaForm.controls).forEach(key => {
      const control = this.historiaForm.get(key);
      control?.markAsTouched();
    });

    this.datosDinamicos.controls.forEach((control: AbstractControl) => {
      control.markAsTouched();
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

  mostrarErrorDatoDinamico(index: number, controlName: string): boolean {
    const control = this.datosDinamicos.at(index).get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  tieneErrorDatoDinamico(index: number): boolean {
    const grupo = this.datosDinamicos.at(index);
    return grupo.invalid && (grupo.dirty || grupo.touched);
  }

  getMensajeErrorDatoDinamico(index: number): string {
    const grupo = this.datosDinamicos.at(index);
    
    if (grupo.errors?.['textoRequerido']) {
      return 'El valor de texto es requerido';
    }
    if (grupo.errors?.['rangoRequerido']) {
      return 'El valor de rango es requerido';
    }
    if (grupo.errors?.['numeroRequerido']) {
      return 'El valor numérico es requerido';
    }
    
    return '';
  }
}