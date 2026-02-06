(() => {
    const splash = document.getElementById('splash');
    const app = document.getElementById('app');
    const audioEl = document.getElementById('audio');
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    const trackDisplay = document.getElementById('track-display');
    const categoryMenu = document.getElementById('categoryMenu');
    let VIS_BARS = 96;

    const tracks = {
        metalizado: {
            name: "⚡ Metal",
            icon: "💀",
            color: "#FF00CC",
            songs: [
                { name: "Canibal Corpse - Scourge of Iron", file: "music/metal_1.mp3" },
                { name: "Korn - Blind", file: "music/metal_2.mp3" },
                { name: "Slipknot - Psychosocial", file: "music/metal_3.mp3" },
                { name: "System of a Down - Chop Suey", file: "music/metal_4.mp3" },
                { name: "Three Days Grace - Animal I Have Become", file: "music/metal_5.mp3" },
                { name: "Devil May Cry - Rollin", file: "music/metal_6.mp3" },
                { name: "Skillet - Monster", file: "music/metal_7.mp3" }
            ]
        },
        eletronica: {
            name: "🌌 Eletrônica",
            icon: "⚙️",
            color: "#00D9FF",
            songs: [
                { name: "Cartoon - On & On", file: "music/electronic_1.mp3" },
                { name: "David Guetta Feat. Kid Cudi - Memories", file: "music/electronic_2.mp3" },
                { name: "Erika - I Don't Know", file: "music/electronic_3.mp3" },
                { name: "Jim Yosef - Link [NCS Release]", file: "music/electronic_4.mp3" },
                { name: "Marshmello - Alone", file: "music/electronic_5.mp3" },
                { name: "Martin Garrix - Animals", file: "music/electronic_6.mp3" },
                { name: "Spektrem - Shine", file: "music/electronic_7.mp3" }
            ]
        },
        pop: {
            name: "🎵 Pop",
            icon: "🎤",
            color: "#9900FF",
            songs: [
                { name: "Calvin Harris - Feel So Close", file: "music/pop_1.mp3" },
                { name: "Lady Gaga - Judas", file: "music/pop_2.mp3" },
                { name: "Mark Ronson - Uptown Funk", file: "music/pop_3.mp3" },
                { name: "Maroon 5 - Sugar", file: "music/pop_4.mp3" },
                { name: "NSYNC - Bye Bye Bye", file: "music/pop_5.mp3" },
                { name: "OneRepublic - Counting Stars", file: "music/pop_6.mp3" },
                { name: "The Weeknd - Save Your Tears", file: "music/pop_7.mp3" }
            ]
        }
    };

    let currentCategory = null;
    let currentTrackIndex = null;
    let isPlaying = false;
    let isLooping = false;
    let categoryShuffleState = {};
    let settingsDropdown = null;
    let isDimThemeEnabled = false;

    // Constrói dinamicamente botões de categorias a partir do objeto tracks
    function generateCategoryMenu() {
        categoryMenu.innerHTML = '';
        Object.entries(tracks).forEach(([key, category]) => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.innerHTML = `<span class="category-icon">${category.icon}</span> ${category.name.split(' ')[1]}`;
            btn.onclick = (e) => {
                e.stopPropagation();
                toggleCategory(key, btn);
            };
            categoryMenu.appendChild(btn);
        });
    }

    // Abre/fecha painel de configurações com controles de volume, qualidade gráfica e tema
    function toggleSettings(btn) {
        const existing = document.querySelector('.settings-dropdown');
        if (existing) {
            existing.remove();
            btn.classList.remove('active');
            return;
        }
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const dropdown = document.createElement('ul');
        dropdown.className = 'settings-dropdown';

        // Slider de volume com atualização em tempo real do display
        const volRow = document.createElement('li');
        volRow.className = 'settings-row';
        volRow.innerHTML = `<label>Volume</label><input class="volume-slider" type="range" min="0" max="100" value="${Math.round((audioEl.volume||1)*100)}">`;
        dropdown.appendChild(volRow);
        volRow.querySelector('.volume-slider').addEventListener('input', (e) => {
            const v = e.target.value / 100;
            audioEl.volume = v;
            trackDisplay.textContent = `VOLUME: ${Math.round(v*100)}%`;
            clearTimeout(dropdown._t);
            dropdown._t = setTimeout(() => { trackDisplay.textContent = audioEl.src ? trackDisplay.textContent : 'SISTEMA PRONTO'; }, 1200);
        });

        // Botões para ajustar resolução do visualizador (afeta VIS_BARS)
        const qualRow = document.createElement('li');
        qualRow.className = 'settings-row';
        qualRow.innerHTML = `<label>Qualidade Gráfica</label><div class="quality-options">
            <button class="quality-btn" data-q="low">Baixa</button>
            <button class="quality-btn" data-q="medium">Média</button>
            <button class="quality-btn active" data-q="high">Alta</button>
        </div>`;
        dropdown.appendChild(qualRow);

        qualRow.querySelectorAll('.quality-btn').forEach(btnQ => {
            btnQ.addEventListener('click', (e) => {
                qualRow.querySelectorAll('.quality-btn').forEach(b=>b.classList.remove('active'));
                btnQ.classList.add('active');
                const q = btnQ.getAttribute('data-q');
                if (q === 'low') {
                    VIS_BARS = 48;
                } else if (q === 'medium') {
                    VIS_BARS = 72;
                } else {
                    VIS_BARS = 96;
                }
                if (analyser) {
                    smoothedData = new Array(VIS_BARS).fill(0);
                }
            });
        });

        // Toggle para alternar entre tema vibrante e modo menos saturado
        const themeRow = document.createElement('li');
        themeRow.className = 'settings-row';
        themeRow.innerHTML = `<label>Modo menos vibrante</label><div class="toggle"><input type="checkbox" id="dimToggle"><label for="dimToggle" style="color:#ccc; font-weight:700;">sim</label></div>`;
        dropdown.appendChild(themeRow);
        themeRow.querySelector('#dimToggle').addEventListener('change', (e) => {
            isDimThemeEnabled = e.target.checked;
            document.body.classList.toggle('dim-theme', e.target.checked);
        });

        document.body.appendChild(dropdown);
        settingsDropdown = dropdown;
    }

    // Abre dropdown de músicas para gênero selecionado e gerencia seleção única
    function toggleCategory(categoryKey, btnElement) {
        const categoryData = tracks[categoryKey];
        const existingDropdown = document.querySelector('.music-dropdown.active');
        
        // Toggle: segundo clique fecha dropdown aberto
        if (currentCategory === categoryKey && existingDropdown) {
            existingDropdown.remove();
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            currentCategory = null;
            return;
        }

        // Fecha dropdown anterior se houver
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Reseta estilos visuais antes de marcar novo botão
        document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
        
        // Marca botão ativo
        btnElement.classList.add('active');
        currentCategory = categoryKey;

        // Constrói novo dropdown da categoria com título
        const dropdown = document.createElement('ul');
        dropdown.className = 'music-dropdown active';

        const title = document.createElement('li');
        title.className = 'dropdown-title';
        title.textContent = categoryData.name;
        dropdown.appendChild(title);

        // Toggle para alternar modo sequencial e aleatório da categoria
        const shuffleBtn = document.createElement('li');
        shuffleBtn.className = 'shuffle-control';
        const isShuffle = categoryShuffleState[categoryKey] || false;
        shuffleBtn.innerHTML = `<button class="shuffle-btn ${isShuffle ? 'active' : ''}">🔀 ${isShuffle ? 'Aleatório' : 'Sequencial'}</button>`;
        shuffleBtn.querySelector('.shuffle-btn').onclick = (e) => {
            e.stopPropagation();
            categoryShuffleState[categoryKey] = !categoryShuffleState[categoryKey];
            e.target.textContent = categoryShuffleState[categoryKey] ? '🔀 Aleatório' : '🔀 Sequencial';
            e.target.classList.toggle('active');
        };
        dropdown.appendChild(shuffleBtn);

        categoryData.songs.forEach((song, idx) => {
            const li = document.createElement('li');
            li.className = 'music-item';
            li.innerHTML = `<div>${song.name}</div><div class="music-item-meta">🎵 Audio Track</div>`;
            li.onclick = () => loadMusic(categoryKey, idx, li);
            dropdown.appendChild(li);
        });

        document.body.appendChild(dropdown);
    }

    // Anima splash por 4s, então renderiza app e menu
    window.addEventListener('load', () => {
        setTimeout(() => {
            splash.classList.add('fade-out');
            setTimeout(() => {
                splash.style.display = 'none';
                app.classList.remove('hidden');
                generateCategoryMenu();
                setupPlayerControls();
                const settingsBtn = document.getElementById('settingsBtn');
                if (settingsBtn) settingsBtn.addEventListener('click', (e)=>{ e.stopPropagation(); toggleSettings(settingsBtn); });
            }, 1200);
        }, 4000);
    });

    // Fecha dropdowns quando clica fora deles
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.category-btn') && !e.target.closest('.music-dropdown')) {
            const dropdown = document.querySelector('.music-dropdown.active');
            if (dropdown) {
                dropdown.remove();
                document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
                currentCategory = null;
            }
        }
        // Também fecha painel de configurações
        const s = document.querySelector('.settings-dropdown');
        if (s && !e.target.closest('.settings-dropdown') && !e.target.closest('#settingsBtn')) {
            s.remove();
            document.getElementById('settingsBtn')?.classList.remove('active');
        }
    });

    let audioCtx, analyser, source;
    let smoothedData = [];
    let currentCategoryKey = null;

    // Converte segundos em formato MM:SS para display (ex: 2:45)
    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Injeta imagem como background da camada atrás do visualizador
    function setVisualizerBackground(imageUrl) {
        const bgEl = document.getElementById('visualizerBg');
        if (bgEl && imageUrl) {
            bgEl.style.backgroundImage = `url('${imageUrl}')`;
        }
    }

    // Carrega background padrão quando página abre
    window.addEventListener('load', () => {
        setVisualizerBackground('img/sunshine.jpg')
    });

    function loadMusic(categoryKey, idx, element) {
        if (!audioCtx) initAudio();
        
        const category = tracks[categoryKey];
        const song = category.songs[idx];
        
        currentCategoryKey = categoryKey;
        audioEl.src = song.file;
        audioEl.play();
        isPlaying = true;
        updatePlayPauseButton();
        trackDisplay.textContent = "TOCANDO: " + song.name.toUpperCase();
        
        // Marca visualmente qual música está tocando no dropdown
        document.querySelectorAll('.music-item').forEach((item, i) => {
            item.classList.toggle('active', item === element);
        });

        currentTrackIndex = idx;

        // Avança para próxima ou repete se loop ativado
        audioEl.onended = () => {
            if (isLooping) {
                audioEl.currentTime = 0;
                audioEl.play();
            } else {
                playNextTrack();
            }
        };
    }

    function playNextTrack() {
        if (!currentCategoryKey) return;
        const category = tracks[currentCategoryKey];
        let nextIdx = currentTrackIndex + 1;
        
        // Shuffle: índice aleatório em vez de sequencial
        if (categoryShuffleState[currentCategoryKey]) {
            nextIdx = Math.floor(Math.random() * category.songs.length);
        }
        
        // Loop de categorias: volta para primeira música ao final
        if (nextIdx >= category.songs.length) {
            nextIdx = 0;
        }
        
        // Sincroniza highlight visual do dropdown com índice real da música
        const dropdown = document.querySelector('.music-dropdown.active');
        let nextItem = null;
        if (dropdown) {
            const items = Array.from(dropdown.querySelectorAll('.music-item'));
            nextItem = items[nextIdx];
        }
        
        loadMusic(currentCategoryKey, nextIdx, nextItem);
    }

    // Inicializa Web Audio API e conecta elemento audio ao analisador
    function initAudio() {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256; // FFT reduzido para performance 60fps
        analyser.smoothingTimeConstant = 0.5; // Suaviza mudanças de frequência
        source = audioCtx.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        smoothedData = new Array(VIS_BARS).fill(0);
        draw();
    }

    // Loop principal: renderiza 96 barras de frequência sincronizadas com áudio
    function draw() {
        requestAnimationFrame(draw);
        const buffer = analyser.frequencyBinCount;
        const data = new Uint8Array(buffer);
        analyser.getByteFrequencyData(data); // Extrai espectro de frequência do áudio

        // Detecta mudanças de tamanho e redimensiona canvas (responsivo)
        const w = canvas.offsetWidth;
        const h = canvas.offsetHeight;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        ctx.clearRect(0, 0, w, h);

        // Mapeia 256 amostras FFT para 96 barras visíveis
        const numBars = VIS_BARS;
        const groupSize = Math.max(1, Math.floor(buffer / numBars));
        const gap = 0.2;
        const barWidth = Math.max(2, Math.floor((w - (numBars - 1) * gap) / numBars));
        let x = 0;
        const dimTheme = isDimThemeEnabled; // Cache para evitar lookup repetido

        for (let b = 0; b < numBars; b++) {
            // Agrupa amostras FFT: mede energia média daquela faixa de frequência
            let sum = 0;
            const start = b * groupSize;
            const end = Math.min(start + groupSize, buffer);
            for (let k = start; k < end; k++) sum += data[k];
            const avg = (end - start) ? sum / (end - start) : 0;

            // Smooth exponencial: reduz flicker mas mantém responsividade
            const prev = smoothedData[b] || 0;
            const nextVal = avg > prev ? prev * 0.6 + avg * 0.4 : prev * 0.3 + avg * 0.7;
            smoothedData[b] = nextVal;

            // Normaliza e aplica curva não-linear para mais dinamismo
            const norm = nextVal / 255;
            const barHeight = Math.pow(norm, 0.8) * h * 0.85;
            // Gradiente de cor: roxo (esquerda) → verde (direita), intensidade = energia
            const hue = 280 + (b / numBars * 60) + (norm * 40);
            // Tema dim reduz saturação/brilho para menos agressividade visual
            const sat = dimTheme ? 40 + norm * 15 : 70 + norm * 30;
            const light = dimTheme ? 28 + norm * 12 : 40 + norm * 30;
            const opac = dimTheme ? 0.15 + norm * 0.4 : 0.25 + norm * 0.75;

            const centerX = x + barWidth / 2;
            const topY = Math.max(2, h - barHeight);
            const lineW = Math.max(2, Math.min(8, barWidth * 0.4));

            ctx.lineWidth = lineW;
            ctx.lineCap = 'round'; // Arredonda topos das barras
            ctx.strokeStyle = `hsla(${hue|0}, ${sat|0}%, ${light|0}%, ${opac})`;
            
            // Brilho/glow ativado só acima de threshold para economizar GPU
            if (norm > 0.1) {
                const glow = dimTheme ? Math.min(0.4, norm * 0.3) : Math.min(0.9, norm * 0.9);
                ctx.shadowColor = `hsla(${hue|0}, 100%, 60%, ${glow})`;
                ctx.shadowBlur = dimTheme ? norm * 8 : norm * 15;
            } else {
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.moveTo(centerX, h - 2);
            ctx.lineTo(centerX, topY);
            ctx.stroke();

            x += barWidth + gap;
        }
        ctx.shadowColor = 'transparent';
    }

    // Atualiza ícone play/pausa baseado em estado de reprodução
    function updatePlayPauseButton() {
        const btn = document.getElementById('playPauseBtn');
        const icon = document.getElementById('playPauseIcon');
        if (isPlaying) {
            icon.textContent = '⏸';
            btn.classList.add('active');
        } else {
            icon.textContent = '▶';
            btn.classList.remove('active');
        }
    }

    function togglePlayPause() {
        if (!audioEl.src) return;
        if (isPlaying) {
            audioEl.pause();
            isPlaying = false;
        } else {
            audioEl.play();
            isPlaying = true;
        }
        updatePlayPauseButton();
    }

    function skipForward() {
        audioEl.currentTime = Math.min(audioEl.currentTime + 10, audioEl.duration);
    }

    function skipBackward() {
        audioEl.currentTime = Math.max(audioEl.currentTime - 10, 0);
    }

    function toggleLoop() {
        isLooping = !isLooping;
        const btn = document.getElementById('loopBtn');
        btn.classList.toggle('active');
    }

    // Vincula botões de controle aos eventos e gerencia sincronismo de tempo
    function setupPlayerControls() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const loopBtn = document.getElementById('loopBtn');
        const progressBar = document.getElementById('progressBar');
        const currentTimeEl = document.getElementById('currentTime');
        const durationEl = document.getElementById('duration');

        playPauseBtn.addEventListener('click', togglePlayPause);
        prevBtn.addEventListener('click', skipBackward);
        nextBtn.addEventListener('click', skipForward);
        loopBtn.addEventListener('click', toggleLoop);

        // Carrega duração total quando metadados disponíveis
        audioEl.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(audioEl.duration);
            progressBar.max = audioEl.duration || 100;
        });

        // Sincroniza display e barra de progresso a cada 100ms aprox
        audioEl.addEventListener('timeupdate', () => {
            currentTimeEl.textContent = formatTime(audioEl.currentTime);
            progressBar.value = audioEl.currentTime;
        });

        // Permite scrubbing: clique na barra = pula para posição
        progressBar.addEventListener('input', (e) => {
            audioEl.currentTime = e.target.value;
            currentTimeEl.textContent = formatTime(audioEl.currentTime);
        });

        // Atualiza visual quando play/pause mudam
        audioEl.addEventListener('play', () => {
            isPlaying = true;
            updatePlayPauseButton();
        });
        audioEl.addEventListener('pause', () => {
            isPlaying = false;
            updatePlayPauseButton();
        });
    }
})();