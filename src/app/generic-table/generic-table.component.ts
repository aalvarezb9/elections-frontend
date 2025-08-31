// generic-table.component.ts
import { Component, OnInit, ViewChild, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'chip' | 'status' | 'date';
  sortable?: boolean;
  width?: string;
  chipColors?: { [key: string]: string }; // Para chips personalizados
}

export interface FilterOption {
  key: string;
  label: string;
  options: string[];
}

@Component({
  selector: 'app-generic-table',
  templateUrl: './generic-table.component.html',
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  styleUrls: ['./generic-table.component.css']
})
export class GenericTableComponent implements OnInit, OnChanges {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() filterOptions: FilterOption[] = [];
  @Input() pageSize: number = 10;
  @Input() pageSizeOptions: number[] = [5, 10, 20, 50];
  @Input() tableTitle: string = 'Tabla de Datos';
  @Input() searchPlaceholder: string = 'Buscar...';
  @Input() showSearch: boolean = true;
  @Input() showFilters: boolean = true;
  @Output() pageChange = new EventEmitter<PageEvent>();

  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<any>();
  
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  selectedFilters: { [key: string]: string } = {};

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns']) {
      this.displayedColumns = this.columns.map(col => col.key);
    }
    
    if (changes['data']) {
      this.dataSource.data = this.data;
    }

    if (changes['filterOptions']) {
      this.initializeFilters();
    }
  }

  ngOnInit(): void {
    this.displayedColumns = this.columns.map(col => col.key);
    this.dataSource.data = this.data;
    this.initializeFilters();
    
    // Configurar filtro personalizado
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const parsedFilter = JSON.parse(filter);
      
      // Filtro de texto
      if (parsedFilter.text) {
        const searchText = parsedFilter.text.toLowerCase();
        const matchesText = this.columns.some(col => {
          const value = data[col.key];
          return value && value.toString().toLowerCase().includes(searchText);
        });
        if (!matchesText) return false;
      }
      
      // Filtros por select
      for (const filterKey in parsedFilter.selects) {
        const filterValue = parsedFilter.selects[filterKey];
        if (filterValue !== 'Todos' && data[filterKey] !== filterValue) {
          return false;
        }
      }
      
      return true;
    };
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  // Inicializar filtros con "Todos"
  initializeFilters() {
    this.filterOptions.forEach(filter => {
      this.selectedFilters[filter.key] = 'Todos';
    });
  }

  // Aplicar filtros
  applyFilters() {
    const filters = {
      text: '',
      selects: { ...this.selectedFilters }
    };
    
    this.dataSource.filter = JSON.stringify(filters);
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Limpiar filtros
  clearFilters() {
    this.initializeFilters();
    this.applyFilters();
    
    // Limpiar también el campo de búsqueda
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
    }
  }

  // Filtro de búsqueda de texto
  applyTextFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    const filters = {
      text: filterValue.trim().toLowerCase(),
      selects: { ...this.selectedFilters }
    };
    
    this.dataSource.filter = JSON.stringify(filters);

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Obtener el valor formateado de una celda
  getCellValue(element: any, column: TableColumn): any {
    const value = element[column.key];
    
    switch (column.type) {
      case 'currency':
        return value;
      case 'number':
        return value;
      case 'date':
        return new Date(value);
      default:
        return value;
    }
  }

  // Obtener clase CSS para chips
  getChipClass(column: TableColumn, value: string): string {
    if (column.chipColors && column.chipColors[value]) {
      return column.chipColors[value];
    }
    
    // Clases por defecto
    if (column.type === 'status') {
      return value === 'Activo' ? 'status-active' : 'status-inactive';
    }
    
    return `chip-${value.toLowerCase().replace(/\s+/g, '-')}`;
  }

  // Obtener icono para status
  getStatusIcon(value: string): string {
    return value === 'Activo' ? 'check_circle' : 'cancel';
  }

  onPageChange(event: PageEvent) {
    this.pageChange.emit(event);
  }
}