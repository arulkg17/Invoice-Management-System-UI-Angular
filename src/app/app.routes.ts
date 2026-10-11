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
      { path: 'customers', loadComponent: () => import('./components/item-list/item-list.component').then(m => m.ItemListComponent) },
      { path: 'vendors', loadComponent: () => import('./components/item-list/item-list.component').then(m => m.ItemListComponent) }
    ]
  },

  // Transactions
  {
    path: 'transactions',
    canActivate:[authGuard],
    children: [
      { path: 'indent', loadComponent: () => import('./components/item-list/item-list.component').then(m => m.ItemListComponent) },
      { path: 'po', loadComponent: () => import('./components/purchase-order/po-list/po-list.component').then(m => m.PoListComponent) },
      { path: 'po/create', loadComponent: () => import('./components/purchase-order/po-form/po-form.component').then(m => m.PoFormComponent) },
      { path: 'po/edit/:id', loadComponent: () => import('./components/purchase-order/po-form/po-form.component').then(m => m.PoFormComponent) },
      { path: 'inward', loadComponent: () => import('./components/item-list/item-list.component').then(m => m.ItemListComponent) },
      { path: 'receipt', loadComponent: () => import('./components/item-list/item-list.component').then(m => m.ItemListComponent) }
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
