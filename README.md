# Cut 2027

Een persoonlijke tracker om tot de zomervakantie van 2027 vet te verliezen. Je houdt er gewicht, voeding, stappen, lichaamsmaten en training in bij.
Gewone HTML, CSS en JavaScript, zonder framework en zonder build-stap. De gegevens staan alleen in de browser van je telefoon (localStorage).

## Schermen

- **Vandaag**: gewicht, kcal, eiwit, vezels, stappen, training en de vlag "buiten gegeten". Ook eerdere dagen kun je aanpassen.
- **Gewicht**: een grafiek met de losse metingen en het 7-daags gemiddelde, plus het weekgemiddelde, het verschil met vorige week, wat je sinds de start kwijt bent en wat er nog te gaan is.
- **Bijsturing**: elke 2 weken vergelijkt de app het gemiddelde van de laatste 7 dagen met de 7 dagen daarvoor. Je krijgt dan advies, met een knop om je kcal-doel aan te passen.
- **Metingen**: taille, heupen, bovenbeen, bovenarm en borst. Per meetpunt zie je het verschil en een kleine grafiek, en je krijgt een herinnering als je meer dan 14 dagen niet gemeten hebt.
- **Training**: het weekschema, per oefening de waarde van de vorige keer, de trend in je kracht en een waarschuwing als je kracht bij meerdere oefeningen daalt. Oefeningen kun je toevoegen, hernoemen en verwijderen.
- **Instellingen** (tandwiel rechtsboven): doelen, streefgewicht, weekschema, export, import en alles wissen.

## Regels aanpassen

Alle drempels staan bovenaan de blokken in `js/logic.js`:
- `ADJUST_RULES`: de bijsturingsregel (0,3 / 0,5 / 0,7 kg per week, minimaal 10 metingen, elke 14 dagen)
- `STRENGTH_RULES`: de krachttrend (vergelijking met de laatste 3 sessies, waarschuwing bij 2 dalende oefeningen)

Pas je daar iets aan, draai dan de tests opnieuw.

## Structuur

```
index.html          pagina en tabbalk
css/style.css       opmaak
js/logic.js         rekenregels (gemiddelden, bijsturing, metingen, kracht), geen DOM
js/store.js         opslag in localStorage + standaardwaarden
js/chart.js         eigen SVG-grafiek
js/app.js           navigatie en gedeelde hulpjes
js/views/*.js       één bestand per scherm
tests/logic.test.js testgevallen voor de rekenlogica
```

Drempels en regels pas je aan in `js/logic.js`. De schermen tonen alleen de uitkomst.

## Testen

```bash
node tests/logic.test.js
```

## Lokaal bekijken

```bash
python3 -m http.server 8000
```

Open daarna http://localhost:8000.

## GitHub Pages aanzetten

1. Ga op GitHub naar de repo en open **Settings → Pages**.
2. Kies bij **Source** voor **Deploy from a branch**.
3. Kies de branch `main` en de map `/ (root)`, en klik op **Save**.
4. Na een minuut of twee staat de app op `https://<gebruikersnaam>.github.io/cut-2027/`.

Tip: open die link op je telefoon en kies **Zet op beginscherm**. Dan opent de app als een gewone app.

## Backup

De gegevens staan alleen op het apparaat en in de browser waarin je de app gebruikt. Wis je de browsergegevens, dan ben je ze kwijt. Via **Instellingen → Backup** exporteer je alles als JSON-bestand, en daar zet je het later ook weer terug. Doe dat af en toe.
