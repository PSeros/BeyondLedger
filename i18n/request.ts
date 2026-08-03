import {getRequestConfig} from "next-intl/server";
import {getLocale} from "@/features/settings/db/appSettings";

// next-intl request config (App Router, NO i18n routing — the active locale comes from the DB
// AppSettings singleton, not a URL segment or cookie). Runs per request on the server; the JSON
// catalog for the active locale is loaded here and shared with both Server Components
// (getTranslations/getFormatter) and Client Components (via NextIntlClientProvider).
//
// `formats` defines the named presets reused across the app so currency/date formatting is
// declared once. Locale codes ("en"/"de") drive both message selection AND Intl formatting.

export default getRequestConfig(async () => {
  const locale = await getLocale();

  return {
    locale,
    messages: (await import(`../locales/${locale}.json`)).default,
    formats: {
      number: {
        currency: {style: "currency", currency: "EUR"},
        currencyWhole: {style: "currency", currency: "EUR", maximumFractionDigits: 0},
        integer: {maximumFractionDigits: 0},
      },
      dateTime: {
        long: {year: "numeric", month: "long", day: "2-digit"},
        short: {year: "numeric", month: "2-digit", day: "2-digit"},
      },
    },
  };
});
