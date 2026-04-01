const express = require('express');
const app = express();
const fs = require('fs');
const youtubedl = require('youtube-dl-exec');

app.use(express.json());

if (!fs.existsSync('clips')) {
  fs.mkdirSync('clips');
}

app.use('/clips', express.static('clips'));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ClipFlow</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #0f0f0f; color: white; min-height: 100vh; padding: 2rem; }
        .container { width: 100%; max-width: 600px; margin: 0 auto; }
        h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #a855f7; }
        .subtitulo { color: #888; margin-bottom: 2rem; }
        input { width: 100%; padding: 1rem; border-radius: 10px; border: 1px solid #333; background: #1a1a1a; color: white; font-size: 1rem; margin-bottom: 1rem; }
        button { width: 100%; padding: 1rem; border-radius: 10px; border: none; background: #a855f7; color: white; font-size: 1rem; cursor: pointer; margin-bottom: 0.5rem; }
        button:hover { background: #9333ea; }
        button:disabled { background: #444; cursor: not-allowed; }
        .dato { background: #1a1a1a; border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; }
        .dato span { color: #888; font-size: 0.85rem; }
        .dato p { color: white; font-size: 1rem; margin-top: 4px; }
        #info { display: none; margin-top: 1.5rem; }
        #estado { display: none; margin-top: 1.5rem; padding: 1rem; background: #1a1a1a; border-radius: 10px; }
        #estado p { color: #a855f7; }
        #clips-lista { margin-top: 1.5rem; display: none; }
        .clip-item { background: #1a1a1a; border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; }
        .clip-info p { color: white; font-size: 0.95rem; font-weight: bold; }
        .clip-info span { color: #888; font-size: 0.8rem; }
        .clip-copy { color: #ccc; font-size: 0.85rem; margin-top: 0.5rem; background: #222; padding: 0.5rem; border-radius: 6px; }
        .btn-descargar { display: inline-block; margin-top: 0.5rem; padding: 0.5rem 1rem; font-size: 0.85rem; background: #a855f7; border-radius: 8px; border: none; color: white; cursor: pointer; text-decoration: none; }
        .progreso { background: #333; border-radius: 10px; height: 8px; margin-top: 0.5rem; }
        .progreso-barra { background: #a855f7; height: 8px; border-radius: 10px; width: 0%; transition: width 0.3s; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>ClipFlow</h1>
        <p class="subtitulo">Convierte streams en clips virales para TikTok</p>
        <input type="text" id="url" placeholder="Pega aqui el enlace del stream de Kick..." />
        <button id="btnAnalizar" onclick="analizar()">Analizar stream</button>
        <div id="estado">
          <p id="estadoTexto">Analizando...</p>
          <div class="progreso" id="barraContenedor" style="display:none;">
            <div class="progreso-barra" id="barra"></div>
          </div>
        </div>
        <div id="info">
          <div class="dato"><span>Titulo del stream</span><p id="titulo"></p></div>
          <div class="dato"><span>Duracion</span><p id="duracion"></p></div>
          <div class="dato"><span>Streamer</span><p id="streamer"></p></div>
          <div class="dato"><span>Clips posibles</span><p id="clips"></p></div>
          <button id="btnGenerar" onclick="generarClips()">Generar 30 clips automaticamente</button>
        </div>
        <div id="clips-lista">
          <h2 style="color:#a855f7; margin-bottom:1rem;">Clips listos</h2>
          <div id="clips-contenedor"></div>
        </div>
      </div>
      <script>
        let urlActual = '';
        let duracionActual = 0;
        let tituloActual = '';
        let streamerActual = '';

        async function analizar() {
          const url = document.getElementById('url').value;
          if (!url) { alert('Pega un enlace primero'); return; }
          urlActual = url;
          document.getElementById('btnAnalizar').disabled = true;
          document.getElementById('btnAnalizar').innerText = 'Analizando...';
          document.getElementById('estado').style.display = 'block';
          document.getElementById('estadoTexto').innerText = 'Analizando el stream...';
          document.getElementById('info').style.display = 'none';
          document.getElementById('clips-lista').style.display = 'none';
          try {
            const res = await fetch('/analizar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (data.error) {
              document.getElementById('estadoTexto').innerText = 'Error: ' + data.error;
            } else {
              duracionActual = data.duracionSegundos;
              tituloActual = data.titulo;
              streamerActual = data.streamer;
              document.getElementById('estado').style.display = 'none';
              document.getElementById('info').style.display = 'block';
              document.getElementById('titulo').innerText = data.titulo;
              document.getElementById('duracion').innerText = data.duracion;
              document.getElementById('streamer').innerText = data.streamer;
              document.getElementById('clips').innerText = data.clips + ' clips de 34 segundos posibles';
            }
          } catch(e) {
            document.getElementById('estadoTexto').innerText = 'Algo salio mal. Intenta de nuevo.';
          }
          document.getElementById('btnAnalizar').disabled = false;
          document.getElementById('btnAnalizar').innerText = 'Analizar stream';
        }

        async function generarClips() {
          document.getElementById('btnGenerar').disabled = true;
          document.getElementById('btnGenerar').innerText = 'Generando clips...';
          document.getElementById('estado').style.display = 'block';
          document.getElementById('estadoTexto').innerText = 'Generando clips y copys virales...';
          document.getElementById('barraContenedor').style.display = 'block';
          let progreso = 0;
          const intervalo = setInterval(() => {
            if (progreso < 90) { progreso += 3; document.getElementById('barra').style.width = progreso + '%'; }
          }, 2000);
          try {
            const res = await fetch('/generar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: urlActual, duracion: duracionActual, titulo: tituloActual, streamer: streamerActual })
            });
            const data = await res.json();
            clearInterval(intervalo);
            document.getElementById('barra').style.width = '100%';
            if (data.error) {
              document.getElementById('estadoTexto').innerText = 'Error: ' + data.error;
            } else {
              document.getElementById('estado').style.display = 'none';
              document.getElementById('clips-lista').style.display = 'block';
              const contenedor = document.getElementById('clips-contenedor');
              contenedor.innerHTML = '';
              data.clips.forEach((clip, i) => {
                contenedor.innerHTML += '<div class="clip-item"><div class="clip-info"><p>Clip #' + (i+1) + ' — ' + clip.inicio + '</p><span>34 segundos</span></div><div class="clip-copy">' + clip.copy + '</div><a class="btn-descargar" href="' + clip.kickUrl + '" target="_blank">Ver en Kick</a></div>';
              });
            }
          } catch(e) {
            clearInterval(intervalo);
            document.getElementById('estadoTexto').innerText = 'Algo salio mal generando los clips.';
          }
          document.getElementById('btnGenerar').disabled = false;
          document.getElementById('btnGenerar').innerText = 'Generar 30 clips automaticamente';
        }
      </script>
    </body>
    </html>
  `);
});

app.post('/analizar', async (req, res) => {
  const { url } = req.body;
  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noDownload: true,
      noWarnings: true,
      addHeaders: [
        'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer:https://kick.com'
      ]
    });
    const duracionSegundos = info.duration || 0;
    const minutos = Math.floor(duracionSegundos / 60);
    const clips = Math.floor(duracionSegundos / 34);
    res.json({
      titulo: info.title || 'Sin titulo',
      duracion: minutos + ' minutos',
      duracionSegundos: duracionSegundos,
      streamer: info.uploader || info.channel || 'No disponible',
      clips: clips
    });
  } catch(e) {
    res.json({ error: 'No se pudo analizar el enlace: ' + e.message });
  }
});

app.post('/generar', async (req, res) => {
  const { url, duracion } = req.body;
  const totalClips = 30;
  const intervalo = Math.floor(duracion / totalClips);
  const copys = [
    'Nadie esperaba que esto pasara en el stream 😭',
    'La cara que puso lo dice todo 💀',
    'Dijo lo que todos piensan pero nadie se atreve 🔥',
    'El chat exploto con esta reaccion 😱',
    'En anos de stream nunca habia pasado esto 👀',
    'El momento exacto en que todo salio mal 💀',
    'No pude no reirme viendo esto 3 veces 😂',
    'Esto no estaba en el guion 🤯',
    'La reaccion mas epica del stream 🔥',
    'Cuando el juego te gana la partida 😭',
    'Este momento es historico 👑',
    'Nadie lo vio venir 😱',
    'El stream paro por esto 💀',
    'La comunidad enloquecio con este momento 🔥',
    'Esto solo pasa en streams de latinos 😂',
    'El momento que todos estaban esperando 👀',
    'Cuando la realidad supera la ficcion 🤯',
    'Este clip lo vas a ver mil veces 😭',
    'La mejor reaccion del ano 🏆',
    'Imposible no reirse con esto 😂',
    'El momento mas viral del stream 🔥',
    'Esto merece estar en el top 1 👑',
    'La cara de shock lo dice todo 😱',
    'Cuando todo sale exactamente mal 💀',
    'Este es el clip que necesitabas ver hoy 👀',
    'La reaccion que nadie esperaba 🤯',
    'Historico, simplemente historico 🏆',
    'El stream nunca fue igual despues de esto 😭',
    'Esto es lo que hace grande a este streamer 🔥',
    'El momento del ano sin dudas 👑'
  ];

  const clips = [];
  for (let i = 0; i < totalClips; i++) {
    const inicio = i * intervalo;
    const minutos = Math.floor(inicio / 60);
    const segundos = inicio % 60;
    clips.push({
      inicio: minutos + ':' + String(segundos).padStart(2, '0'),
      copy: copys[i] || copys[0],
      kickUrl: url + '?t=' + inicio
    });
  }
  res.json({ clips });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('ClipFlow corriendo en http://localhost:' + PORT);
});