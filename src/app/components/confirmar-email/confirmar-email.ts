import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-confirmar-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmar-email.html',
  styleUrls: ['./confirmar-email.scss']
})
export class ConfirmarEmailComponent implements OnInit {

  cargando = true;
  confirmacionExitosa = false;
  mensajeError = '';

  constructor(
    private ruta: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.confirmarEmail();
  }

  async confirmarEmail() {
    this.cargando = true;
    this.confirmacionExitosa = false;
    this.mensajeError = '';

    const token = this.ruta.snapshot.queryParams['token'];
    const tipo = this.ruta.snapshot.queryParams['type'];

    if (!token || tipo !== 'signup') {
      this.mensajeError = 'Link de confirmación inválido.';
      this.cargando = false;
      return;
    }

    try {
      const resultado = await this.authService.confirmarEmail(token);
      if (resultado.error) {
        this.mensajeError = resultado.error.message || 'Error desconocido.';
        this.confirmacionExitosa = false;
      } else {
        this.confirmacionExitosa = true;
      }
    } catch (error: any) {
      this.mensajeError = error.message || 'Error desconocido.';
      this.confirmacionExitosa = false;
    }

    this.cargando = false;
  }

  irALogin() {
    this.router.navigate(['/login']);
  }
}
