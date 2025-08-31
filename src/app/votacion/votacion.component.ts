import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Web3Service, Candidate } from '../services/web3.service';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RnpService } from '../services/rnp.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-votacion',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    MatCardModule, 
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatRippleModule],
  templateUrl: './votacion.component.html'
})
export class VotacionComponent implements OnInit, OnDestroy {
  dni = '';
  fingerprint = '';

  electionId = 0;
  candidates: Candidate[] = [];
  images: Record<number, string> = {};
  selectedId?: number;

  msg = '';

  trackById = (_: number, c: Candidate) => c.id;

  constructor(public web3: Web3Service, public rnp: RnpService) { }

  async ngOnInit() {
    try {
      await this.loadData();
      this.web3.onVote((_eId, candId, newTotal) => {
        const c = this.candidates.find(x => x.id === candId);
        if (c) c.voteCount = newTotal;
      });
    } catch (e: any) {
      this.msg = 'Error cargando datos: ' + (e?.message || e);
      console.error(e);
    }
  }

  ngOnDestroy() {
    this.web3.offVote();
  }

  private async loadData() {
    this.electionId = await this.web3.currentElectionId();
    this.candidates = await this.web3.getAllCandidates();
    console.log('candidates', this.candidates);
    this.images = await this.web3.getCandidateMeta(this.electionId || 0);
    if (this.candidates.length) this.selectedId = this.candidates[0].id;
  }

  async vote() {
    this.msg = '';
    if (!this.dni || !this.fingerprint || this.selectedId === undefined) {
      this.msg = 'Completa DNI, huella y selecciona un candidato.';
      return;
    }
    try {
      const proof = await this.rnp.getProof(this.dni, this.fingerprint);
      const tx = await this.web3.voteRelayer(this.selectedId, proof);
      if (!tx.txHash) {
        this.showError('Error al emitir el voto');
        return;
      }
      this.showSuccess('Voto emitido');
    } catch (e: any) {
      this.showError(e?.message || 'Error al votar');
    }
  }

  imgFor(c: Candidate) { return this.images[c.id] || 'assets/placeholder.png'; }

  showError(error: string) {
    Swal.fire({
      title: 'Error',
      text: error,
      icon: 'error'
    });
  }

  showSuccess(message: string) {
    Swal.fire({
      title: 'Success',
      text: message,
      icon: 'success'
    });
  }
}
