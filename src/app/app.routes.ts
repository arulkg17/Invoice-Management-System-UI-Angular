import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },

  // Public registration and password recovery routes
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  // Masters
  {
    path: 'masters',
    canActivate: [authGuard],
    children: [
      // Categories
      {
        path: 'categories',
        loadComponent: () =>
          import('./components/category/category-list/category-list.component').then(
            (m) => m.CategoryListComponent,
          ),
      },
      {
        path: 'categories/create',
        loadComponent: () =>
          import('./components/category/category-form/category-form.component').then(
            (m) => m.CategoryFormComponent,
          ),
      },
      {
        path: 'categories/edit/:id',
        loadComponent: () =>
          import('./components/category/category-form/category-form.component').then(
            (m) => m.CategoryFormComponent,
          ),
      },
      // Itemmasters
      {
        path: 'items',
        loadComponent: () =>
          import('./components/item-list/item-list.component').then(
            (m) => m.ItemListComponent,
          ),
      },
      {
        path: 'items/create',
        loadComponent: () =>
          import('./components/item-form/item-form.component').then(
            (m) => m.ItemFormComponent,
          ),
      },
      {
        path: 'items/edit/:id',
        loadComponent: () =>
          import('./components/item-form/item-form.component').then(
            (m) => m.ItemFormComponent,
          ),
      },

      // Customers
      {
        path: 'customers',
        loadComponent: () =>
          import('./components/customer/customer-list/customer-list.component').then(
            (m) => m.CustomerListComponent,
          ),
      },
      {
        path: 'customers/create',
        loadComponent: () =>
          import('./components/customer/customer-form/customer-form.component').then(
            (m) => m.CustomerFormComponent,
          ),
      },
      {
        path: 'customers/edit/:id',
        loadComponent: () =>
          import('./components/customer/customer-form/customer-form.component').then(
            (m) => m.CustomerFormComponent,
          ),
      },

      // Vendors
      {
        path: 'vendors',
        loadComponent: () =>
          import('./components/vendor/vendor-list/vendor-list.component').then(
            (m) => m.VendorListComponent,
          ),
      },
      {
        path: 'vendors/create',
        loadComponent: () =>
          import('./components/vendor/vendor-form/vendor-form.component').then(
            (m) => m.VendorFormComponent,
          ),
      },
      {
        path: 'vendors/edit/:id',
        loadComponent: () =>
          import('./components/vendor/vendor-form/vendor-form.component').then(
            (m) => m.VendorFormComponent,
          ),
      },

      // Users
      {
        path: 'users',
        loadComponent: () =>
          import('./components/user/user-list/user-list.component').then(
            (m) => m.UserListComponent,
          ),
      },
      {
        path: 'users/create',
        loadComponent: () =>
          import('./components/user/user-form/user-form.component').then(
            (m) => m.UserFormComponent,
          ),
      },
      {
        path: 'users/edit/:id',
        loadComponent: () =>
          import('./components/user/user-form/user-form.component').then(
            (m) => m.UserFormComponent,
          ),
      },
    ],
  },

  // Transactions
  {
    path: 'transactions',
    canActivate: [authGuard],
    children: [
      {
        path: 'indent',
        loadComponent: () =>
          import('./components/item-list/item-list.component').then(
            (m) => m.ItemListComponent,
          ),
      },
      // Purchase Order
      {
        path: 'po',
        loadComponent: () =>
          import('./components/purchase-order/po-list/po-list.component').then(
            (m) => m.PoListComponent,
          ),
      },
      {
        path: 'po/create',
        loadComponent: () =>
          import('./components/purchase-order/po-form/po-form.component').then(
            (m) => m.PoFormComponent,
          ),
      },
      {
        path: 'po/edit/:id',
        loadComponent: () =>
          import('./components/purchase-order/po-form/po-form.component').then(
            (m) => m.PoFormComponent,
          ),
      },
      {
        path: 'inward',
        loadComponent: () =>
          import('./components/item-list/item-list.component').then(
            (m) => m.ItemListComponent,
          ),
      },
      // Receipt (goods receipt against a purchase order)
      {
        path: 'receipt',
        loadComponent: () =>
          import('./components/receipt/receipt-list/receipt-list.component').then(
            (m) => m.ReceiptListComponent,
          ),
      },
      {
        path: 'receipt/create',
        loadComponent: () =>
          import('./components/receipt/receipt-form/receipt-form.component').then(
            (m) => m.ReceiptFormComponent,
          ),
      },
      {
        path: 'receipt/edit/:id',
        loadComponent: () =>
          import('./components/receipt/receipt-form/receipt-form.component').then(
            (m) => m.ReceiptFormComponent,
          ),
      },

      // Sales Invoice
      {
        path: 'sales-invoice',
        loadComponent: () =>
          import('./components/sales-invoice/si-list/si-list.component').then(
            (m) => m.SiListComponent,
          ),
      },
      {
        path: 'sales-invoice/create',
        loadComponent: () =>
          import('./components/sales-invoice/si-form/si-form.component').then(
            (m) => m.SiFormComponent,
          ),
      },
      {
        path: 'sales-invoice/edit/:id',
        loadComponent: () =>
          import('./components/sales-invoice/si-form/si-form.component').then(
            (m) => m.SiFormComponent,
          ),
      },

      // Stock (read only)
      {
        path: 'stock',
        loadComponent: () =>
          import('./components/stock/stock-list.component').then(
            (m) => m.StockListComponent,
          ),
      },
    ],
  },

  // Utilities
  {
    path: 'utilities',
    canActivate: [authGuard],
    children: [
      {
        path: 'ai-assistant',
        loadComponent: () =>
          import('./components/ai/ai-assistant/ai-assistant.component').then(
            (m) => m.AiAssistantComponent,
          ),
      },
    ],
  },

  {
    path: 'exit',
    canActivate: [authGuard],
    children: [
      {
        path: 'logout',
        loadComponent: () =>
          import('./pages/logout/logout.component').then(
            (m) => m.LogoutComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
