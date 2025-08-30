import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Web3Service, Candidate } from '../services/web3.service';

@Component({
  selector: 'app-realtime',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './realtime.component.html'
})
export class RealtimeComponent implements OnInit, OnDestroy {
  electionId = 0;
  candidates: Candidate[] = [];
  images: Record<number, string> = {};
  total = 0;

  trackById = (_: number, c: Candidate) => c.id;

  constructor(private web3: Web3Service) {}

  async ngOnInit() {
    await this.loadInitial();
    this.web3.onVote((_eId, candId, newTotal) => {
      const c = this.candidates.find(x => x.id === candId);
      if (c) c.voteCount = newTotal;
      this.computeTotal?.(); // existe sólo en realtime; en votación puedes omitirla
    });
  }
  ngOnDestroy() { this.web3.offVote(); }

  private async loadInitial() {
    this.electionId = await this.web3.currentElectionId();
    this.candidates = await this.web3.getAllCandidates();
    this.images = await this.web3.getCandidateMeta(this.electionId || 0);
    this.computeTotal();
  }

  computeTotal() { this.total = this.candidates.reduce((s, c) => s + (c.voteCount || 0), 0); }
  pct(c: Candidate) { return this.total ? ((c.voteCount || 0) * 100 / this.total).toFixed(1) : '0.0'; }
  imgFor(c: Candidate) { return this.images[c.id] || 'assets/placeholder.png'; }
}
