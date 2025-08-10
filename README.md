# semrush-traffic

Outil pour estimer le trafic incrémental à partir d'un export Semrush.

Une version web est fournie pour un hébergement facile (par exemple sur Netlify).

## Application web

1. Ouvrir `index.html` dans un navigateur.
2. Choisir le fichier Excel exporté depuis Semrush.
3. Indiquer le gain de positions et le multiplicateur de CTR.
4. Cliquer sur **Estimate** pour afficher le trafic incrémental par cocon sémantique et un graphique.

Le site peut être déployé tel quel sur Netlify en tant que site statique.

## Utilisation

```bash
python traffic_estimator.py mondialrelay.fr-organic.Positions-fr-20250809-2025-08-10T17_40_01Z.xlsx \
    --improvement 2 \
    --ctr-multiplier 1.2
```

* `--improvement` : nombre de positions gagnées pour chaque mot-clé.
* `--ctr-multiplier` : facteur appliqué au CTR après optimisation (ex : 1.2 = +20%).

Le script génère :

* `traffic_estimates.csv` : détail des estimations pour chaque mot-clé.
* `incremental_traffic.png` : graphique du trafic incrémental par cocon sémantique.
