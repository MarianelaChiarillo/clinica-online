import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TurnosService } from '../../../services/turnos.service';
import { ModalService } from '../../../services/modal.service';
import { TurnoExtendido } from '../../../models/turno';
import { ModalContainerComponent } from '../../componentes/modales/modal-container/modal-container.component';
import supabase from '../../../services/supabase.client';
import { HistoriaClinicaService } from '../../../services/usuarios/historia-clinica.service';
import { AuthService } from '../../../services/auth.service';
import { FiltroService } from '../../../services/usuarios/filtro.service';
import { FiltroGeneralComponent } from '../../componentes/filtro-general/filtro-general.component';
import { MenuComponent } from '../../componentes/menu/menu.component';
import { EstadoEtiquetaPipe } from '../../../pipes/estadoEtiqueta.pipe';
@Component({
  selector: 'app-turnos-especialista',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalContainerComponent, FiltroGeneralComponent, MenuComponent,EstadoEtiquetaPipe],
  templateUrl: './turnos-especialista.component.html',
  styleUrls: ['./turnos-especialista.component.scss'],
})
export class TurnosEspecialistaComponent implements OnInit, OnDestroy {
  turnos: TurnoExtendido[] = [];
  turnosFiltrados: TurnoExtendido[] = [];

  loading = false;
  error: string | null = null;

  private canalRealtime: any;

  constructor(
    private turnosService: TurnosService,
    private modalService: ModalService,
    private historiaClinicaService: HistoriaClinicaService,
    private authService: AuthService,
    private filtroService: FiltroService
  ) {}

  async ngOnInit() {
    await this.cargarTurnos();
    this.suscribirRealtime();
  }

  ngOnDestroy() {
    if (this.canalRealtime) this.canalRealtime.unsubscribe();
  }

  suscribirRealtime() {
    this.canalRealtime = supabase
      .channel('turnos-especialista')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'turnos'
        },
        async () => {
          await this.cargarTurnos();
        }
      )
      .subscribe();
  }

  async cargarTurnos() {
    this.loading = true;
    this.error = null;

    try {
      console.log('🔄 Cargando turnos del especialista...');
      const turnosBase = await this.turnosService.obtenerTurnosDelEspecialistaActual();
      
      // Inicializar turnos con estructura extendida
      this.turnos = turnosBase.map(turno => ({
        ...turno,
        historia_clinica: undefined,
        coincidencias: []
      })) as TurnoExtendido[];
      
      console.log('📦 TODOS LOS TURNOS OBTENIDOS DEL SERVICIO:');
      this.turnos.forEach((turno, index) => {
        console.log(`Turno ${index}:`, {
          id: turno.id,
          estado: turno.estado,
          paciente: `${turno.pacientes?.nombre} ${turno.pacientes?.apellido}`,
          fecha: turno.fecha_turno,
          especialidad: turno.especialidades?.nombre
        });
      });

      await this.cargarHistoriasClinicas();
      
      this.turnosFiltrados = [...this.turnos];
      
    } catch (err) {
      console.error('❌ Error cargando turnos:', err);
      this.error = 'Error al cargar los turnos';
    } finally {
      this.loading = false;
    }
  }

  private async cargarHistoriasClinicas(): Promise<void> {
    const turnosRealizados = this.turnos.filter(t => t.estado === 'realizado');
    
    console.log('🔍 TURNOS REALIZADOS QUE DEBERÍAN TENER HC:', 
      turnosRealizados.map(t => ({ 
        id: t.id, 
        paciente: `${t.pacientes?.nombre} ${t.pacientes?.apellido}`,
        fecha: t.fecha_turno 
      }))
    );
    
    const promesas = turnosRealizados.map(async (turno) => {
      try {
        console.log(`🔍 [TURNO ${turno.id}] Cargando historia clínica...`);
        const historia = await this.historiaClinicaService.obtenerHistoriaClinicaPorTurno(turno.id);
        
        if (historia) {
          console.log(`✅ [TURNO ${turno.id}] HC ENCONTRADA:`, {
            hcId: historia.id,
            turnoId: historia.turno_id,
            datosDinamicosCount: historia.datos_dinamicos?.length || 0
          });
        } else {
          console.log(`❌ [TURNO ${turno.id}] NO SE ENCONTRÓ HC EN LA BD`);
        }
        
        turno.historia_clinica = historia;
        
      } catch (error) {
        console.error(`💥 [TURNO ${turno.id}] ERROR:`, error);
        turno.historia_clinica = null;
      }
    });

    await Promise.all(promesas);
    
    console.log('📊 RESUMEN FINAL DE CARGA HC:');
    turnosRealizados.forEach(t => {
      console.log(`- Turno ${t.id} (${t.pacientes?.nombre} ${t.pacientes?.apellido}): ${t.historia_clinica ? '✅ CON HC' : '❌ SIN HC'}`);
    });
  }

  // Método llamado cuando el filtro general emite turnos filtrados
  onTurnosFiltradosChange(turnosFiltrados: TurnoExtendido[]) {
    this.turnosFiltrados = turnosFiltrados;
  }

  // Método opcional si necesitas el texto del filtro
  onFiltroChange(filtroTexto: string) {
    // Puedes usar esto para mostrar info del filtro si lo necesitas
    console.log('Filtro aplicado:', filtroTexto);
  }

  accionesEspecialista(t: TurnoExtendido): string[] {
    const estado = t.estado?.toLowerCase().trim();
    const acciones: string[] = [];

    if (estado === 'solicitado') {
      acciones.push('aceptar', 'rechazar', 'cancelar');
    }
    if (estado === 'aceptado') {
      acciones.push('finalizar');
    }

    if (t.comentario_especialista) {
      acciones.push('ver_resena');
    }
    return acciones;
  }

  async ejecutarAccion(accion: string, turno: TurnoExtendido) {
    let prom: any;

    switch (accion) {
      case 'aceptar':
        prom = this.modalService.abrirAceptarTurno(turno);
        break;
      case 'rechazar':
        prom = this.modalService.abrirRechazarTurno(turno);
        break;
      case 'cancelar':
        prom = this.modalService.abrirCancelarTurno(turno);
        break;
      case 'finalizar':
        prom = this.modalService.abrirFinalizarTurno(turno);
        break;
      case 'ver_resena':
        this.modalService.abrirComentarioTurno(turno);
        return;
    }

    const turnoActualizado = await prom;
    if (turnoActualizado) this.actualizarLocal(turnoActualizado);
  }

  private actualizarLocal(t: TurnoExtendido) {
    const index = this.turnos.findIndex(x => x.id === t.id);
    if (index !== -1) {
      this.turnos[index] = t;
      this.turnosFiltrados = [...this.turnos];
    }
  }

  // Métodos públicos para el template
  formatearFecha(fecha: string): string {
    return this.filtroService.formatearFecha(fecha);
  }

  formatearHora(hora: string): string {
    return this.filtroService.formatearHora(hora);
  }

  obtenerColorEstado(estado: string) {
    const map: any = {
      solicitado: 'warning',
      aceptado: 'info',
      realizado: 'success',
      cancelado: 'danger',
      rechazado: 'secondary'
    };
    return map[estado?.toLowerCase()] || 'secondary';
  }

  obtenerTextoEstado(estado: string) {
    return this.filtroService.formatearEstado(estado);
  }

  limpiarError() {
    this.error = null;
  }

  getTextoAccion(accion: string): string {
    const textos: any = {
      'aceptar': 'Aceptar',
      'rechazar': 'Rechazar', 
      'cancelar': ' Cancelar',
      'finalizar': 'Finalizar',
      'ver_resena': 'Ver Reseña'
    };
    return textos[accion] || accion;
  }
}