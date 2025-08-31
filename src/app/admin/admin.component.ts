import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Web3Service, Candidate } from '../services/web3.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, MatToolbarModule, MatExpansionModule, MatCheckboxModule, MatListModule, MatDividerModule, MatIconModule, MatCardModule, MatFormFieldModule, MatInputModule],
  templateUrl: './admin.component.html'
})
export class AdminComponent implements OnInit, OnDestroy {
  account: string | null = null;
  status = '';

  electionId = 0;
  candidates: Candidate[] = [];
  newCandidate = '';
  replaceCandidates = false;
  newCandidatesMultiline = '';

  centerId?: number;
  centerName = '';
  centerAdminAddr = '';
  mesaId?: number;
  root = '';

  images: Record<number, string> = {};
  trackById = (_: number, c: Candidate) => c.id;

  constructor(private web3: Web3Service) {}

  async ngOnInit() { await this.refresh(); }
  ngOnDestroy() { this.web3.removeAllListeners(); }

  async connect() {
    try { this.account = await this.web3.connectWallet(); this.status = `Conectado: ${this.account}`; }
    catch (e: any) { this.status = 'Error: ' + (e?.message || e); }
  }

  async refresh() {
    this.electionId = await this.web3.currentElectionId();
    this.candidates = await this.web3.getAllCandidates();
    this.images = await this.web3.getCandidateMeta(this.electionId || 0);
  }

  async addCandidate() {
    try { const h = await this.web3.addCandidate(this.newCandidate); this.status = `Candidato añadido. TX: ${h}`; this.newCandidate=''; await this.refresh(); }
    catch (e:any){ this.status='Error: '+(e?.message||e); }
  }
  async clearCandidates() {
    try { const h = await this.web3.clearCandidates(); this.status = `Candidatos limpiados. TX: ${h}`; await this.refresh(); }
    catch (e:any){ this.status='Error: '+(e?.message||e); }
  }
  async startElection() {
    try {
      const list = this.replaceCandidates ? this.newCandidatesMultiline.split('\n').map(s=>s.trim()).filter(Boolean) : [];
      const h = await this.web3.startElection(list, this.replaceCandidates);
      this.status = `Elección iniciada. TX: ${h}`; this.newCandidatesMultiline=''; await this.refresh();
    } catch(e:any){ this.status='Error: '+(e?.message||e); }
  }

  async registerCenter() {
    if (this.centerId === undefined || !this.centerName) { this.status='CenterId y nombre requeridos'; return; }
    try { const h = await this.web3.registerCenter(this.centerId, this.centerName); this.status = `Centro registrado. TX: ${h}`; }
    catch(e:any){ this.status='Error: '+(e?.message||e); }
  }
  async setCenterAdmin() {
    if (this.centerId === undefined || !this.centerAdminAddr) { this.status='centerId y address requeridos'; return; }
    try { const h = await this.web3.setCenterAdmin(this.centerId, this.centerAdminAddr, true); this.status = `Admin asignado. TX: ${h}`; }
    catch(e:any){ this.status='Error: '+(e?.message||e); }
  }
  async calcRoot() {
    if (this.centerId === undefined || this.mesaId === undefined) { this.status='centerId y mesaId requeridos'; return; }
    try { this.root = await this.web3.calcRoot(this.centerId, this.mesaId); this.status='Root calculada desde RNP'; }
    catch(e:any){ this.status='Error: '+(e?.message||e); }
  }
  async setRoot() {
    if (this.centerId === undefined || this.mesaId === undefined || !this.root) { this.status='Faltan datos'; return; }
    try { const h = await this.web3.setCenterMesaRoot(this.centerId, this.mesaId, this.root); this.status = `Root seteada. TX: ${h}`; }
    catch(e:any){ this.status='Error: '+(e?.message||e); }
  }
  async openCenter() {
    if (this.centerId === undefined) { this.status='centerId requerido'; return; }
    try { const h = await this.web3.openCenter(this.centerId); this.status = `Centro ${this.centerId} abierto. TX: ${h}`; }
    catch(e:any){ this.status='Error: '+(e?.message||e); }
  }
  async closeCenter() {
    if (this.centerId === undefined) { this.status='centerId requerido'; return; }
    try { const h = await this.web3.closeCenter(this.centerId); this.status = `Centro ${this.centerId} cerrado. TX: ${h}`; }
    catch(e:any){ this.status='Error: '+(e?.message||e); }
  }

  async saveImages() {
    try {
      const items = Object.keys(this.images).map(k => ({ candidateId: Number(k), imageUrl: this.images[Number(k)] || '' }));
      await this.web3.saveCandidateMeta(this.electionId || 0, items);
      this.status = 'Imágenes guardadas';
    } catch (e:any) { this.status = 'Error guardando imágenes: ' + (e?.message || e); }
  }

  async syncRoot() {
    try {
      const r = await this.web3.syncRootFromRNP();
      this.status = `Root sincronizada: ${r.root} (tx: ${r.txHash})`;
    } catch (e:any) {
      this.status = 'Error sincronizando root: ' + (e?.message || e);
    }
  }
}
