# Portfolio Frontend

Frontend HTML/CSS/JS pure qui consomme l'API Laravel.

## Configuration

1. Modifier l'URL de l'API dans `app.js` :

```javascript
const API_BASE_URL = 'http://localhost:8000/api'; // URL de votre API Laravel
```

2. Si vous déployez sur un serveur, remplacez par l'URL de production :

```javascript
const API_BASE_URL = 'https://votre-api.com/api';
```

## Hébergement

Le frontend peut être hébergé sur n'importe quel serveur web statique :

- **Netlify** / **Vercel** / **GitHub Pages** : Gratuit et facile
- **Nginx** / **Apache** : Servir le dossier `frontend/` comme site statique
- **Serveur local** : Utiliser `npx serve .` ou `python -m http.server`

## Fichiers

- `index.html` - Page principale
- `styles.css` - Feuilles de style
- `app.js` - Logique JavaScript et appels API

## Routes API utilisées

| Route | Description |
|-------|-------------|
| `GET /api/ping` | Ping pour garder le serveur éveillé |
| `GET /api/all` | Toutes les données du portfolio |
| `GET /api/portfolio` | Informations du portfolio |
| `GET /api/stages` | Liste des stages |
| `GET /api/projects` | Liste des projets |
| `GET /api/realisations` | Liste des réalisations |
| `GET /api/companies` | Liste des entreprises |
| `GET /api/competences` | Liste des compétences |

## Fonctionnalités

- **Chargement dynamique** : Les données sont chargées via l'API au chargement de la page
- **Ping automatique** : Un ping est envoyé toutes les 5 minutes pour garder le serveur éveillé
- **Design responsive** : Adapté mobile, tablette et desktop
- **Animations** : Transitions fluides sur la navigation et les éléments
