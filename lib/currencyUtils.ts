// Утилита для определения валюты по стране
// Использует ISO 3166-1 alpha-2 коды стран

const countryToCurrency: Record<string, string> = {
  // Европа
  RU: 'RUB', // Россия
  UA: 'UAH', // Украина
  BY: 'BYN', // Беларусь
  KZ: 'KZT', // Казахстан
  US: 'USD', // США
  GB: 'GBP', // Великобритания
  DE: 'EUR', // Германия
  FR: 'EUR', // Франция
  IT: 'EUR', // Италия
  ES: 'EUR', // Испания
  NL: 'EUR', // Нидерланды
  BE: 'EUR', // Бельгия
  AT: 'EUR', // Австрия
  CH: 'CHF', // Швейцария
  PL: 'PLN', // Польша
  CZ: 'CZK', // Чехия
  SE: 'SEK', // Швеция
  NO: 'NOK', // Норвегия
  DK: 'DKK', // Дания
  FI: 'EUR', // Финляндия
  GR: 'EUR', // Греция
  PT: 'EUR', // Португалия
  IE: 'EUR', // Ирландия
  // Азия
  CN: 'CNY', // Китай
  JP: 'JPY', // Япония
  KR: 'KRW', // Южная Корея
  IN: 'INR', // Индия
  ID: 'IDR', // Индонезия
  TH: 'THB', // Таиланд
  VN: 'VND', // Вьетнам
  PH: 'PHP', // Филиппины
  MY: 'MYR', // Малайзия
  SG: 'SGD', // Сингапур
  HK: 'HKD', // Гонконг
  TW: 'TWD', // Тайвань
  AE: 'AED', // ОАЭ
  SA: 'SAR', // Саудовская Аравия
  IL: 'ILS', // Израиль
  TR: 'TRY', // Турция
  // Америка
  CA: 'CAD', // Канада
  MX: 'MXN', // Мексика
  BR: 'BRL', // Бразилия
  AR: 'ARS', // Аргентина
  CL: 'CLP', // Чили
  CO: 'COP', // Колумбия
  PE: 'PEN', // Перу
  // Африка
  ZA: 'ZAR', // ЮАР
  EG: 'EGP', // Египет
  NG: 'NGN', // Нигерия
  KE: 'KES', // Кения
  // Океания
  AU: 'AUD', // Австралия
  NZ: 'NZD', // Новая Зеландия
};

/**
 * Определяет валюту по коду страны (ISO 3166-1 alpha-2)
 * @param countryCode - код страны (например, 'RU', 'US', 'DE')
 * @returns код валюты (например, 'RUB', 'USD', 'EUR') или 'USD' по умолчанию
 */
export function getCurrencyByCountry(countryCode: string | null | undefined): string {
  if (!countryCode) {
    return 'USD'; // Валюта по умолчанию
  }

  const upperCode = countryCode.toUpperCase();
  return countryToCurrency[upperCode] || 'USD';
}

/**
 * Получает название валюты по коду
 * @param currencyCode - код валюты (например, 'USD', 'RUB', 'EUR')
 * @returns название валюты
 */
export function getCurrencyName(currencyCode: string): string {
  const currencyNames: Record<string, string> = {
    USD: 'Доллар США',
    EUR: 'Евро',
    RUB: 'Российский рубль',
    UAH: 'Украинская гривна',
    BYN: 'Белорусский рубль',
    KZT: 'Казахстанский тенге',
    GBP: 'Фунт стерлингов',
    CHF: 'Швейцарский франк',
    PLN: 'Польский злотый',
    CZK: 'Чешская крона',
    SEK: 'Шведская крона',
    NOK: 'Норвежская крона',
    DKK: 'Датская крона',
    CNY: 'Китайский юань',
    JPY: 'Японская иена',
    KRW: 'Южнокорейская вона',
    INR: 'Индийская рупия',
    CAD: 'Канадский доллар',
    AUD: 'Австралийский доллар',
    NZD: 'Новозеландский доллар',
  };

  return currencyNames[currencyCode] || currencyCode;
}

/**
 * Форматирует сумму с учётом валюты
 * @param amount - сумма
 * @param currencyCode - код валюты
 * @returns отформатированная строка
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    RUB: '₽',
    UAH: '₴',
    BYN: 'Br',
    KZT: '₸',
    GBP: '£',
    CHF: 'CHF',
    PLN: 'zł',
    CZK: 'Kč',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    CNY: '¥',
    JPY: '¥',
    KRW: '₩',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$',
    NZD: 'NZ$',
  };

  const symbol = symbols[currencyCode] || currencyCode;
  const formattedAmount = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // Для некоторых валют символ ставится после суммы
  if (['RUB', 'UAH', 'BYN', 'KZT', 'PLN', 'CZK', 'SEK', 'NOK', 'DKK', 'KRW', 'INR'].includes(currencyCode)) {
    return `${formattedAmount} ${symbol}`;
  }

  return `${symbol}${formattedAmount}`;
}
