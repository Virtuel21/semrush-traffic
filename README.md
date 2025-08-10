# semrush-traffic

Outil pour estimer le trafic incrémental à partir d'un export Semrush.

## Fonctionnalités

- Estimation du trafic incrémental basée sur l'amélioration des positions
- Application d'un multiplicateur de CTR personnalisable
- Analyse par cocon sémantique
- Interface web intuitive et version en ligne de commande
- Génération de rapports et graphiques

## Application web

L'application web offre une interface utilisateur simple pour analyser vos données Semrush.

### Utilisation
1. Ouvrir `index.html` dans un navigateur
2. Choisir le fichier Excel exporté depuis Semrush
3. Indiquer le gain de positions souhaité
4. Définir le multiplicateur de CTR
5. Cliquer sur **Estimate** pour afficher :
   - Le trafic incrémental par cocon sémantique
   - Un graphique de visualisation des résultats

### Déploiement
Le site peut être déployé tel quel sur Netlify en tant que site statique.

## Version ligne de commande

### Utilisation

```bash
python traffic_estimator.py mondialrelay.fr-organic.Positions-fr-20250809-2025-08-10T17_40_01Z.xlsx \
    --improvement 2 \
    --ctr-multiplier 1.2
```

### Paramètres

- `--improvement` : Nombre de positions gagnées pour chaque mot-clé
- `--ctr-multiplier` : Facteur appliqué au CTR après optimisation (ex : 1.2 = +20%)

### Sorties générées

Le script génère automatiquement :
- `traffic_estimates.csv` : Détail des estimations pour chaque mot-clé
- `incremental_traffic.png` : Graphique du trafic incrémental par cocon sémantique

## Installation

```bash
# Cloner le repository
git clone https://github.com/votre-username/semrush-traffic.git
cd semrush-traffic

# Installer les dépendances (pour la version Python)
pip install -r requirements.txt
```

## Prérequis

- Python 3.7+ (pour la version ligne de commande)
- Navigateur web moderne (pour l'application web)
- Export Semrush au format Excel

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou soumettre une pull request.