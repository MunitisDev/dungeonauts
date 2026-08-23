import type { Locale } from '../../../i18n/locales'
import { ES_BANK } from './es'
import { EN_BANK } from './en'
import type { LocaleBank } from './types'

const BANKS: Readonly<Record<Locale, LocaleBank>> = { es: ES_BANK, en: EN_BANK }

export function bankFor(locale: Locale): LocaleBank {
  return BANKS[locale]
}

export * from './types'
