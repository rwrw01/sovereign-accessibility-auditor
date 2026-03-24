import type { FindingNarrative } from "./types.js";

/** WCAG 2.2 narratives for criteria 2.5.x, 3.x and 4.x. */
export const NARRATIVES_3X4X: Record<string, FindingNarrative> = {
  "2.5.7": {
    watFout:
      "Functionaliteit die slepen vereist (drag-and-drop, sliders, kaartinteracties) " +
      "heeft geen alternatieve bediening via een enkel aanraakpunt of een toetsenbordmechanisme.",
    impactBlind:
      "Blinde bezoekers kunnen drag-and-drop niet gebruiken. Als er geen toetsenbord-alternatief is, " +
      "is de functionaliteit volledig onbereikbaar.",
    impactDoof:
      "Gebruikers met tremoren of verminderde motoriek kunnen sleepgebaren niet nauwkeurig uitvoeren. " +
      "Zonder alternatief zijn ze buitengesloten.",
    oplossing:
      "Implementeer een toetsenbord-alternatief voor alle drag-and-drop functionaliteit " +
      "(bijv. knoppen 'omhoog/omlaag' of een selecteer-dan-klik-aanpak). " +
      "Gebruik de Drag-and-Drop ARIA-patroonspecificatie als richtlijn.",
  },

  "2.5.8": {
    watFout:
      "Aanraakdoelen (knoppen, links, formuliervelden) zijn kleiner dan 24×24 CSS-pixels " +
      "en hebben geen voldoende tussenruimte tot aangrenzende doelen. " +
      "Dit maakt accurate aanraking op touchscreens moeilijk.",
    impactBlind:
      "Slechtziende gebruikers die inzoomen op het scherm tappen op grotere schaalvergroting — " +
      "maar kleine doelen zijn bij terugschalingsfouten nog steeds problematisch.",
    impactDoof:
      "Gebruikers met tremoren of verminderde motorische controle missen kleine doelen vaak " +
      "en activeren per ongeluk een naastgelegen element.",
    oplossing:
      "Vergroot aanraakdoelen naar minimaal 24×24 CSS-pixels (bij voorkeur 44×44 per APCA-aanbeveling). " +
      "Gebruik padding in plaats van een grotere letter om de klikbare ruimte te vergroten " +
      "zonder de visuele grootte te wijzigen.",
  },

  "3.1.1": {
    watFout:
      "De taal van de pagina is niet of onjuist opgegeven in het lang-attribuut van het html-element. " +
      "Screenreaders kunnen hierdoor een verkeerde taal kiezen voor uitspraak.",
    impactBlind:
      "Een screenreader die Nederlandse tekst in het Engels uitspreekt, produceert volledig onverstaanbare audio. " +
      "De inhoud van de pagina wordt daardoor onbegrijpelijk voor blinde bezoekers.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Voeg lang=\"nl\" toe aan het html-element voor Nederlandstalige pagina's. " +
      "Gebruik lang-attributen op specifieke elementen wanneer de taal van een fragment afwijkt.",
  },

  "3.2.1": {
    watFout:
      "Een component verandert de context wanneer het de toetsenbordfocus ontvangt — " +
      "bijvoorbeeld een automatisch subkeuzemenu dat opent, een formulier dat indient, of een pagina die navigeert.",
    impactBlind:
      "Een blinde bezoeker die via Tab navigeert, wordt onverwacht naar een andere pagina of context gebracht. " +
      "De oriëntatie gaat volledig verloren en het navigeren van de pagina moet opnieuw beginnen.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Zorg dat het ontvangen van focus geen contextwisseling veroorzaakt. " +
      "Dropdown-menu's mogen openen bij focus maar mogen pas navigeren na een expliciete gebruikersactie (Enter, klik).",
  },

  "3.2.2": {
    watFout:
      "Een formulierveld of besturingselement veroorzaakt een automatische actie zodra de waarde wijzigt " +
      "— zonder dat de gebruiker dit initieert (bijv. automatisch doorbladeren bij selectie van een optie).",
    impactBlind:
      "Een blinde bezoeker die met de screenreader door een keuzelijst navigeert, " +
      "triggert onbedoeld een pagina-actie bij elke pijltoets. " +
      "De pagina gedraagt zich onvoorspelbaar en het is onduidelijk wat er is veranderd.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Vereist altijd een expliciete gebruikersactie (knop, Enter) om een formulieractie te starten. " +
      "Gebruik geen onChange-handlers die direct contextwisseling veroorzaken — gebruik een verzendknop.",
  },

  "3.2.3": {
    watFout:
      "De navigatie verschijnt op verschillende pagina's in een andere volgorde of met andere labels, " +
      "terwijl de functie gelijk blijft. Dit verbreekt de voorspelbaarheid van de interface.",
    impactBlind:
      "Blinde bezoekers onthouden de navigatiestructuur en springen via sneltoetsen door de koppenlijst. " +
      "Inconsistente navigatie maakt dit patroon onbruikbaar — elke pagina vereist opnieuw volledige exploratie.",
    impactDoof: "Cognitieve belasting neemt toe voor alle gebruikers, inclusief dove bezoekers met cognitieve beperkingen.",
    oplossing:
      "Gebruik een gedeelde navigatiecomponent die op alle pagina's identiek wordt gerenderd. " +
      "Zorg dat de volgorde en labels van navigatiepunten consistent zijn door de gehele website.",
  },

  "3.2.4": {
    watFout:
      "Componenten met dezelfde functie worden op verschillende plaatsen in de website " +
      "anders benoemd of anders weergegeven. Bijv. een 'Zoeken'-knop die elders 'Vinden' heet.",
    impactBlind:
      "Blinde bezoekers leren de interface door interactie. " +
      "Inconsistente identificatie maakt het onmogelijk een consistent mentaal model te vormen — " +
      "elke pagina voelt als een nieuwe onbekende omgeving.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Gebruik een design system met vaste componentnamen en labels. " +
      "Zorg dat hetzelfde element altijd dezelfde toegankelijke naam heeft, ook als de visuele tekst afwijkt.",
  },

  "3.3.1": {
    watFout:
      "Formuliervalidatiefouten worden niet of onvoldoende gecommuniceerd. " +
      "Als een veld onjuist is ingevuld, is de fout alleen visueel zichtbaar (rode rand) " +
      "zonder een tekstuele beschrijving van wat er mis is.",
    impactBlind:
      "Een blinde bezoeker die een formulier indient, hoort alleen 'formulier ongeldig' of niets. " +
      "Ze weten niet welk veld fout is, wat er fout is, of hoe ze het kunnen corrigeren. " +
      "Het formulier invullen wordt een trial-and-error-proces.",
    impactDoof: "Geen directe impact; foutmeldingen zijn visueel zichtbaar.",
    oplossing:
      "Wijs elke foutmelding tekstueel toe aan het bijbehorende veld via aria-describedby. " +
      "Gebruik aria-invalid=\"true\" op het foutieve veld. " +
      "Verplaats de focus na indienen naar de eerste fout of naar een samenvatting van alle fouten.",
  },

  "3.3.3": {
    watFout:
      "Formulierfouten worden wel gedetecteerd en gemeld, maar de foutmelding geeft geen concrete suggestie " +
      "voor correctie — bijv. 'Ongeldig e-mailadres' zonder te melden dat het @-teken ontbreekt.",
    impactBlind:
      "Blinde bezoekers kunnen een formulierveld niet visueel inspecteren om zelf de fout te identificeren. " +
      "Ze zijn volledig afhankelijk van de foutmelding. Vaag foutmelden dwingt tot herhaald proberen.",
    impactDoof: "Geen directe impact, maar concrete foutmeldingen helpen alle gebruikers.",
    oplossing:
      "Beschrijf in de foutmelding precies wat er mis is en hoe het gecorrigeerd kan worden. " +
      "Gebruik formaten zoals 'Vul een geldig e-mailadres in, bijvoorbeeld naam@voorbeeld.nl'. " +
      "Genereer suggesties programmatisch vanuit de validatieregel.",
  },

  "3.3.4": {
    watFout:
      "Formulieren met juridische of financiële consequenties kunnen niet worden gecontroleerd, " +
      "gecorrigeerd of teruggedraaid na verzending. Er is geen bevestigingsstap of herstelmogelijkheid.",
    impactBlind:
      "Een blinde bezoeker die per ongeluk een formulier verstuurt dat niet herzien kan worden, " +
      "heeft geen mogelijkheid de situatie te corrigeren. " +
      "De kans op vergissingen is groter door de niet-lineaire navigatie via screenreader.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Voeg een bevestigingsstap toe vóór definitieve verzending van belangrijke formulieren. " +
      "Bied een annulerings- of aanpassingsmogelijkheid aan tot het moment van definitieve verwerking. " +
      "Stuur een bevestigingse-mail met een correctielink waar van toepassing.",
  },

  "4.1.2": {
    watFout:
      "Interactieve elementen (knoppen, links, formuliervelden, custom widgets) missen een toegankelijke naam, " +
      "rol of status. Screenreaders kunnen niet melden wat het element doet of in welke staat het verkeert.",
    impactBlind:
      "Een blinde bezoeker hoort 'knop' of 'link' zonder verdere context. " +
      "Navigeren wordt een raadspel — elk element moet worden geactiveerd om de functie te ontdekken. " +
      "Statuswijzigingen (uitgeklapt, aangevinkt, geselecteerd) zijn onzichtbaar voor de screenreader.",
    impactDoof:
      "Geen directe impact, tenzij de bezoeker spraakbediening gebruikt — " +
      "dan zijn elementen zonder naam niet bij naam aan te roepen.",
    oplossing:
      "Voeg een aria-label of zichtbaar label toe aan alle interactieve elementen. " +
      "Gebruik correcte ARIA-rollen (role=\"button\", role=\"checkbox\") voor custom elementen. " +
      "Communiceer statuswijzigingen via aria-expanded, aria-checked of aria-selected.",
  },
};
