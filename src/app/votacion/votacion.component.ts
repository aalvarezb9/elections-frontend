import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Web3Service, Candidate } from '../services/web3.service';

@Component({
  selector: 'app-votacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(public web3: Web3Service) {}

  async ngOnInit() {
    try {
      await this.loadData();
      this.web3.onVote((_eId, candId, newTotal) => {
        const c = this.candidates.find(x => x.id === candId);
        if (c) c.voteCount = newTotal;
      });
    } catch (e:any) {
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
      const tx = await this.web3.voteRelayerSimple(this.dni, this.fingerprint, this.selectedId);
      this.msg = '✅ Voto emitido. TX: ' + tx;
    } catch (e: any) {
      this.msg = '❌ ' + (e?.message || 'Error de red');
    }
  }

  imgFor(c: Candidate) { return this.images[c.id] || 'assets/placeholder.png'; }
}
