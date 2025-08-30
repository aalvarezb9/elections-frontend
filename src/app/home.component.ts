import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [CommonModule, RouterLink],
  template: `
    <h2>Sistema de Votación</h2>
    <p>Elige una sección:</p>
    <ul>
      <li><a routerLink="/admin">Administración</a></li>
      <li><a routerLink="/votacion">Votación pública</a></li>
      <li><a routerLink="/realtime">Panel en tiempo real</a></li>
    </ul>
  `
})
export class HomeComponent {}
