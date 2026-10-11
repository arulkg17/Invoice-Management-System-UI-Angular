import { Routes } from "@angular/router";
import { authGuard } from "./guards/auth.guard";

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },

  // Masters
  {
    path: 'masters',
    canActivate: [authGuard],
    children: [
      { path: 'categories', loadComponent: () => import('./components/item-list/item-list.component').then(m => m.ItemListComponent) },
      { path: 'items', loadComponent: () => import('./components/item-list/item-list.component').then(m => m.ItemListComponent) },
      { path: 'items/create', loadComponent: () => import('./components/item-form/item-form.component').then(m => m.ItemFormComponent) },
      { path: 'items/edit/:id', loadComponent: () => import('./components/item-form/item-form.component').then(m => m.ItemFormComponent) },
      { path: 'customers', loadComponent: () => import('./components/customer/customer-list.component').then(m => m.CustomerListComponent)},
      { path: 'vendors', loadComponent: () => import('./components/item-list/item-list.component').then(m => m.ItemListComponent) }
    ]
  },

  // Transactions
  {
    path: 'transactions',
    canActivate:[authGuard],
    children: [
      { path: 'indent', loadComponent: () => import('./components/item-list/item-list.component').then(m => m.ItemListComponent) },
      // Purchase Order 
      { path: 'po', loadComponent: () => import('./components/purchase-order/po-list/po-list.component').then(m => m.PoListComponent) },
      { path: 'po/create', loadComponent: () => import('./components/purchase-order/po-form/po-form.component').then(m => m.PoFormComponent) },
      { path: 'po/edit/:id', loadComponent: () => import('./components/purchase-order/po-form/po-form.component').then(m => m.PoFormComponent) },
      { path: 'inward', loadComponent: () => import('./components/item-list/item-list.component').then(m => m.ItemListComponent) },
      // Receipt (goods receipt against a purchase order)
      { path: 'receipt', loadComponent: () => import('./components/receipt/receipt-list/receipt-list.component').then(m => m.ReceiptListComponent) },
      { path: 'receipt/create', loadComponent: () => import('./components/receipt/receipt-form/receipt-form.component').then(m => m.ReceiptFormComponent) },
      { path: 'receipt/edit/:id', loadComponent: () => import('./components/receipt/receipt-form/receipt-form.component').then(m => m.ReceiptFormComponent) },

      // Sales Invoice
      { path: 'sales-invoice', loadComponent: () => import('./components/sales-invoice/si-list/si-list.component').then(m => m.SiListComponent) },
      { path: 'sales-invoice/create', loadComponent: () => import('./components/sales-invoice/si-form/si-form.component').then(m => m.SiFormComponent) },
      { path: 'sales-invoice/edit/:id', loadComponent: () => import('./components/sales-invoice/si-form/si-form.component').then(m => m.SiFormComponent) },

      // Stock (read only)
      { path: 'stock', loadComponent: () => import('./components/stock/stock-list.component').then(m => m.StockListComponent) }
    ]
  },
  {
    path: 'exit',
    canActivate:[authGuard],
    children:[
      { path:'logout', loadComponent:() => import('./pages/logout/logout.component').then(m=>m.LogoutComponent)}
    ]
  },
  { path: '**', redirectTo: 'home' }
];
