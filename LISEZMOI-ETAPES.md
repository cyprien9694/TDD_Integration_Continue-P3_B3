# TP CI/CD — guide de rendu

Le dossier `devsecops-tp/` est l'**état final** du repo. Le barème regarde aussi l'historique (job rouge puis vert,
PR `fix/security`), donc rejoue les étapes dans cet ordre. `etapes/originaux/` contient le code de départ du TP.

## Ce qui est fait / ce qu'il te reste à faire

| Fait dans le ZIP | À faire toi-même (impossible hors de ton compte / de ta machine) |
|---|---|
| Code corrigé, 14 tests verts (vérifiés), 10 tests de régression qui échouent sur l'ancien code (vérifié) | Créer le repo public, pousser, activer CodeQL |
| `npm audit` avant/après (relevés réels) | Capture « Secret Protection / Push protection » → `docs/secret-protection.png` |
| `ci.yml` durci, actions épinglées par SHA (SHA lus sur GitHub) | Relever tes alertes CodeQL (règle, fichier, ligne, gravité) |
| `dependabot.yml`, Dockerfile, `.dockerignore`, `aws/`, bonus OIDC | **Mesurer les images** (taille, couches, CVE) : Docker n'était pas dispo ici |
| README complet, calculs AWS vérifiés | Protéger `main` (script fourni) ; remplacer `OWNER` dans les badges |

À vérifier aussi : le tag `node:22.21.1-alpine3.22` doit exister sur Docker Hub (sinon prends le dernier `22.x-alpine3.xx`),
et si Trivy trouve une faille HIGH/CRITICAL corrigeable sur l'image de base, monte la version.

## Ordre des commits (pour un historique qui prouve le rouge → vert)

```bash
# 0. Départ : fichiers du TP (etapes/originaux) tels quels
mkdir devsecops-tp && cd devsecops-tp && git init -b main
#   copie : package.vulnerable.json -> package.json, app.vulnerable.js -> src/app.js,
#           index.js + tests/app.test.js (énoncé), Dockerfile.naif -> Dockerfile, ci.naif.yml -> .github/workflows/ci.yml
npm install && npm test        # 2 tests verts
git add . && git commit -m "chore: import initial du TP" && git remote add origin <url> && git push -u origin main
./scripts/setup-github.sh <user>/devsecops-tp   # secret scanning, push protection, Dependabot, CodeQL

# 1. Secrets
#   .gitignore + .env.example        -> commit "chore: gitignore et env.example"
#   npm audit en local (ligne « Avant » du README)

# 2. Dépendances (rouge puis vert)
#   .github/dependabot.yml + job deps-audit avec express 4.17.1 / lodash 4.17.15 -> push -> job ROUGE (capture)
#   puis express 4.22.3 + lodash 4.18.1 (npm install), tests verts -> push -> job VERT

# 3. Code : branche fix/security
git switch -c fix/security
#   a) ajoute tests/security.test.js seul, lance `npm test` sur l'ancien app.js : ça doit ÉCHOUER (capture)
#   b) remplace src/app.js par la version corrigée : tout passe -> PR vers main, CodeQL propre

# 4. Pipeline : ci.yml durci (SHA épinglés), puis PROTECT=1 ./scripts/setup-github.sh <user>/devsecops-tp
#    (une fois que CodeQL a tourné : vérifie le nom exact du check dans Settings → Branches)

# 5. Image : mesure l'image naïve AVANT de remplacer le Dockerfile, puis Dockerfile + .dockerignore + job image
docker build -t devsecops-tp:naif . && docker images devsecops-tp && docker history devsecops-tp:naif
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.74.0 image --severity HIGH,CRITICAL devsecops-tp:naif
docker build -t devsecops-tp:optim . && docker run -p 3000:3000 devsecops-tp:optim   # puis curl localhost:3000/health
#   Ordres de grandeur pour te repérer (à remplacer par TES mesures) : naïve > 1 Go ; optimisée ~ 150–250 Mo.

# 6-7. aws/, README, deploy-aws.yml : variable AWS_ENABLED non définie -> le job est ignoré
```

## Pièges connus

- `git ls-remote … refs/tags/vX` renvoie, pour un **tag annoté**, le SHA de l'objet tag. Il faut celui du commit :
  ajoute `^{}` (`refs/tags/v0.36.0^{}`). Les SHA du ZIP sont déjà les bons.
- Le nom du check CodeQL dans la protection de branche est en général `Analyze (javascript-typescript)`.
- Le badge CodeQL ne s'affiche que si le workflow existe ; sinon utilise le lien vers Code scanning.
- `ping` n'existe pas dans tous les environnements : le test de `/ping` ne dépend donc pas du binaire.
