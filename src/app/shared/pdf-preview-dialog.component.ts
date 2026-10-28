import { Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface PdfPreviewData {
  title: string;
  blob: Blob;
  fileName: string;
  approveLabel?: string;   // when set, an action button is shown
}

@Component({
  selector: 'app-pdf-preview-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content class="pdf-content">
      <iframe #frame class="pdf-frame" [src]="safeUrl" title="PDF preview"></iframe>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="download()"><mat-icon>download</mat-icon> Download</button>
      <button mat-button (click)="print()"><mat-icon>print</mat-icon> Print</button>
      <button mat-button mat-dialog-close>Close</button>
      @if (data.approveLabel) {
        <button mat-flat-button [mat-dialog-close]="'approve'">{{ data.approveLabel }}</button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .pdf-content { padding: 0; min-width: min(900px, 85vw); }
    .pdf-frame { width: 100%; height: 70vh; border: 0; }
  `]
})
export class PdfPreviewDialogComponent implements OnDestroy {
  data = inject<PdfPreviewData>(MAT_DIALOG_DATA);
  private sanitizer = inject(DomSanitizer);
  private objectUrl = URL.createObjectURL(this.data.blob);
  safeUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
  private frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');

  download() {
    const a = document.createElement('a');
    a.href = this.objectUrl;
    a.download = this.data.fileName;
    a.click();
  }

  print() {
    this.frame()?.nativeElement.contentWindow?.print();
  }

  ngOnDestroy() {
    URL.revokeObjectURL(this.objectUrl);
  }
}