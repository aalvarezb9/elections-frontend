import { Routes } from '@angular/router';
import { AdminComponent } from './admin/admin.component';
import { VotacionComponent } from './votacion/votacion.component';
import { RealtimeComponent } from './realtime/realtime.component';
import { HomeComponent } from './home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'votacion', component: VotacionComponent },
  { path: 'realtime', component: RealtimeComponent },
  { path: '**', redirectTo: '' }
];
