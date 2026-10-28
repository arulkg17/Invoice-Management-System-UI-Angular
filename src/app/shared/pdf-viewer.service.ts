import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, catchError, of, switchMap } from 'rxjs';
import { PdfDocType, PdfService } from './pdf.service';
import { PdfPreviewDialogComponent } from './pdf-preview-dialog.component';

@Injectable({ providedIn: 'root' })
export class PdfViewerService {
  private pdf = inject(PdfService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  preview(type: PdfDocType, id: number, title: string, approveLabel?: string)
      : Observable<'approve' | undefined> {
    return this.pdf.getPdf(type, id).pipe(
      switchMap(blob =>
        this.dialog.open(PdfPreviewDialogComponent, {
          data: { title, blob, fileName: `${type}-${id}.pdf`, approveLabel },
          width: 'min(960px, 95vw)',
          maxWidth: '95vw'
        }).afterClosed()),
      catchError(() => {
        this.snack.open('Unable to load the PDF. Please try again.', 'Close', { duration: 4000 });
        return of(undefined);
      })
    );
  }
}