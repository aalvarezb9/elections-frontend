import { Component, OnInit, signal } from '@angular/core';
import { Candidate, OnChainVote, Web3Service } from '../services/web3.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

type VoteCard = OnChainVote & { candidateName: string; imageURI?: string };
@Component({
  selector: 'app-votes',
  imports: [CommonModule, MatCardModule, MatToolbarModule, MatProgressSpinnerModule],
  templateUrl: './votes.component.html',
  styleUrl: './votes.component.scss'
})
export class VotesComponent implements OnInit {

  loading = signal(true);
  cards = signal<VoteCard[]>([]);

  constructor(private readonly web3: Web3Service) {}

  async ngOnInit() {
    try {
      const candidates: Candidate[] = await this.web3.getAllCandidates();
      const cmap = new Map<number, Candidate>();
      for (const c of candidates) cmap.set(c.id, c);

      const resp = await this.web3.listVotes();
      const items = resp?.items ?? [];

      const cards = items.map(v => {
        const c = cmap.get(v.candidateId);
        return {
          ...v,
          candidateName: c?.name ?? `Candidato ${v.candidateId}`,
          imageURI: c?.imageURI
        } as VoteCard;
      });

      cards.sort((a, b) => a.id - b.id);
      this.cards.set(cards);
    } catch (e) {
      console.error('error cargando votos:', e);
      this.cards.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
