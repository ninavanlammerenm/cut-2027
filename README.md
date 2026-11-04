# Cut 2027

Een persoonlijke tracker om tot de zomervakantie van 2027 vet te verliezen. Je houdt er gewicht, voeding, stappen, lichaamsmaten en training in bij.
Gewone HTML, CSS en JavaScript, zonder framework en zonder build-stap. De gegevens staan alleen in de browser van je telefoon (localStorage).

## Schermen

- **Vandaag**: gewicht, kcal, eiwit, vezels, stappen, training en de vlag "gegeten bij vriend". Ook eerdere dagen kun je aanpassen.
- **Gewicht**: een grafiek met de losse metingen en het 7-daags gemiddelde, plus het weekgemiddelde en het verschil met vorige week.
- Bijsturing, Metingen, Training en Instellingen: komen nog.

## Structuur

```
index.html          pagina en tabbalk
css/style.css       opmaak
js/logic.js         rekenregels (gemiddelden, weekverschil, dagdoelen), geen DOM
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

De gegevens staan alleen op het apparaat en in de browser waarin je de app gebruikt. Wis je de browsergegevens, dan ben je ze kwijt. In Instellingen komt een knop om alles te exporteren en te importeren als JSON.
