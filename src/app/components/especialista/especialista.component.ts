import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-especialista.component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './especialista.component.html',
  styleUrl: './especialista.component.scss',
})
export class EspecialistaComponent {
  constructor(
    private router: Router,
  ) { }


}