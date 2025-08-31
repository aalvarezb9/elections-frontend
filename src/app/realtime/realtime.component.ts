import { Component, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Web3Service, Candidate } from '../services/web3.service';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';

import ApexCharts from 'apexcharts';
import type { ApexOptions } from 'apexcharts';

type ViewKind = 'list' | 'bar' | 'hbar' | 'pie' | 'donut' | 'line';

@Component({
  selector: 'app-realtime',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatCardModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './realtime.component.html'
})
export class RealtimeComponent implements OnInit, OnDestroy {
  electionId = 0;
  candidates: Candidate[] = [];
  images: Record<number, string> = {};
  total = 0;

  view: ViewKind = 'bar';
  chartTitle = 'Barras';

  @ViewChild('chartEl') chartEl?: ElementRef<HTMLDivElement>;
  private chart?: ApexCharts;

  constructor(private web3: Web3Service) {}

  async ngOnInit() {
    await this.loadInitial();
    this.web3.onVote((_eId, candId, newTotal) => {
      const c = this.candidates.find(x => x.id === candId);
      if (c) c.voteCount = newTotal;
      this.computeTotal();
      this.updateChart();
    });
  }

  ngOnDestroy() {
    this.web3.offVote();
    this.chart?.destroy();
  }

  private async loadInitial() {
    this.electionId = await this.web3.currentElectionId();
    this.candidates = await this.web3.getAllCandidates();
    this.images = await this.web3.getCandidateMeta(this.electionId || 0);
    this.computeTotal();
    this.updateChart(true);
  }

  computeTotal() {
    this.total = this.candidates.reduce((s, c) => s + (c.voteCount || 0), 0);
  }
  pct(c: Candidate) { return this.total ? ((c.voteCount || 0) * 100) / this.total : 0; }
  imgFor(c: Candidate) { return this.images[c.id] || 'assets/placeholder.png'; }
  trackById = (_: number, c: Candidate) => c.id;

  setView(v: ViewKind) {
    this.view = v;
    this.chartTitle =
      v === 'list'  ? 'Lista' :
      v === 'bar'   ? 'Barras' :
      v === 'hbar'  ? 'Barras horizontales' :
      v === 'pie'   ? 'Pastel' :
      v === 'donut' ? 'Dona' : 'Líneas';
    this.updateChart(true);
  }

  private buildOptions(): ApexOptions {
    const labels = this.candidates.map(c => c.name);
    const votes  = this.candidates.map(c => c.voteCount || 0);
    const total  = this.total || votes.reduce((a, b) => a + b, 0);
  
    const yFormatter = (val: number) => {
      const pct = total ? ((val * 100) / total).toFixed(1) : '0.0';
      return `${val} votos (${pct}%)`;
    };
  
    // Pastel / dona
    if (this.view === 'pie' || this.view === 'donut') {
      return {
        chart: { type: this.view, height: 420, toolbar: { show: false } },
        series: votes,
        labels,
        legend: { position: 'bottom' },
        dataLabels: {
          enabled: true,
          formatter: (_: any, opts: any) =>
            `${opts.w.globals.seriesPercent[opts.seriesIndex][0].toFixed(1)}%`
        },
        tooltip: { y: { formatter: yFormatter } },
        plotOptions: this.view === 'donut' ? { pie: { donut: { size: '65%' } } } : undefined
      };
    }
  
    // Línea
    if (this.view === 'line') {
      return {
        chart: { type: 'line', height: 420, toolbar: { show: false } },
        series: [{ name: 'Votos', data: votes }],
        xaxis: { categories: labels },
        stroke: { width: 3, curve: 'smooth' },
        dataLabels: { enabled: false },
        yaxis: { labels: { formatter: (v) => String(Math.floor(v)) } },
        tooltip: { y: { formatter: yFormatter } }
      };
    }
  
    // Barras (vertical u horizontal)
    const isH = this.view === 'hbar';
    return {
      chart: { type: 'bar', height: 420, toolbar: { show: false } },
      series: [{ name: 'Votos', data: votes }],
      // SIEMPRE usa xaxis.categories (también para horizontal)
      xaxis: { categories: labels },
      yaxis: { labels: { formatter: (v) => String(Math.floor(v)) } },
      plotOptions: { bar: { horizontal: isH, borderRadius: 6, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: yFormatter } }
    };
  }
  

  private async updateChart(recreate = false) {
    if (this.view === 'list') {
      // si está en lista, oculta/destruye el gráfico para liberar memoria
      if (this.chart) { this.chart.destroy(); this.chart = undefined; }
      return;
    }
    const opts = this.buildOptions();

    if (recreate || !this.chart) {
      if (!this.chartEl) return;
      // destruir instancia previa si existiera
      this.chart?.destroy();
      this.chart = new ApexCharts(this.chartEl.nativeElement, opts);
      await this.chart.render();
    } else {
      await this.chart.updateOptions(opts as ApexCharts.ApexOptions, true, true);
    }
  }
}
