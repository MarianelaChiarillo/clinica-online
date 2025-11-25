import { Component, Input, Output, EventEmitter } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mensaje',
  standalone: true,
  template: '',
})
export class MensajeComponent {
  @Input() titulo: string = '';
  @Input() mensaje: string = '';
  @Input() tipo: 'error' | 'success' | 'info' | 'confirm' = 'info';

  @Output() cerrar = new EventEmitter<void>();
  @Output() confirmar = new EventEmitter<void>();

  ngOnInit() {
    if (this.tipo === 'confirm') {
      this.mostrarConfirmAlert();
    } else {
      this.mostrarSweetAlert();
    }
  }

mostrarSweetAlert() {
  const iconoValido: 'success' | 'error' | 'info' | 'warning' | 'question' =
    this.tipo === 'confirm' ? 'info' : this.tipo;

  Swal.fire({
    title: `<span class="text">${this.titulo}</span>`,
    html: `<span class="text">${this.mensaje}</span>`,
    icon: iconoValido,
    color: '#312b2bff',
    confirmButtonText: 'Aceptar',
    customClass: {
      popup: 'alert-sala',
      icon: 'alert-icono',
      confirmButton: 'text boton-sala',
    },
    showClass: {
      popup: 'animate__animated animate__fadeInDown',
    },
    hideClass: {
      popup: 'animate__animated animate__fadeOutUp',
    },
  }).then(() => {
    this.cerrar.emit();
  });
}


  mostrarConfirmAlert() {
    Swal.fire({
      title: `<span class="text">${this.titulo}</span>`,
      html: `<span class="text">${this.mensaje}</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quiero',
      confirmButtonColor: 'rgba(51, 130, 221, 1)',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#d33',
      customClass: {
        confirmButton: 'text',
        cancelButton: 'text ',
      },
    }).then(result => {
      if (result.isConfirmed) {
        this.confirmar.emit();
      } else {
        this.cerrar.emit();
      }
    });
  }

   static async confirm(
    titulo: string, 
    mensaje: string
  ): Promise<boolean> {
    const result = await Swal.fire({
      title: `<span class="text">${titulo}</span>`,
      html: `<span class="text">${mensaje}</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quiero',
      confirmButtonColor: 'rgba(51, 130, 221, 1)',
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#d33',
      customClass: {
        popup: 'alert-sala',
        confirmButton: 'text',
        cancelButton: 'text',
      },
      showClass: {
        popup: 'animate__animated animate__fadeInDown',
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp',
      },
    });

    return result.isConfirmed;
  }

  static show({ titulo, mensaje, tipo }: {titulo: string, mensaje: string, tipo: any}) {
  Swal.fire({
    title: `<span class="text">${titulo}</span>`,
    html: `<span class="text">${mensaje}</span>`,
    icon: tipo,
    confirmButtonText: 'Aceptar',
    customClass: {
      popup: 'alert-sala',
      icon: 'alert-icono',
      confirmButton: 'text boton-sala',
    }
  });
}

}

