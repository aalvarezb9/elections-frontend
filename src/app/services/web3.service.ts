// src/app/services/web3.service.ts
import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import contractInfo from '../../assets/contract.json';
import { Proof } from './rnp.service';

export interface Candidate {
  id: number;
  name: string;
  voteCount: number;
  imageURI?: string;
}

export interface OnChainVote {
  id: number;
  candidateId: number;
  timestamp: number; // epoch seconds (uint64 en contrato)
}

@Injectable({ providedIn: 'root' })
export class Web3Service {
  private read = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
  private RELAYER_URL = 'http://localhost:3000';
  private contractRead = new ethers.Contract(contractInfo.address, contractInfo.abi, this.read);

  private events: ethers.Contract;
  private mm?: ethers.providers.Web3Provider;
  private signer?: ethers.Signer;
  private contractWrite?: ethers.Contract;

  constructor() {
    let ev: ethers.Contract;
    try {
      const ws = new ethers.providers.WebSocketProvider('ws://127.0.0.1:8545');
      ev = new ethers.Contract(contractInfo.address, contractInfo.abi, ws);
    } catch {
      (this.read as any).pollingInterval = 1000;
      ev = this.contractRead;
    }
    this.events = ev;
  }

  private async assertContract() {
    const code = await this.read.getCode(contractInfo.address);
    if (!code || code === '0x') {
      throw new Error(`No hay contrato en ${contractInfo.address} (localhost:8545). Redeploy y actualiza assets/contract.json.`);
    }
  }

  async connectWallet(): Promise<string> {
    const anyWin = window as any;
    if (!anyWin.ethereum) throw new Error('Instala MetaMask');

    this.mm = new ethers.providers.Web3Provider(anyWin.ethereum);
    const targetChainIdHex = '0x7A69';
    try {
      const net = await this.mm.getNetwork();
      if (net.chainId !== 31337) {
        await anyWin.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainIdHex }]
        });
      }
    } catch {
      await anyWin.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: targetChainIdHex,
          chainName: 'Hardhat (localhost)',
          rpcUrls: ['http://127.0.0.1:8545'],
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
        }]
      });
    }

    await this.mm.send('eth_requestAccounts', []);
    this.signer = this.mm.getSigner();

    await this.assertContract();
    this.contractWrite = this.contractRead.connect(this.signer);
    return await this.signer.getAddress();
  }

  // -------- Lecturas --------
  async currentElectionId(): Promise<number> {
    await this.assertContract();
    const id: ethers.BigNumber = await this.contractRead['currentElectionId']();
    return id.toNumber();
  }

  async getElection(electionId: number) {
    await this.assertContract();
    return await this.contractRead['getElection'](electionId);
  }

  async getCandidatesCount(): Promise<number> {
    await this.assertContract();
    const n: ethers.BigNumber = await this.contractRead['getCandidatesCount']();
    return n.toNumber();
  }

  async getCandidate(i: number): Promise<Candidate> {
    await this.assertContract();
    const t = await this.contractRead['getCandidate'](i);
    return {
      id: (t.id ?? t[0]).toNumber(),
      name: (t.name ?? t[1]),
      voteCount: (t.voteCount ?? t[2]).toNumber(),
    };
  }

  async getAllCandidates(): Promise<Candidate[]> {
    await this.assertContract();
    const raw = await this.contractRead['getAllCandidates']();
    return raw.map((t: any) => ({
      id: (t.id ?? t[0]).toNumber(),
      name: t.name ?? t[1],
      voteCount: (t.voteCount ?? t[2]).toNumber(),
      imageURI: t.imageURI ?? t[3],
    }));
  }

  // -------- Escrituras admin (si usas wallet) --------
  private needWrite() {
    if (!this.contractWrite) throw new Error('Conecta wallet para firmar transacciones');
  }
  async createElection(title: string) { this.needWrite(); const tx = await this.contractWrite!['createElection'](title); await tx.wait(); return tx.hash; }
  async addCandidate(name: string)   { this.needWrite(); const eid = await this.currentElectionId(); const tx = await this.contractWrite!['addCandidate'](eid, name); await tx.wait(); return tx.hash; }
  async closeCurrentElection()       { this.needWrite(); const tx = await this.contractWrite!['closeCurrentElection'](); await tx.wait(); return tx.hash; }

  // -------- Metadatos de imágenes (relayer) --------
  async getCandidateMeta(electionId: number): Promise<Record<number, string>> {
    if (!electionId) return {};
    const r = await fetch(`${this.RELAYER_URL}/candidate-meta?electionId=${electionId}`);
    if (!r.ok) return {};
    const j = await r.json();
    const map: Record<number, string> = {};
    for (const it of (j.items || [])) map[Number(it.candidateId)] = String(it.imageUrl || '');
    return map;
  }
  async saveCandidateMeta(electionId: number, items: {candidateId: number; imageUrl: string}[]) {
    const r = await fetch(`${this.RELAYER_URL}/candidate-meta`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ electionId, items })
    });
    if (!r.ok) throw new Error(await r.text());
    return true;
  }

  // -------- Voto vía relayer (sin mesaId ni candidateId en el body) --------
  async voteRelayerSimple(dni: string, fingerprint: string, candidateId: number): Promise<string> {
    const r = await fetch(`${this.RELAYER_URL}/vote/${candidateId}`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ dni, fingerprint }) // <- sólo estos campos
    });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    return String(j.txHash);
  }

  async voteRelayer(candidateId: number, proof: Proof): Promise<{txHash: string}> {
    const r = await fetch(`${this.RELAYER_URL}/vote`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ candidateId, ...proof })
    });
    return r.json();
  }
  
  async syncRootFromRNP(): Promise<{root: string, txHash: string}> {
    const r = await fetch(`${this.RELAYER_URL}/admin/sync-root`, { method: 'POST' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  async listVotes(options?: { electionId?: number; start?: number; limit?: number }): Promise<{
    electionId: number;
    start: number;
    limit: number;
    total: number;
    items: OnChainVote[];
  }> {
    const q = new URLSearchParams();
    if (options?.electionId != null) q.set('electionId', String(options.electionId));
    if (options?.start != null) q.set('start', String(options.start));
    if (options?.limit != null) q.set('limit', String(options.limit));
    const url = q.toString() ? `${this.RELAYER_URL}/votes?${q}` : `${this.RELAYER_URL}/votes`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
  
  // Lista votos por candidato dentro de una elección
  async listVotesByCandidate(electionId: number, candidateId: number, start = 0, limit = 50): Promise<{
    electionId: number;
    candidateId: number;
    start: number;
    limit: number;
    total: number;
    items: OnChainVote[];
  }> {
    const q = new URLSearchParams({
      electionId: String(electionId),
      candidateId: String(candidateId),
      start: String(start),
      limit: String(limit),
    });
    const r = await fetch(`${this.RELAYER_URL}/votes/by-candidate?${q}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }

  // -------- Eventos --------
  onVote(cb: (electionId: number, candidateId: number, newTotal: number) => void) {
    this.events.on('VoteCast', (eId: any, candId: any, total: any) => {
      cb(eId.toNumber(), candId.toNumber(), total.toNumber());
    });
  }
  offVote() { this.events.removeAllListeners('VoteCast'); }
  removeAllListeners() { this.contractRead.removeAllListeners(); this.events?.removeAllListeners(); }

  setCenterAdmin(centerId: number, adminAddr: string, allowed: boolean) {}
  setCenterMesaRoot(centerId: number, mesaId: number, root: string) {}
  openCenter(centerId: number) {}
  closeCenter(centerId: number) {}
  calcRoot(centerId: number, mesaId: number) {
    return '';
  }
  registerCenter(centerId: number, name: string) {}
  startElection(newCandidates: string[], replaceCandidates: boolean) {}
  clearCandidates() {}
}
