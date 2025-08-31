import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { RnpService } from './services/rnp.service';
import { Candidate, Web3Service } from './services/web3.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, RouterLink, RouterLinkActive, MatToolbarModule, MatIconModule, MatButtonModule, MatMenuModule],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {

  candidates: Candidate[] = [];
  constructor(private readonly rnp: RnpService, private readonly web3: Web3Service) {}

  async ngOnInit(): Promise<void> {
    this.candidates = await this.web3.getAllCandidates();
  }

  async simulateVotes(): Promise<void> {
    for (let i = 0; i < 101; i++) {
      try {
        const proof = await this.rnp.getProof(i.toString(), i.toString());
        const candidateId = Math.floor(Math.random() * this.candidates.length || 4);
        await this.web3.voteRelayer(candidateId, proof);
      } catch (e: any) {
        console.error(e);
      }
    }
  }
}
