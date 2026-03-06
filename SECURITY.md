# Beveiligingsbeleid

## Ondersteunde versies

| Versie | Ondersteund |
|--------|-------------|
| 0.x    | Ja (development) |

## Kwetsbaarheid melden

Als je een beveiligingskwetsbaarheid hebt gevonden in de Sovereign Accessibility Auditor, neem dan **niet** contact op via een openbaar GitHub Issue.

### Responsible Disclosure

1. **E-mail**: Stuur een beschrijving naar **security@athide.nl**
2. **Verwachte reactietijd**: Binnen 72 uur
3. **Wat te vermelden**:
   - Beschrijving van de kwetsbaarheid
   - Stappen om het probleem te reproduceren
   - Mogelijke impact
   - Eventuele suggesties voor een oplossing

### Wat wij doen

- We bevestigen ontvangst binnen 72 uur
- We beoordelen de ernst en impact
- We werken aan een fix en informeren je over de voortgang
- We vermelden je (met toestemming) in de release notes

### Buiten scope

- Kwetsbaarheden in dependencies die al een upstream fix hebben
- Denial-of-service aanvallen
- Social engineering

## Beveiligingsmaatregelen

Dit project hanteert de volgende beveiligingsstandaarden:

- **OWASP Top 10**: Alle code adresseert de OWASP Top 10 risico's
- **Dependency pinning**: Alle dependencies zijn exact gepind (geen `^` of `~`)
- **Container hardening**: read-only filesystem, no-new-privileges, cap_drop ALL
- **Netwerksegmentatie**: Elke scanner in eigen geïsoleerd Docker network
- **SSRF bescherming**: Blocklist voor interne netwerken (10.x, 172.16.x, 169.254.x, localhost)
