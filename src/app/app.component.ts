import { Component, OnInit } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';
import {
  ModuleRegistry,
  EnterpriseCoreModule,
  RowGroupingModule,
  RangeSelectionModule,
  ClipboardModule,
  ExcelExportModule,
  SideBarModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  SetFilterModule,
  MenuModule,
  RichSelectModule,
} from 'ag-grid-enterprise';
import { UrlContextService } from './core/services/url-context.service';

ModuleRegistry.registerModules([
  EnterpriseCoreModule,
  RowGroupingModule,
  RangeSelectionModule,
  ClipboardModule,
  ExcelExportModule,
  SideBarModule,
  ColumnsToolPanelModule,
  FiltersToolPanelModule,
  SetFilterModule,
  MenuModule,
  RichSelectModule,
]);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent implements OnInit {
  constructor(private ctx: UrlContextService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => this.ctx.captureFromUrl(params));
  }
}
