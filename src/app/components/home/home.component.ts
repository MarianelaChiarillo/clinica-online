import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuComponent } from '../componentes/menu/menu.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, MenuComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
