# LIEVE club femminile — sito dimostrativo

> **Attività di fantasia.** LIEVE e il paese di Pianvecchio non esistono. Nomi, recapiti, prezzi, orari e
> recensioni sono inventati; le recensioni sono marcate come dimostrative. Il sito è una demo realizzata da
> [Michele Modica](https://www.modicamichele.it) per mostrare il proprio lavoro.

Demo online: https://gxmich.github.io/lieve-club-femminile-demo/

## Cosa mostra la demo

Una pagina unica per un club di allenamento femminile con sessioni guidate da 30 minuti:

- **Ingresso animato**: il nome del club, disegnato in tracciati vettoriali, si apre sulla foto della home.
  Si può saltare, compare una volta per sessione e non parte con «riduci movimento».
- **Nastro** che accelera con lo scroll e **manifesto** che si accende parola per parola.
- **Il metodo**: un timer da 00:00 a 30:00 guidato dallo scroll, con le quattro fasi della mezz'ora.
- **Scegli la tua mezz'ora**: giorno e orario preparano il messaggio di richiesta.
- **Corsi** in scorrimento orizzontale (verticale su telefono) e un mini quiz che porta al corso giusto.
- **Carta Prova** con tessera che si inclina col mouse e si compila mentre scrivi nome e data.
- Recensioni in due nastri scorrevoli, galleria in parallasse, FAQ, mappa illustrata, barra fissa su mobile.

Tutti i contatti sono **simulati**: i pulsanti di chat e il modulo mostrano a schermo il messaggio che verrebbe
preparato, senza inviare niente e senza che i dati lascino il browser. Ogni pagina ha `noindex, nofollow` e
`robots.txt` blocca i motori di ricerca.

## Tecnologie

HTML, CSS e JavaScript senza build. GSAP con ScrollTrigger e Lenis sono inclusi in locale in `assets/vendor/`,
i font Bricolage Grotesque e Figtree in `assets/fonts/` (SIL Open Font License).

## Avvio in locale

Basta un server statico nella cartella del progetto:

```bash
python -m http.server 5507
```

poi apri http://127.0.0.1:5507

## Foto

Foto da Unsplash e Pexels con le rispettive licenze: elenco completo in [CREDITI-FOTO.md](CREDITI-FOTO.md).
