import type { FindingNarrative } from "./types.js";

/** WCAG 2.2 narratives for criteria 1.x and 2.x. */
export const NARRATIVES_1X2X: Record<string, FindingNarrative> = {
  "1.1.1": {
    watFout:
      "Afbeeldingen, iconen of andere niet-tekstuele elementen hebben geen alternatieve tekst. " +
      "Screenreaders kunnen de inhoud niet overbrengen aan bezoekers die de afbeelding niet kunnen zien.",
    impactBlind:
      "Een blinde bezoeker hoort niets, de bestandsnaam of een zinloze omschrijving. " +
      "Informatieve afbeeldingen — zoals grafieken, foto's van personen of diagrammen — zijn volledig ontoegankelijk. " +
      "De bezoeker mist context die zichtbare gebruikers wél hebben.",
    impactDoof:
      "Geen directe impact bij geschreven content. Wanneer de niet-tekstuele inhoud een audio-fragment is " +
      "zonder transcript, mist de dove bezoeker die informatie volledig.",
    oplossing:
      "Voeg een beschrijvend alt-attribuut toe aan elke informatieve afbeelding. " +
      "Decoratieve afbeeldingen krijgen een leeg alt-attribuut (alt=\"\"). " +
      "Complexe afbeeldingen (grafieken, schema's) krijgen bovendien een uitgebreide tekstbeschrijving in de omliggende pagina.",
  },

  "1.3.1": {
    watFout:
      "Informatie die visueel overkomt als een kop, lijst of label is niet semantisch gemarkeerd. " +
      "De opmaak is puur visueel (grote vetgedrukte tekst, inspringen) zonder gebruik van de juiste HTML-elementen.",
    impactBlind:
      "Screenreaders navigeren via koppen en lijsten. Zonder semantische markeringen is er geen structuur: " +
      "alle tekst komt als één lange stroom voor. Het is onmogelijk snel door de pagina te springen of secties te vinden.",
    impactDoof:
      "Geen directe impact bij auditief verlies. Bezoekers die spraakherkenning gebruiken " +
      "kunnen elementen niet bij naam aanroepen als ze geen toegankelijke labels hebben.",
    oplossing:
      "Gebruik HTML-kopelementen (h1–h6) voor titels in een logische hiërarchie. " +
      "Gebruik ul/ol voor lijsten, label-elementen voor formuliervelden en table/th voor tabelgegevens. " +
      "Visuele opmaak mag nooit de enige drager van structuurinformatie zijn.",
  },

  "1.3.4": {
    watFout:
      "De pagina of onderdelen ervan zijn vergrendeld op één schermoriëntatie (portret of landschap). " +
      "Inhoud die alleen in landschap werkt, sluit gebruikers uit die hun apparaat niet kunnen draaien.",
    impactBlind:
      "Beperkte directe impact. Gebruikers met screenreader die een vaste montage of houder gebruiken " +
      "kunnen echter hun apparaat niet heroriënteren en worden buitengesloten als content oriëntatie-afhankelijk is.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Verwijder CSS of JavaScript die de schermoriëntatie vastzet. " +
      "Gebruik responsive design zodat alle inhoud en functies in zowel portret als landschap beschikbaar zijn. " +
      "Gebruik geen screen.orientation.lock() tenzij dit absoluut functioneel noodzakelijk is.",
  },

  "1.4.3": {
    watFout:
      "De contrastverhouding tussen tekst en achtergrond voldoet niet aan de minimumeis van 4,5:1 (normaal) " +
      "of 3:1 (grote tekst ≥ 18pt of ≥ 14pt vet). Lichte grijstinten op witte achtergrond zijn een veelvoorkomende oorzaak.",
    impactBlind:
      "Slechtziende bezoekers en mensen met een visuele beperking zoals grijs staar of kleurzwakte " +
      "kunnen tekst met onvoldoende contrast niet of moeizaam lezen. " +
      "Bij fel zonlicht verergert dit probleem voor alle gebruikers.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Verhoog de contrastverhouding door de tekstkleur te verdonkeren of de achtergrond aan te passen. " +
      "Gebruik een contrastchecker (bijv. WebAIM Contrast Checker) tijdens het ontwerpen. " +
      "Stel een minimumcontrast in als ontwerprichtlijn in het design system.",
  },

  "1.4.4": {
    watFout:
      "Tekst schaalt niet correct mee wanneer de browserlettergrootte door de gebruiker wordt vergroot tot 200%. " +
      "Vaste pixel-groottes (px) blokkeren de lettergrootte-instelling van de browser.",
    impactBlind:
      "Slechtziende bezoekers die via de browserinstellingen tekst groter zetten, zien alsnog kleine tekst " +
      "of een kapotte lay-out. Ze zijn afhankelijk van externe vergrotingssoftware, wat extra handelingen vereist.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Gebruik relatieve eenheden (rem, em) voor lettergroottes in plaats van vaste pixels. " +
      "Test de pagina met browserlettergrootte ingesteld op 200% en controleer of alle tekst leesbaar blijft " +
      "en de lay-out functioneel is.",
  },

  "1.4.10": {
    watFout:
      "De pagina vereist horizontaal scrollen bij een viewport-breedte van 320 CSS-pixels. " +
      "Inhoud is niet responsive en past niet in een smal scherm zonder zijdelingse schuifbalk.",
    impactBlind:
      "Gebruikers met vergrotingssoftware (zoom 400%) werken effectief op een smalle viewport. " +
      "Horizontaal scrollen is bijzonder belastend: ze verliezen hun positie en moeten voortdurend heen en weer navigeren.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Implementeer responsive design met CSS media queries. Vermijd vaste breedtes op containers " +
      "en gebruik max-width in combinatie met percentage-breedtes. " +
      "Test expliciet op een viewport van 320px breed.",
  },

  "1.4.11": {
    watFout:
      "Niet-tekstuele gebruikersinterface-componenten (knoppen, invoervelden, pictogrammen, focusindicatoren) " +
      "hebben onvoldoende contrast met de aangrenzende kleur — minimumeis is 3:1.",
    impactBlind:
      "Slechtziende bezoekers kunnen formuliervelden niet herkennen als velden, knoppen niet onderscheiden van " +
      "de achtergrond, en zien focusindicatoren niet. Dit maakt interactie met het formulier of de navigatie " +
      "moeilijk tot onmogelijk.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Zorg dat alle UI-componenten een contrastverhouding van minimaal 3:1 hebben ten opzichte van de aangrenzende kleur. " +
      "Pas randkleur, achtergrond of de component zelf aan. Controleer met een contrastmeter.",
  },

  "1.4.12": {
    watFout:
      "De lay-out breekt of inhoud valt weg wanneer een gebruiker via de browser de regelafstand, " +
      "letterafstand, woordafstand of spatie na alinea's aanpast (zoals beschreven in de WCAG-testmethode).",
    impactBlind:
      "Gebruikers met dyslexie of een leesbeperking passen vaak tekstspatiëring aan om beter te kunnen lezen. " +
      "Als de lay-out hierdoor kapotgaat of tekst wordt afgekapt, worden ze direct belemmerd in hun toegang tot informatie.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Vermijd vaste hoogtes op tekstcontainers. Gebruik min-height in plaats van height. " +
      "Zorg dat containers meegroeien met de inhoud. Test met het WCAG Text Spacing bookmarklet.",
  },

  "1.4.13": {
    watFout:
      "Inhoud die verschijnt bij hover of focus (tooltips, dropdowns, subteksten) is niet stabiel: " +
      "ze verdwijnen als de muisaanwijzer van de trigger beweegt naar de verschenen inhoud, " +
      "of ze kunnen niet worden gesloten zonder de focus te verplaatsen.",
    impactBlind:
      "Gebruikers die inzoomen en met muis navigeren moeten de aanwijzer bewegen naar de verschenen inhoud. " +
      "Als die verdwijnt zodra de aanwijzer van de trigger afwijkt, is de content onbereikbaar.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Zorg dat hover-content ook verschijnt bij toetsenbordfocus. " +
      "De content mag pas verdwijnen wanneer de gebruiker dit zelf initieert (Escape, klik buiten). " +
      "Gebruik CSS-transitions die het muispad naar de content ondersteunen.",
  },

  "2.1.1": {
    watFout:
      "Niet alle functies van de website zijn bereikbaar en bedienbaar met alleen het toetsenbord. " +
      "Sommige interactieve elementen zijn alleen via de muis te activeren.",
    impactBlind:
      "Blinde bezoekers gebruiken uitsluitend het toetsenbord (en een screenreader). " +
      "Functies die niet per toetsenbord bereikbaar zijn, zijn voor hen volledig ontoegankelijk. " +
      "Dit is een van de meest ingrijpende toegankelijkheidsbarrières.",
    impactDoof:
      "Dove bezoekers met motorische beperkingen navigeren vaak via toetsenbord. " +
      "Niet-toetsenbord-toegankelijke functies zijn ook voor hen onbereikbaar.",
    oplossing:
      "Zorg dat alle interactieve elementen focusbaar zijn (tabIndex ≥ 0 of native HTML-elementen). " +
      "Activeer met Enter en Spatiebalk. Vermijd event listeners die alleen op muisgebeurtenissen reageren. " +
      "Test de volledige user journey met alleen het toetsenbord.",
  },

  "2.1.2": {
    watFout:
      "Toetsenbordfocus raakt gevangen in een component of widget: de gebruiker kan er niet meer uit navigeren " +
      "met de Tab-toets. Dit blokkeert verdere paginanavigatie.",
    impactBlind:
      "Een blinde bezoeker die vastloopt in een focusval kan de rest van de pagina of website niet meer bereiken. " +
      "De enige ontsnapping is de browser sluiten en opnieuw beginnen — alle context gaat verloren.",
    impactDoof: "Gebruikers met motorische beperkingen die toetsenbord gebruiken ondervinden hetzelfde probleem.",
    oplossing:
      "Test alle modals, widgets en custom componenten op focusbeheer. " +
      "Zorg voor een expliciete sluitoptie (Escape) in modals en dialogs. " +
      "Gebruik aria-modal en beheer focus-trap alleen zolang de modal open is, met herstel daarna.",
  },

  "2.2.1": {
    watFout:
      "De website bevat tijdslimieten (sessie-timeout, formuliervervaldatum) waarbij de gebruiker niet gewaarschuwd " +
      "wordt en geen mogelijkheid heeft de tijd te verlengen voordat de limiet verloopt.",
    impactBlind:
      "Blinde bezoekers lezen trager omdat ze de pagina via een screenreader verkennen. " +
      "Een onverwachte timeout veroorzaakt gegevensverlies en dwingt hen opnieuw te beginnen — " +
      "een tijdrovend en frustrerend proces.",
    impactDoof: "Geen directe impact, tenzij de waarschuwing alleen via geluid wordt gegeven.",
    oplossing:
      "Waarschuw de gebruiker minimaal 20 seconden voor het aflopen van een tijdslimiet. " +
      "Bied de mogelijkheid de limiet te verlengen of uit te zetten. " +
      "Sla formuliergegevens op in de sessie zodat ze niet verloren gaan bij een time-out.",
  },

  "2.2.2": {
    watFout:
      "De pagina bevat bewegende, knipperende of automatisch scrollende inhoud " +
      "(carrousels, animaties, tickers) die langer dan 5 seconden duurt en niet door de gebruiker " +
      "kan worden gepauzeerd, gestopt of verborgen.",
    impactBlind:
      "Bewegende inhoud interfereert met screenreader-aankondigingen en leidt af. " +
      "De ARIA live regions die screenreaders gebruiken voor dynamische updates worden verstoord.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Voeg een pauze/stop-knop toe aan carrousels en animaties. " +
      "Gebruik prefers-reduced-motion om animaties uit te schakelen voor gebruikers die dat verkiezen. " +
      "Overweeg standaard-pauze bij bewegende content die langer dan 5 seconden actief is.",
  },

  "2.4.1": {
    watFout:
      "Er is geen skiplink of andere mechanisme aanwezig waarmee gebruikers herhalende navigatieblokken " +
      "kunnen overslaan om direct naar de hoofdinhoud te gaan.",
    impactBlind:
      "Een blinde bezoeker moet bij elke pagina eerst de volledige navigatie doorlopen " +
      "voordat de hoofdinhoud bereikt wordt. Op een site met 40 navigatie-items betekent dit " +
      "40 Tab-presses per pagina — een enorme belasting.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Voeg een 'Ga naar hoofdinhoud'-skiplink toe als eerste focusbaar element op elke pagina. " +
      "De skiplink mag visueel verborgen zijn maar moet zichtbaar worden bij focus. " +
      "Zorg dat het doelelement (main) een geldig tabIndex=-1 heeft.",
  },

  "2.4.3": {
    watFout:
      "De volgorde waarin toetsenbordfocus door de pagina-elementen beweegt is niet logisch " +
      "of inconsistent met de visuele volgorde. Focus springt naar onverwachte plaatsen.",
    impactBlind:
      "Wanneer focusvolgorde afwijkt van de leesrichting, moeten blinde bezoekers in hun hoofd bijhouden " +
      "waar ze zijn. Modals die focus niet correct beheren sturen gebruikers naar achterliggende elementen.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Zorg dat de DOM-volgorde de visuele volgorde weerspiegelt. " +
      "Vermijd positieve tabIndex-waarden — gebruik alleen 0 en -1. " +
      "Test de focusvolgorde door de volledige pagina met Tab te doorlopen.",
  },

  "2.4.7": {
    watFout:
      "De toetsenbordfocusindicator is uitgeschakeld of onzichtbaar gemaakt (outline: none of outline: 0 in CSS) " +
      "zonder een gelijkwaardig alternatief te bieden. Gebruikers weten niet waar de focus staat.",
    impactBlind:
      "Slechtziende bezoekers die zowel muis als toetsenbord gebruiken, zien niet welk element gefocust is. " +
      "Volledig blinde bezoekers zijn minder direct getroffen (screenreader meldt focus) " +
      "maar slecht-ziendengebruikers zijn volledig gedesoriënteerd.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Verwijder outline: none uit de CSS, of vervang het door een duidelijke aangepaste focusindicator. " +
      "WCAG 2.4.11 (Focus Not Obscured) stelt aanvullende eisen aan zichtbaarheid. " +
      "Gebruik een focusring met voldoende contrast (minimaal 3:1).",
  },

  "2.4.11": {
    watFout:
      "Het gefocuste element wordt volledig of gedeeltelijk bedekt door andere inhoud, " +
      "zoals een sticky header, cookie-banner of chatwidget. De gebruiker ziet niet welk element de focus heeft.",
    impactBlind:
      "Slechtziende toetsenbordgebruikers verliezen hun oriëntatie op de pagina. " +
      "Het gefocuste element is onzichtbaar, waardoor navigatie onvoorspelbaar wordt.",
    impactDoof: "Geen directe impact.",
    oplossing:
      "Gebruik scroll-margin-top (CSS) om te zorgen dat de pagina meescrollt als een element de focus krijgt " +
      "en anders achter een sticky element zou verdwijnen. " +
      "Overweeg de z-index en positie van vaste elementen te herzien.",
  },

  "2.5.1": {
    watFout:
      "Functionaliteit die met een pad-gebaseerd gebaar werkt (vegen, slepen, multi-touch) " +
      "heeft geen enkelvoudig aanraakpunt-alternatief. Gebruikers die geen complexe gebaren kunnen uitvoeren, " +
      "zijn buitengesloten.",
    impactBlind: "Weinig directe impact, tenzij een screenreader-gebaar conflicteert met het applicatiegebaar.",
    impactDoof:
      "Bezoekers met motorische beperkingen kunnen complexe gebaren niet of moeilijk uitvoeren. " +
      "Het ontbreken van een alternatief sluit hen volledig uit van de functionaliteit.",
    oplossing:
      "Bied voor elke gebaar-gebaseerde actie een alternatief aan via één aanraakpunt: " +
      "een knop, link of ander enkelvoudig interactiemechanisme. " +
      "Gebruik swipe-gebaren alleen als aanvullend alternatief, nooit als enige invoermethode.",
  },

};
