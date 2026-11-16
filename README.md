# Musique aléatoire systémique

Générateur de grilles d'accords par tirages de dés (D6, D8, D10, D20), d'après le système « Musique aléatoire systémique » (2020).

1. **Métrique** : 5 + D10 croches par mesure, D6 mesures, D6 binaire (1–3) / ternaire (4–6).
2. **Tonalité** : D8 ♭/♯, D8 nombre d'altérations (8 = aucune), D8 mineur/majeur ; en mineur, pile ou face naturel/harmonique.
3. **Degrés** : D6 pour leur nombre, un D8 par degré (8 et doublons relancés), un D20 par degré pour les classer (égalités relancées).
4. **Grille** : poids 1…n selon le rang, un dé couvrant le total (D4, D6, D10, D20, D100 pour 21), un accord par demi-mesure, en boucle.

5. **Mélodie** (règles provisoires) : D6 ambitus, un D6 de rythme par groupe de croches, note de l'accord (D6) au début de chaque demi-mesure, puis mouvement au D8.
6. **Basse** : D6 de style (tenue / par groupe / réponse à la mélodie), note d'appui au D6 en début de demi-mesure, puis D6 (fondamentale, quinte, octave, tierce, passage, mouvement contraire à la mélodie).
7. **Batterie** : D6 cymbale de rythme (charleston / ride), D6 densité, D6 break de fin ; grosse caisse au 1er temps et aux demi-mesures, D6 grosse caisse / caisse claire sur les autres groupes, crash aux changements d'accord.

Écoute dans le navigateur (Web Audio) et export MIDI.

Site statique : `index.html`, sans build.

Pages : `index.html` (jouer en ligne) et `studio.html` (sortie MIDI vers instruments). Moteur partagé : `app.js`, styles : `style.css`.
