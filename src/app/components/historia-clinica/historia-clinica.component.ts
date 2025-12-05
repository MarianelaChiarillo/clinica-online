import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HistoriaClinicaService } from '../../services/usuarios/historia-clinica.service';

@Component({
  selector: 'app-historia-clinica-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  // Array para controlar qué datos dinámicos están completos
  datosDinamicosValidos: boolean[] = [];

  constructor(
    private fb: FormBuilder,
    private historiaService: HistoriaClinicaService
  ) {
    this.historiaForm = this.crearForm();
  }

  ngOnInit() {
    // Inicializar validación de datos dinámicos
    this.actualizarValidacionDatosDinamicos();
  }

  // -----------------------------
  // CREAR FORMULARIO
  // -----------------------------
  private crearForm(): FormGroup {
    return this.fb.group({
      altura: ['', [Validators.required, Validators.min(0), Validators.max(250)]],
      peso: ['', [Validators.required, Validators.min(1), Validators.max(300)]],
      temperatura: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      presion: ['', [Validators.required, Validators.pattern(/^\d{2,3}\/\d{2,3}$/)]],
      datosEspecificos: this.fb.array([
        this.crearDato('rango', 'Ej: Nivel de dolor', true),
        this.crearDato('numerico', 'Ej: Frecuencia cardíaca', true),
        this.crearDato('switch', 'Ej: Requiere seguimiento', true)
      ]),
      datosLibres: this.fb.array([]),
      comentario: ['', [Validators.maxLength(500)]],
    });
  }

  private crearDato(tipo: string, claveDefault: string = '', requerido: boolean = false): FormGroup {
    const validators = requerido ? [Validators.required] : [];
    
    const grupo = this.fb.group({
      clave: [claveDefault, [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      tipo_control: [tipo, [Validators.required]],
      valor_texto: [''],
      valor_rango: tipo === 'rango' ? [50, [Validators.required, Validators.min(0), Validators.max(100)]] : null,
      valor_numerico: tipo === 'numerico' ? ['', [Validators.required]] : null,
      valor_switch: tipo === 'switch' ? [false] : null
    });

    // Agregar validación de valor requerido si es necesario
    if (requerido) {
      grupo.setValidators(this.validarDatoCompleto());
    }

    return grupo;
  }

  private crearDatoLibre(): FormGroup {
    return this.fb.group({
      clave: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      tipo_control: ['texto', [Validators.required]],
      valor_texto: ['', [Validators.required, Validators.maxLength(100)]],
      valor_switch: [false]
    }, { validators: this.validarDatoLibreCompleto() });
  }

  // -----------------------------
  // VALIDACIONES PERSONALIZADAS
  // -----------------------------
  private validarDatoCompleto() {
    return (control: AbstractControl) => {
      const tipo = control.get('tipo_control')?.value;
      const clave = control.get('clave')?.value?.trim();
      
      if (!clave || clave.length < 2) {
        return { claveInvalida: true };
      }

      switch(tipo) {
        case 'texto':
          const texto = control.get('valor_texto')?.value?.trim();
          if (!texto || texto.length === 0) {
            return { valorRequerido: true };
          }
          break;
          
        case 'numerico':
          const numerico = control.get('valor_numerico')?.value;
          if (numerico === null || numerico === undefined || numerico === '') {
            return { valorRequerido: true };
          }
          break;
          
        case 'rango':
          const rango = control.get('valor_rango')?.value;
          if (rango === null || rango === undefined) {
            return { valorRequerido: true };
          }
          break;
          
        case 'switch':
          // El switch siempre tiene valor (true/false)
          break;
      }
      
      return null;
    };
  }

  private validarDatoLibreCompleto() {
    return (control: AbstractControl) => {
      const tipo = control.get('tipo_control')?.value;
      const clave = control.get('clave')?.value?.trim();
      const valorTexto = control.get('valor_texto')?.value?.trim();
      const valorSwitch = control.get('valor_switch')?.value;
      
      // Si la clave está vacía o es muy corta
      if (!clave || clave.length < 2) {
        return { claveInvalida: true };
      }
      
      // Validar según el tipo
      if (tipo === 'texto') {
        if (!valorTexto || valorTexto.length === 0) {
          return { valorTextoRequerido: true };
        }
      }
      
      return null;
    };
  }

  // -----------------------------
  // GETTERS
  // -----------------------------
  get datosLibres(): FormArray {
    return this.historiaForm.get('datosLibres') as FormArray;
  }

  get datosEspecificos(): FormArray {
    return this.historiaForm.get('datosEspecificos') as FormArray;
  }

  // -----------------------------
  // MÉTODOS PARA VALIDACIÓN
  // -----------------------------
  getErrorCampo(campo: string): string {
    const control = this.historiaForm.get(campo);
    if (!control?.touched && !control?.dirty) return '';
    
    const errors = control.errors;
    if (!errors) return '';
    
    if (errors['required']) return 'Este campo es requerido';
    if (errors['min']) return `Valor mínimo: ${errors['min'].min}`;
    if (errors['max']) return `Valor máximo: ${errors['max'].max}`;
    if (errors['pattern']) return 'Formato inválido (ej: 120/80)';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    
    return 'Valor inválido';
  }

  getErrorDatoEspecifico(index: number, campo: string): string {
    const datoGrupo = this.datosEspecificos.at(index) as FormGroup;
    const control = datoGrupo.get(campo);
    
    if (!control?.touched && !control?.dirty) return '';
    const errors = control?.errors;
    if (!errors) return '';
    
    if (errors['required']) return 'Este campo es requerido';
    if (errors['min']) return `Valor mínimo: ${errors['min'].min}`;
    if (errors['max']) return `Valor máximo: ${errors['max'].max}`;
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    
    return '';
  }

  getErrorDatoLibre(index: number, campo: string): string {
    const datoGrupo = this.datosLibres.at(index) as FormGroup;
    const control = datoGrupo.get(campo);
    
    if (!control?.touched && !control?.dirty) return '';
    const errors = control?.errors;
    if (!errors) return '';
    
    if (errors['required']) return 'Este campo es requerido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    
    return '';
  }

  // Verificar si un dato libre está completo
  esDatoLibreCompleto(index: number): boolean {
    if (index >= this.datosLibres.length) return false;
    
    const dato = this.datosLibres.at(index) as FormGroup;
    return dato.valid && dato.get('clave')?.value?.trim().length >= 2;
  }

  // Verificar si todos los datos específicos están completos
  sonDatosEspecificosCompletos(): boolean {
    return this.datosEspecificos.controls.every(dato => dato.valid);
  }

  // -----------------------------
  // DATOS DINÁMICOS
  // -----------------------------
  agregarDatoLibre(): void {
    if (this.datosLibres.length >= 5) {
      this.error = 'Máximo 5 datos adicionales permitidos';
      return;
    }
    
    this.datosLibres.push(this.crearDatoLibre());
    this.actualizarValidacionDatosDinamicos();
  }

  removerDatoLibre(index: number): void {
    this.datosLibres.removeAt(index);
    this.actualizarValidacionDatosDinamicos();
    this.error = '';
  }

 cambiarTipoControlLibre(index: number, tipo: string) {
  const grupo = this.datosLibres.at(index) as FormGroup;
  
  // Definir los controles sin el operador spread
  const controlesPorTipo: any = {
    texto: {
      valor_texto: this.fb.control('', [Validators.required, Validators.maxLength(100)]),
      valor_switch: this.fb.control(null)
    },
    switch: {
      valor_texto: this.fb.control(''),
      valor_switch: this.fb.control(false, [Validators.required])
    }
  };
  
  // Remover controles existentes primero
  grupo.removeControl('valor_texto');
  grupo.removeControl('valor_switch');
  
  // Agregar nuevos controles
  grupo.addControl('valor_texto', controlesPorTipo[tipo].valor_texto);
  grupo.addControl('valor_switch', controlesPorTipo[tipo].valor_switch);
  
  // Actualizar valores
  grupo.patchValue({ 
    tipo_control: tipo,
    valor_texto: '',
    valor_switch: tipo === 'switch' ? false : null
  }, { emitEvent: false });
  
  grupo.updateValueAndValidity();
  this.actualizarValidacionDatosDinamicos();
}
  // Actualizar estado de validación de datos dinámicos
  private actualizarValidacionDatosDinamicos(): void {
    this.datosDinamicosValidos = [];
    
    // Verificar datos específicos
    this.datosEspecificos.controls.forEach((dato, index) => {
      this.datosDinamicosValidos[index] = dato.valid;
    });
    
    // Verificar datos libres
    this.datosLibres.controls.forEach((dato, index) => {
      this.datosDinamicosValidos[this.datosEspecificos.length + index] = dato.valid;
    });
  }

  // -----------------------------
  // PREPARAR DATOS PARA GUARDAR
  // -----------------------------
  private prepararDatosArray(array: FormArray): any[] {
    return array.value.map((dato: any, i: any) => {
      const tipo = dato.tipo_control;
      let valor = '';
      
      if (tipo === 'texto') {
        valor = dato.valor_texto?.trim() || '';
      } else if (tipo === 'rango') {
        valor = `${dato.valor_rango || 50}%`;
      } else if (tipo === 'numerico') {
        valor = dato.valor_numerico?.toString() || '';
      } else if (tipo === 'switch') {
        valor = dato.valor_switch ? 'Sí' : 'No';
      }
      
      // Solo incluir si tiene clave y valor válido
      if (dato.clave?.trim() && valor.toString().trim()) {
        return {
          clave: dato.clave.trim(),
          tipo_control: tipo,
          valor,
          valor_texto: tipo === 'texto' ? dato.valor_texto?.trim() : null,
          valor_rango: tipo === 'rango' ? dato.valor_rango : null,
          valor_numerico: tipo === 'numerico' ? dato.valor_numerico : null,
          valor_switch: tipo === 'switch' ? dato.valor_switch : null
        };
      }
      
      return null;
    }).filter((dato: any) => dato !== null); // Filtrar datos nulos
  }

  // -----------------------------
  // GUARDAR
  // -----------------------------
  async onSubmit(): Promise<void> {
    if (this.procesando) return;
    
    // Marcar todos los campos como tocados
    this.historiaForm.markAllAsTouched();
    this.datosEspecificos.controls.forEach(dato => dato.markAllAsTouched());
    this.datosLibres.controls.forEach(dato => dato.markAllAsTouched());
    
    // Validar formulario principal
    if (this.historiaForm.invalid) {
      this.error = 'Por favor completa todos los campos requeridos';
      return;
    }
    
    // Validar que al menos un dato específico esté completo
    const datosEspecificosValidos = this.datosEspecificos.controls.filter(dato => dato.valid).length;
    if (datosEspecificosValidos === 0) {
      this.error = 'Debes completar al menos uno de los datos específicos';
      return;
    }
    
    // Validar datos libres incompletos
    const datosLibresIncompletos = this.datosLibres.controls.filter(dato => {
      const clave = dato.get('clave')?.value?.trim();
      const tipo = dato.get('tipo_control')?.value;
      const valorTexto = dato.get('valor_texto')?.value?.trim();
      const valorSwitch = dato.get('valor_switch')?.value;
      
      if (!clave || clave.length < 2) return true;
      
      if (tipo === 'texto' && (!valorTexto || valorTexto.length === 0)) return true;
      
      return false;
    });
    
    if (datosLibresIncompletos.length > 0) {
      this.error = 'Hay datos adicionales incompletos. Complétalos o elimínalos';
      return;
    }

    this.procesando = true;
    this.error = '';

    try {
      const datosDinamicos = [
        ...this.prepararDatosArray(this.datosEspecificos),
        ...this.prepararDatosArray(this.datosLibres)
      ];

      // Validar que haya al menos un dato dinámico
      if (datosDinamicos.length === 0) {
        this.error = 'Debes agregar al menos un dato adicional';
        this.procesando = false;
        return;
      }

      // Validar claves duplicadas
      const claves = datosDinamicos.map(d => d.clave?.trim().toLowerCase()).filter(Boolean);
      if (new Set(claves).size !== claves.length) {
        this.error = 'Hay claves duplicadas entre los datos';
        this.procesando = false;
        return;
      }

      // Validar claves vacías o muy cortas
      const clavesInvalidas = datosDinamicos.filter(d => !d.clave || d.clave.trim().length < 2);
      if (clavesInvalidas.length > 0) {
        this.error = 'Algunas claves son inválidas (mínimo 2 caracteres)';
        this.procesando = false;
        return;
      }

      const formValue = this.historiaForm.value;
      
      // Validar valores numéricos
      if (isNaN(parseFloat(formValue.altura)) || isNaN(parseFloat(formValue.peso)) || isNaN(parseFloat(formValue.temperatura))) {
        this.error = 'Los valores numéricos no son válidos';
        this.procesando = false;
        return;
      }

      const historiaBase = {
        turno_id: this.turnoId,
        paciente_id: this.pacienteId,
        especialista_id: this.especialistaId,
        especialidad_id: this.especialidadId,
        altura: parseFloat(formValue.altura),
        peso: parseFloat(formValue.peso),
        temperatura: parseFloat(formValue.temperatura),
        presion: formValue.presion.trim()
      };

      // Guardar historia clínica completa
      const historiaGuardada = await this.historiaService.crearHistoriaClinicaCompleta(historiaBase, datosDinamicos);

      this.guardado.emit({ 
        success: true, 
        comentario: formValue.comentario?.trim(),
        historia: historiaGuardada 
      });

      // Limpiar formulario
      this.historiaForm.reset();
      this.datosEspecificos.clear();
      this.datosLibres.clear();
      this.error = '';

    } catch (err: any) {
      console.error('Error guardando historia clínica:', err);
      this.error = err.message || 'Error al guardar la historia clínica';
      this.guardado.emit({ success: false, error: this.error });
    } finally {
      this.procesando = false;
    }
  }

  // Método para limpiar formulario
  limpiarFormulario(): void {
    this.historiaForm.reset();
    this.datosEspecificos.clear();
    this.datosLibres.clear();
    this.error = '';
    this.datosDinamicosValidos = [];
  }

  // Verificar si se puede enviar el formulario
  get puedeEnviar(): boolean {
    return this.historiaForm.valid && 
           this.datosEspecificos.controls.some(dato => dato.valid) &&
           this.datosLibres.controls.every(dato => dato.valid || dato.get('clave')?.value?.trim() === '');
  }
}