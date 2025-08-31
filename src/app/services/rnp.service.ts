import { Injectable } from '@angular/core';

export interface Proof {
  electionId: number;
  root: string;
  leaf: string;
  proof: string[];
}

@Injectable({
  providedIn: 'root'
})
export class RnpService {
  private readonly RNP_URL = 'http://localhost:4000';

  constructor() { }

  async getProof(dni: string, fingerprint: string): Promise<Proof> {
    const response = await fetch(`${this.RNP_URL}/proof`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ dni, fingerprint })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
}
