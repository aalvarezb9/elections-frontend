import { Component, OnInit } from '@angular/core';
import { Candidate, OnChainVote, Web3Service } from '../services/web3.service';
import { GenericTableComponent } from '../generic-table/generic-table.component';
import { MatSelectModule } from '@angular/material/select';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-votes',
  imports: [GenericTableComponent, MatSelectModule],
  templateUrl: './votes.component.html',
  styleUrl: './votes.component.scss'
})
export class VotesComponent implements OnInit {

  candidates: Candidate[] = [];
  electionId = 0;
  votes: OnChainVote[] = [];
  limit = 10;
  start = 0;
  loading = false;
  candidateId!: number;

  constructor(private readonly web3: Web3Service) {}

  async ngOnInit(): Promise<void> {
    this.loading = true;
    await this.loadVotes();
    this.loading = false;
  }

  async loadVotes() {
    const eid = await this.web3.currentElectionId();
    const responseVotes = await this.web3.listVotes({ electionId: eid, start: 0, limit: 50 });
    this.votes = responseVotes.items;
  }

  async loadVotesByCandidate() {
    const eid = await this.web3.currentElectionId();
    const responseVotes = await this.web3.listVotesByCandidate(eid, this.candidateId, 0, 50);
    this.votes = responseVotes.items;
  }

  onPageChange(event: PageEvent) {
    this.start = event.pageIndex * event.pageSize;
    this.limit = event.pageSize;
  }
}
