// src/app/components/confirm-email/confirm-email.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmar-email.html',
  styleUrls: ['./confirmar-email.scss']
})
export class ConfirmEmailComponent implements OnInit {
  cargando = true;
  confirmacionExitosa = false;
  mensajeError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {}

  async ngOnInit() {
    await this.procesarConfirmacion();
  }

  async procesarConfirmacion() {
    try {
      const token = this.route.snapshot.queryParams['token'];
      const type = this.route.snapshot.queryParams['type'];

      if (!token || type !== 'signup') throw new Error('Link de confirmación inválido.');

      const { error } = await this.auth.confirmarEmail(token);
      if (error) throw error;

      this.confirmacionExitosa = true;
    } catch (err: any) {
      this.confirmacionExitosa = false;
      this.mensajeError = err.message || 'Error desconocido.';
    } finally {
      this.cargando = false;
    }
  }

  irALogin() {
    this.router.navigate(['/login']);
  }
}
