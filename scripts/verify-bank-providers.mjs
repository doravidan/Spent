#!/usr/bin/env node
import fs from "node:fs";
import { CompanyTypes, SCRAPERS, createScraper } from "israeli-bank-scrapers";

const expectedProviders = [
  "isracard",
  "cal",
  "max",
  "amex",
  "hapoalim",
  "leumi",
  "mizrahi",
  "discount",
  "mercantile",
  "beinleumi",
  "otsarHahayal",
  "union",
  "pagi",
  "yahav",
  "massad",
  "beyahadBishvilha",
  "behatsdaa",
  "oneZero",
];

const providerToCompanyType = {
  isracard: "isracard",
  cal: "visaCal",
  max: "max",
  amex: "amex",
  hapoalim: "hapoalim",
  leumi: "leumi",
  mizrahi: "mizrahi",
  discount: "discount",
  mercantile: "mercantile",
  beinleumi: "beinleumi",
  otsarHahayal: "otsarHahayal",
  union: "union",
  pagi: "pagi",
  yahav: "yahav",
  massad: "massad",
  beyahadBishvilha: "beyahadBishvilha",
  behatsdaa: "behatsdaa",
  oneZero: "oneZero",
};

const failures = [];
const typesSource = fs.readFileSync(new URL("../src/lib/types.ts", import.meta.url), "utf8");

function assertProviderField(provider, fieldKey, checks) {
  const providerBlock = typesSource.match(
    new RegExp(`id: "${provider}"[\\s\\S]*?credentialFields: \\[([\\s\\S]*?)\\n    \\],`)
  )?.[1];
  if (!providerBlock) {
    failures.push(`${provider}: missing UI provider block in src/lib/types.ts`);
    return;
  }
  const fieldBlock = providerBlock.match(
    new RegExp(`key: "${fieldKey}"[\\s\\S]*?\\n      \\}`)
  )?.[0];
  if (!fieldBlock) {
    failures.push(`${provider}.${fieldKey}: missing UI credential field`);
    return;
  }
  for (const [description, test] of Object.entries(checks)) {
    if (!test(fieldBlock)) failures.push(`${provider}.${fieldKey}: ${description}`);
  }
}

for (const provider of expectedProviders) {
  const companyTypeKey = providerToCompanyType[provider];
  const companyId = CompanyTypes[companyTypeKey];
  if (!companyId) {
    failures.push(`${provider}: missing CompanyTypes.${companyTypeKey}`);
    continue;
  }
  const scraperInfo = SCRAPERS[companyId];
  if (!scraperInfo) {
    failures.push(`${provider}: missing SCRAPERS.${companyId}`);
    continue;
  }
  if (!Array.isArray(scraperInfo.loginFields) || scraperInfo.loginFields.length === 0) {
    failures.push(`${provider}: no loginFields exported by israeli-bank-scrapers`);
    continue;
  }
  try {
    const scraper = createScraper({
      companyId,
      startDate: new Date("2026-01-01T00:00:00Z"),
      combineInstallments: false,
      showBrowser: false,
      verbose: false,
      timeout: 1000,
    });
    if (!scraper || typeof scraper.scrape !== "function") {
      failures.push(`${provider}: createScraper did not return a scraper with scrape()`);
    }
  } catch (error) {
    failures.push(
      `${provider}: createScraper threw ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

const packageProviders = Object.keys(SCRAPERS);
const unmapped = packageProviders.filter(
  (companyId) => !Object.values(providerToCompanyType).some((key) => CompanyTypes[key] === companyId)
);
if (unmapped.length > 0) {
  failures.push(`unmapped upstream scraper(s): ${unmapped.join(", ")}`);
}

for (const provider of ["discount", "mercantile"]) {
  assertProviderField(provider, "num", {
    "User Identification Code must be masked like a password": (field) =>
      field.includes('type: "password"'),
    "User Identification Code must accept non-numeric characters": (field) =>
      !field.includes("numeric: true"),
  });
}

if (failures.length > 0) {
  console.error("Bank provider verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Verified ${expectedProviders.length} bank/card providers against israeli-bank-scrapers (${expectedProviders.join(", ")}).`
);
