const express = require('express');
const { execFile } = require('child_process');
const _ = require('lodash');

const app = express();

// Préférences autorisées : liste blanche clé -> valeurs permises
const PREFS_ALLOWED = {
  theme: ['light', 'dark'],
  lang: ['fr', 'en'],
};
const PREFS_DEFAULTS = { theme: 'light', lang: 'fr' };

// Hôte valide : IPv4 ou nom DNS (labels alphanumériques/tirets, jamais de tiret en tête)
const HOST_REGEX =
  /^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Message de bienvenue
// Correctif XSS : la saisie utilisateur est échappée avant d'être insérée dans le HTML
app.get('/hello', (req, res) => {
  const name = typeof req.query.name === 'string' && req.query.name ? req.query.name : 'inconnu';
  res.type('html').send(`<h1>Bonjour ${_.escape(name)}</h1>`);
});

// Outil réseau : ping un hôte
// Correctif injection de commande : validation stricte + execFile (aucun shell, arguments séparés)
app.get('/ping', (req, res) => {
  const host = req.query.host;
  if (typeof host !== 'string' || !HOST_REGEX.test(host)) {
    return res.status(400).send('Hôte invalide');
  }
  execFile('ping', ['-c', '1', host], { timeout: 5000 }, (err, stdout) => {
    if (err) return res.status(500).send('Erreur');
    res.type('text').send(stdout);
  });
});

// Préférences utilisateur
// Correctif pollution de prototype / mass assignment : plus de _.merge sur req.query,
// on ne lit que des clés connues, avec des valeurs validées.
app.get('/prefs', (req, res) => {
  const prefs = { ...PREFS_DEFAULTS };
  for (const key of Object.keys(PREFS_ALLOWED)) {
    if (!Object.prototype.hasOwnProperty.call(req.query, key)) continue;
    const value = req.query[key];
    if (typeof value !== 'string' || !PREFS_ALLOWED[key].includes(value)) {
      return res.status(400).json({ error: `Valeur invalide pour "${key}"` });
    }
    prefs[key] = value;
  }
  res.json(prefs);
});

module.exports = app;
