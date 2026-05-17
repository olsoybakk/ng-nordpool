import { computed, Injectable, signal } from '@angular/core';
import { Lang, translations, Translations } from '../i18n/translations';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly _lang = signal<Lang>((localStorage.getItem('lang') as Lang | null) ?? 'nb');

  readonly lang = this._lang.asReadonly();
  readonly t = computed<Translations>(() => translations[this._lang()]);

  setLang(lang: Lang): void {
    this._lang.set(lang);
    localStorage.setItem('lang', lang);
  }

  toggleLang(): void {
    this.setLang(this._lang() === 'en' ? 'nb' : 'en');
  }
}
