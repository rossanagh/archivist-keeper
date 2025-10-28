import { z } from 'zod';

// Authentication validation
export const authSchema = z.object({
  username: z.string()
    .min(3, 'Username-ul trebuie să aibă cel puțin 3 caractere')
    .max(50, 'Username-ul trebuie să aibă maxim 50 de caractere')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username-ul poate conține doar litere, cifre, cratimă și underscore'),
  password: z.string()
    .min(6, 'Parola trebuie să aibă cel puțin 6 caractere')
    .max(100, 'Parola trebuie să aibă maxim 100 de caractere')
});

// Fond validation
export const fondSchema = z.object({
  nume: z.string()
    .min(1, 'Numele fondului este obligatoriu')
    .max(200, 'Numele fondului trebuie să aibă maxim 200 de caractere')
});

// Compartiment validation
export const compartimentSchema = z.object({
  nume: z.string()
    .min(1, 'Numele compartimentului este obligatoriu')
    .max(200, 'Numele compartimentului trebuie să aibă maxim 200 de caractere')
});

// Inventar validation schema
export const inventarSchema = z.object({
  an: z.number()
    .min(1900, "Anul trebuie să fie mai mare decât 1900")
    .max(new Date().getFullYear() + 10, "Anul nu poate fi mai mare cu 10 ani decât anul curent"),
  termen_pastrare: z.union([
    z.string().refine((val) => val.toLowerCase() === 'permanent', {
      message: "Trebuie să fie 'permanent' sau un număr"
    }),
    z.string().regex(/^\d+$/, "Trebuie să fie un număr valid").transform(Number)
      .refine((val) => val >= 1 && val <= 999, {
        message: "Termenul de păstrare trebuie să fie între 1 și 999 ani"
      })
  ])
});

// Dosar validation
export const dosarSchema = z.object({
  nr_crt: z.number()
    .int('Numărul curent trebuie să fie un număr întreg')
    .positive('Numărul curent trebuie să fie pozitiv')
    .max(999999, 'Numărul curent este prea mare'),
  indicativ_nomenclator: z.string()
    .min(1, 'Indicativul nomenclator este obligatoriu')
    .max(100, 'Indicativul nomenclator trebuie să aibă maxim 100 de caractere'),
  continut: z.string()
    .min(1, 'Conținutul este obligatoriu')
    .max(1000, 'Conținutul trebuie să aibă maxim 1000 de caractere'),
  date_extreme: z.string()
    .min(1, 'Datele extreme sunt obligatorii')
    .max(100, 'Datele extreme trebuie să aibă maxim 100 de caractere'),
  numar_file: z.number()
    .int('Numărul de file trebuie să fie un număr întreg')
    .positive('Numărul de file trebuie să fie pozitiv')
    .max(999999, 'Numărul de file este prea mare'),
  observatii: z.string()
    .max(500, 'Observațiile trebuie să aibă maxim 500 de caractere')
    .optional(),
  nr_cutie: z.number()
    .int('Numărul cutiei trebuie să fie un număr întreg')
    .positive('Numărul cutiei trebuie să fie pozitiv')
    .max(9999, 'Numărul cutiei este prea mare')
    .optional()
    .nullable()
});
