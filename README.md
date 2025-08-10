# semrush-traffic

Outil pour estimer le trafic incrémental à partir d'un export Semrush.

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
