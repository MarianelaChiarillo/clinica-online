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

  constructor(
    private fb: FormBuilder,
    private historiaService: HistoriaClinicaService
  ) {
    this.historiaForm = this.crearForm();
  }

  ngOnInit() {}

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
        this.crearDato('rango', 'Nivel'),
        this.crearDato('numerico', 'Valor numérico'),
        this.crearDato('switch', 'Sí / No')
      ]),
      datosLibres: this.fb.array([]),
      comentario: [''],
    });
  }

  private crearDato(tipo: string, claveDefault: string = ''): FormGroup {
    return this.fb.group({
      clave: [claveDefault, [Validators.required]],
      tipo_control: [tipo, [Validators.required]],
      valor_texto: [''],
      valor_rango: tipo === 'rango' ? 50 : null,
      valor_numerico: tipo === 'numerico' ? '' : null,
      valor_switch: tipo === 'switch' ? false : null
    });
  }

  private crearDatoLibre(): FormGroup {
    return this.fb.group({
      clave: ['', Validators.required],
      tipo_control: ['texto'],
      valor_texto: [''],
      valor_switch: [false]
    });
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
  // DATOS DINÁMICOS
  // -----------------------------
  agregarDatoLibre(): void {
    if (this.datosLibres.length >= 3) return;
    this.datosLibres.push(this.crearDatoLibre());
    console.log('Dato libre agregado. Total datos libres:', this.datosLibres.length);
  }

  removerDatoLibre(index: number): void {
    this.datosLibres.removeAt(index);
    console.log('Dato libre removido. Total datos libres:', this.datosLibres.length);
  }

  cambiarTipoControlLibre(index: number, tipo: string) {
    const grupo = this.datosLibres.at(index) as FormGroup;
    const valoresPorTipo: any = {
      texto: { valor_texto: '', valor_switch: null },
      switch: { valor_texto: '', valor_switch: false }
    };
    grupo.patchValue({ tipo_control: tipo, ...valoresPorTipo[tipo] }, { emitEvent: false });
    grupo.updateValueAndValidity();
    console.log(`Tipo de dato libre en posición ${index} cambiado a:`, tipo);
  }

  // -----------------------------
  // PREPARAR DATOS PARA GUARDAR
  // -----------------------------
  private prepararDatosArray(array: FormArray): any[] {
    return array.value.map((dato: any, i: any) => {
      const tipo = dato.tipo_control;
      let valor = '';
      if (tipo === 'texto') valor = dato.valor_texto || '';
      if (tipo === 'rango') valor = `${dato.valor_rango || 50}%`;
      if (tipo === 'numerico') valor = dato.valor_numerico?.toString() || '';
      if (tipo === 'switch') valor = dato.valor_switch ? 'Sí' : 'No';
      console.log('Preparando dato', i, dato);
      return {
        clave: dato.clave,
        tipo_control: tipo,
        valor,
        valor_texto: tipo === 'texto' ? dato.valor_texto : null,
        valor_rango: tipo === 'rango' ? dato.valor_rango : null,
        valor_numerico: tipo === 'numerico' ? dato.valor_numerico : null,
        valor_switch: tipo === 'switch' ? dato.valor_switch : null
      };
    });
  }

  // -----------------------------
  // GUARDAR
  // -----------------------------
  async onSubmit(): Promise<void> {
  if (this.procesando) return; // evita doble submit
  this.procesando = true;
  this.error = '';
  this.historiaForm.markAllAsTouched();

  try {
    const datosDinamicos = [
      ...this.prepararDatosArray(this.datosEspecificos),
      ...this.prepararDatosArray(this.datosLibres)
    ];

    // Validar claves duplicadas
    const claves = datosDinamicos.map(d => d.clave?.trim().toLowerCase()).filter(Boolean);
    if (new Set(claves).size !== claves.length) {
      this.error = 'Hay claves duplicadas entre los datos';
      console.error(this.error);
      this.guardado.emit({ success: false, error: this.error });
      return;
    }

    const formValue = this.historiaForm.value;
    const historiaBase = {
      turno_id: this.turnoId,
      paciente_id: this.pacienteId,
      especialista_id: this.especialistaId,
      especialidad_id: this.especialidadId,
      altura: parseFloat(formValue.altura),
      peso: parseFloat(formValue.peso),
      temperatura: parseFloat(formValue.temperatura),
      presion: formValue.presion
    };

    // Guardar historia clínica completa
    const historiaGuardada = await this.historiaService.crearHistoriaClinicaCompleta(historiaBase, datosDinamicos);
    console.log('Historia clínica guardada:', historiaGuardada);

    this.guardado.emit({ success: true,           comentario: formValue.comentario,
 historia: historiaGuardada });

    // Limpiar formulario para evitar re-envíos
    this.historiaForm.reset();
    this.datosEspecificos.clear();
    this.datosLibres.clear();

  } catch (err: any) {
    this.error = err.message || 'Error al guardar la historia clínica';
    console.error('Error guardando historia clínica:', err);
    this.guardado.emit({ success: false, error: this.error });
  } finally {
    this.procesando = false;
  }
}

}
