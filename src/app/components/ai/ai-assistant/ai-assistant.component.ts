import { Component, OnDestroy, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { AiMode, InvoiceAiService } from '../../../services/invoice-ai.service';
import { getApiMessage } from '../../../shared/api-helpers';

interface AiEntry {
  question: string;
  mode: AiMode;
  answer: string;
  seconds: number;
  failed: boolean;
}

/** Pulls the readable answer out of whatever the API returned. */
function extractAnswer(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    // ApiResponse<{ answer }>, { answer }, { result } ...  ("message" is checked last
    // because ApiResponse.message is usually just "Success")
    for (const key of ['answer', 'data', 'result', 'response', 'message']) {
      if (key in obj && obj[key] !== null && obj[key] !== undefined) {
        return extractAnswer(obj[key]);
      }
    }
  }

  return JSON.stringify(value, null, 2);
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './ai-assistant.component.html',
  styleUrl: './ai-assistant.component.css',
})
export class AiAssistantComponent implements OnDestroy {
  private readonly ai = inject(InvoiceAiService);

  readonly mode = signal<AiMode>('single');
  readonly question = signal('');
  readonly isBusy = signal(false);
  readonly elapsed = signal(0);
  readonly history = signal<AiEntry[]>([]);

  private timer: ReturnType<typeof setInterval> | null = null;

  readonly samples: Record<AiMode, string[]> = {
    single: [
      'How many customers are there?',
      'How many active vendors are there?',
      'List the users from Chennai',
    ],
    multi: [
      'How many customers, vendors and users do we have?',
      'How many customers are in each state and how many vendors are active?',
      'Give me the active user count and the number of categories',
    ],
  };

  setMode(mode: AiMode): void {
    this.mode.set(mode);
  }

  useSample(text: string): void {
    this.question.set(text);
  }

  async send(): Promise<void> {
    const question = this.question().trim();

    if (!question || this.isBusy()) {
      return;
    }

    const mode = this.mode();

    this.isBusy.set(true);
    this.elapsed.set(0);
    const started = performance.now();
    this.timer = setInterval(() => this.elapsed.update((s) => s + 1), 1000);

    let entry: AiEntry;

    try {
      const response = await firstValueFrom(this.ai.ask(question, mode));

      entry = {
        question,
        mode,
        answer: extractAnswer(response),
        seconds: (performance.now() - started) / 1000,
        failed: false,
      };
    } catch (error) {
      entry = {
        question,
        mode,
        answer: getApiMessage(error, 'The AI service did not answer. Is Ollama running?'),
        seconds: (performance.now() - started) / 1000,
        failed: true,
      };
    } finally {
      this.stopTimer();
      this.isBusy.set(false);
    }

    this.history.update((list) => [entry, ...list]);
    this.question.set('');
  }

  clearHistory(): void {
    this.history.set([]);
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
