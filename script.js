// Main application script - execute immediately
(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    
    // If loading screen doesn't exist, nothing to do
    if (!loadingScreen) return;
    
    const startTime = Date.now();
    const minimumDisplayTime = 4000; // 4 seconds minimum
    
    console.log('Loading screen script started at:', startTime);
    
    function hideLoadingScreen() {
        const elapsedTime = Date.now() - startTime;
        console.log('Hiding loading screen after:', elapsedTime + 'ms');
        
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            if (loadingScreen.parentNode) {
                loadingScreen.remove();
            }
        }, 1000);
    }
    
    // Force hide after minimum time regardless of load state
    setTimeout(() => {
        hideLoadingScreen();
    }, minimumDisplayTime);
    
    // Also hide when window is fully loaded (if it takes longer)
    window.addEventListener('load', () => {
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime >= minimumDisplayTime) {
            hideLoadingScreen();
        }
    });
})();

class AudioPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.progressBar = document.getElementById('progressBar');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.volumeBtn = document.getElementById('volumeBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.canvas = document.getElementById('audioCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.trackTitle = document.querySelector('.track-title');
        this.trackInfo = null;
        
        this.playlist = [
            {
                title: 'The Hollow Choir',
                file: 'Audio/The_Hollow_Choir.mp3',
                cover: 'assets/The_Hollow_Choir.png',
                duration: 0,
                isDefault: true
            },
            {
                title: 'The Hollow Throne',
                file: 'Audio/The_Hollow_Throne.mp3',
                cover: 'assets/The_Hollow_Throne.png',
                duration: 0,
                isDefault: true
            },
            {
                title: 'Burning Out',
                file: 'Audio/Burning_Out.mp3',
                cover: 'assets/Burning_Out.png',
                duration: 0,
                isDefault: true
            },
            {
                title: 'The Last Ride Home',
                file: 'Audio/The_Last_Ride_Home.mp3',
                cover: 'assets/The_Last_Ride_Home.png',
                duration: 0,
                isDefault: true
            },
            {
                title: 'Ride The Storm',
                file: 'Audio/Ride_The_Storm.mp3',
                cover: 'assets/Ride_The_Storm.png',
                duration: 0,
                isDefault: true
            }
        ];
        
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        
        // Settings properties
        this.visualizerMode = 'bars';
        this.visualizerColorMode = 'gradient';
        this.crossfadeDuration = 2;
        
        this.initializeAudio();
        this.setupEventListeners();
        this.setupCanvas();
        this.updateTrackDisplay();
        this.setupPlaylist();
        this.loadTrack();
        this.setupSettings();
    }
    
    initializeAudio() {
        this.audio.volume = 0.7;
        this.volumeSlider.value = 70;
        
        this.audio.addEventListener('loadedmetadata', () => {
            this.durationEl.textContent = this.formatTime(this.audio.duration);
        });
        
        this.audio.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
        
        this.audio.addEventListener('ended', () => {
            this.nextTrack();
        });
    }
    
    setupEventListeners() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        
        let isDragging = false;
        
        const updateProgress = (e) => {
            const rect = this.progressBar.parentElement.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            this.audio.currentTime = percent * this.audio.duration;
        };
        
        this.progressBar.parentElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            updateProgress(e);
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                updateProgress(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        this.volumeBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => {
            this.audio.volume = e.target.value / 100;
            this.updateVolumeIcon();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlayPause();
            } else if (e.code === 'ArrowLeft') {
                if (e.shiftKey) {
                    this.previousTrack();
                } else {
                    this.skipBackward();
                }
            } else if (e.code === 'ArrowRight') {
                if (e.shiftKey) {
                    this.nextTrack();
                } else {
                    this.skipForward();
                }
            }
        });
    }
    
    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    async play() {
        try {
            await this.audio.play();
            this.isPlaying = true;
            this.playPauseBtn.querySelector('.icon').textContent = '⏸';
            document.querySelector('.vinyl-record').classList.add('spinning');
            
            if (!this.audioContext) {
                this.setupAudioContext();
            }
            
            this.updatePlaylistVisualState();
            this.visualize();
        } catch (error) {
            console.error('Audio playback failed:', error);
        }
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playPauseBtn.querySelector('.icon').textContent = '▶';
        document.querySelector('.vinyl-record').classList.remove('spinning');
        
        this.updatePlaylistVisualState();
    }
    
    skipBackward() {
        this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
    }
    
    skipForward() {
        this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 10);
    }
    
    previousTrack() {
        if (this.audio.currentTime > 3) {
            this.audio.currentTime = 0;
        } else {
            this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
            this.loadTrack();
        }
    }
    
    nextTrack() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        this.loadTrack();
    }
    
    loadTrack() {
        const track = this.playlist[this.currentTrackIndex];
        this.audio.src = track.file;
        this.updateTrackDisplay();
        this.audio.load();
        
        if (this.isPlaying) {
            this.audio.play();
        }
    }
    
    updateTrackDisplay() {
        const track = this.playlist[this.currentTrackIndex];
        this.trackTitle.textContent = track.title;
        
        // Remove track info element if it exists
        if (this.trackInfo && this.trackInfo.parentNode) {
            this.trackInfo.parentNode.removeChild(this.trackInfo);
            this.trackInfo = null;
        }
        
        // Update cover art
        const vinylRecord = document.querySelector('.vinyl-record');
        if (vinylRecord && track.cover) {
            vinylRecord.style.backgroundImage = `url('${track.cover}'), radial-gradient(circle at center, #1a1a1a 0%, #333 30%, #1a1a1a 31%, #333 60%, #1a1a1a 61%, #333 100%)`;
            vinylRecord.style.backgroundSize = 'cover, auto';
            vinylRecord.style.backgroundPosition = 'center, center';
            vinylRecord.style.backgroundRepeat = 'no-repeat, repeat';
        }
        
        // Update playlist visual state
        this.updatePlaylistVisualState();
    }
    
    updateProgress() {
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressBar.style.width = percent + '%';
        this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
    }
    
    toggleMute() {
        if (this.audio.muted) {
            this.audio.muted = false;
            this.volumeSlider.value = this.audio.volume * 100;
        } else {
            this.audio.muted = true;
            this.volumeSlider.value = 0;
        }
        this.updateVolumeIcon();
    }
    
    updateVolumeIcon() {
        const icon = this.volumeBtn.querySelector('.icon');
        if (this.audio.muted) {
            icon.textContent = '🔇';
        } else {
            icon.textContent = '🔊';
        }
    }
    
    setupPlaylist() {
        const playlistContainer = document.getElementById('playlistItems');
        
        this.playlist.forEach((track, index) => {
            const li = document.createElement('li');
            li.dataset.index = index;
            
            // Create cover image container
            const coverContainer = document.createElement('div');
            coverContainer.className = 'playlist-cover';
            const coverImg = document.createElement('img');
            coverImg.src = track.cover;
            coverImg.alt = track.title;
            coverImg.className = 'playlist-cover-img';
            coverContainer.appendChild(coverImg);
            
            // Create title container
            const titleContainer = document.createElement('div');
            titleContainer.className = 'playlist-title';
            const titleSpan = document.createElement('span');
            titleSpan.textContent = track.title;
            titleContainer.appendChild(titleSpan);
            
            // Add elements to list item
            li.appendChild(coverContainer);
            li.appendChild(titleContainer);
            
            li.addEventListener('click', () => {
                this.selectTrack(index);
            });
            
            playlistContainer.appendChild(li);
        });
        
        // Set initial visual state
        this.updatePlaylistVisualState();
    }
    
    updatePlaylistVisualState() {
        const playlistItems = document.querySelectorAll('#playlistItems li');
        
        playlistItems.forEach((item, index) => {
            item.classList.remove('active', 'playing');
            
            if (index === this.currentTrackIndex) {
                item.classList.add('active');
                if (this.isPlaying) {
                    item.classList.add('playing');
                }
            }
        });
    }
    
    selectTrack(index) {
        if (index >= 0 && index < this.playlist.length) {
            this.currentTrackIndex = index;
            this.loadTrack();
            this.play();
        }
    }
    
    setupSettings() {
        // Load saved theme
        const savedTheme = localStorage.getItem('hollowTheme') || 'dark';
        this.applyTheme(savedTheme);
        this.updateThemeSelection(savedTheme);
        
        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettings();
        });
        
        // Close settings
        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettings();
        });
        
        // Close on backdrop click
        document.querySelector('.settings-backdrop').addEventListener('click', () => {
            this.closeSettings();
        });
        
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Theme selection
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.applyTheme(theme);
                this.updateThemeSelection(theme);
                localStorage.setItem('hollowTheme', theme);
            });
        });
        
        // Crossfade slider
        const crossfadeSlider = document.getElementById('crossfadeSlider');
        const crossfadeValue = document.getElementById('crossfadeValue');
        if (crossfadeSlider && crossfadeValue) {
            crossfadeSlider.addEventListener('input', (e) => {
                this.crossfadeDuration = parseFloat(e.target.value);
                crossfadeValue.textContent = `${this.crossfadeDuration}s`;
                localStorage.setItem('hollowCrossfade', this.crossfadeDuration);
            });
            crossfadeSlider.value = this.crossfadeDuration;
            crossfadeValue.textContent = `${this.crossfadeDuration}s`;
        }
        
        // Equalizer select
        const equalizerSelect = document.getElementById('equalizerSelect');
        if (equalizerSelect) {
            equalizerSelect.addEventListener('change', (e) => {
                // TODO: Implement equalizer logic
                console.log('Equalizer changed to:', e.target.value);
            });
        }
        
        // Visualizer settings
        this.updateVisualizerMode();
    }
    
    setupCanvas() {
        this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
        this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
            this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        });
    }
    
    setupAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }
    setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            // Resume context if it was suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Create audio source and connect analyser
            this.source = this.audioContext.createMediaElementSource(this.audio);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            // Initialize data array for frequency analysis
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            
            console.log('Audio context setup successful');
        } catch (error) {
            console.error('Audio context setup failed:', error);
        }
    }
    
    updateVisualizerMode() {
        // Add visualizer mode switching
        const visualizerStyle = document.getElementById('visualizerStyle');
        const visualizerColor = document.getElementById('visualizerColor');
        
        if (visualizerStyle) {
            visualizerStyle.addEventListener('change', (e) => {
                this.visualizerMode = e.target.value;
                localStorage.setItem('hollowVisualizerMode', e.target.value);
            });
            
            visualizerStyle.value = this.visualizerMode || 'bars';
        }
        
        if (visualizerColor) {
            visualizerColor.addEventListener('change', (e) => {
                this.visualizerColorMode = e.target.value;
                localStorage.setItem('hollowVisualizerColorMode', e.target.value);
            });
            
            visualizerColor.value = this.visualizerColorMode || 'gradient';
        }
    }
    
    visualize() {
        if (!this.isPlaying) return;
        
        requestAnimationFrame(() => this.visualize());
        
        if (!this.analyser) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const bufferLength = this.analyser.frequencyBinCount;
        let barWidth, barHeight;
        let x = 0;
        
        // Different visualization modes
        if (this.visualizerMode === 'wave') {
            // Wave visualization
            this.ctx.fillStyle = 'rgba(22, 33, 62, 0.2)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.strokeStyle = this.getVisualizerColor();
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            const sliceWidth = this.canvas.width / bufferLength;
            for (let i = 0; i < bufferLength; i++) {
                const v = this.dataArray[i] / 128.0;
                const y = v * this.canvas.height;
                
                if (i === 0) {
                    this.ctx.moveTo(0, y);
                } else {
                    this.ctx.lineTo(i * sliceWidth, y);
                }
            }
            
            this.ctx.stroke();
        } else if (this.visualizerMode === 'circular') {
            // Circular visualization
            this.ctx.fillStyle = 'rgba(22, 33, 62, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const radius = Math.min(centerX, centerY) - 50;
            
            for (let i = 0; i < bufferLength; i += 8) {
                const amplitude = this.dataArray[i] / 255;
                const angle = (i / bufferLength) * Math.PI * 2;
                const x1 = centerX + Math.cos(angle) * radius * amplitude;
                const y1 = centerY + Math.sin(angle) * radius * amplitude * 0.8;
                const x2 = centerX + Math.cos(angle + 0.1) * radius * amplitude;
                const y2 = centerY + Math.sin(angle + 0.1) * radius * amplitude * 0.8;
                
                this.ctx.strokeStyle = this.getVisualizerColor();
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY);
                this.ctx.lineTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        } else {
            // Default bars visualization
            const barWidth = (this.canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
            
            this.ctx.fillStyle = 'rgba(22, 33, 62, 0.2)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            for (let i = 0; i < bufferLength; i++) {
                barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.7;
                
                if (this.visualizerColorMode === 'gradient') {
                    const gradient = this.ctx.createLinearGradient(0, this.canvas.height - barHeight, 0, this.canvas.height);
                    gradient.addColorStop(0, '#e94560');
                    gradient.addColorStop(0.5, '#8b5cf6');
                    gradient.addColorStop(1, '#667eea');
                    this.ctx.fillStyle = gradient;
                } else {
                    this.ctx.fillStyle = this.getVisualizerColor();
                }
                
                this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth - 2, barHeight);
                
                x += barWidth;
            }
        }
    }
    
    getVisualizerColor() {
        if (this.visualizerColorMode === 'rainbow') {
            return `hsl(${(Date.now() / 50) % 360}, 70%, 60%)`;
        } else if (this.visualizerColorMode === 'solid') {
            return '#8b5cf6';
        } else {
            return '#667eea';
        }
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
    }
    
    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });
        
        // Update panels
        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === tabName + '-panel') {
                panel.classList.add('active');
            }
        });
    }
    
    updateThemeSelection(themeName) {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.theme === themeName) {
                option.classList.add('selected');
            }
        });
    }
    
    applyTheme(themeName) {
        document.documentElement.setAttribute('data-theme', themeName);
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
}

class InteractiveEffects {
    constructor() {
        this.setupScrollEffects();
        this.setupParallax();
        this.setupHoverEffects();
        this.setupSmoothScrolling();
    }
    
    setupScrollEffects() {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const parallaxElements = document.querySelectorAll('');
            
            parallaxElements.forEach(element => {
                const speed = element.dataset.speed || 0.5;
                element.style.transform = `translateY(${scrolled * speed}px)`;
            });
        });
    }
    
    setupParallax() {
        // Parallax effect for hero section - disabled to keep hero fixed
        // const heroSection = document.querySelector('.hero-section');
        // if (heroSection) {
        //     window.addEventListener('scroll', () => {
        //         const scrolled = window.pageYOffset;
        //         heroSection.style.transform = `translateY(${scrolled * 0.5}px)`;
        //     });
        // }
    }
    
    setupHoverEffects() {
        // Add hover effects to buttons and links
        const buttons = document.querySelectorAll('.control-btn, .cta-button, .nav-links a');
        
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.1)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
            });
        });
    }
    
    setupSmoothScrolling() {
        // Smooth scrolling for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

class RhythmGame {
    constructor() {
        this.gameAudio = new Audio();
        this.gameAudio.src = 'Audio/The_Last_Ride_Home.mp3';
        this.gameAudio.volume = 0.5;
        
        this.score = 0;
        this.combo = 0;
        this.highCombo = parseInt(localStorage.getItem('hollowHighCombo') || '0');
        
        this.gameInterval = null;
        this.animationId = null;
        this.notes = [];
        this.isGameActive = false;
        this.noteSpeed = 2;
        
        this.setupGameElements();
        this.setupGameEventListeners();
        this.updateHighComboDisplay();
    }
    
    setupGameElements() {
        this.gameBoard = document.querySelector('.game-board');
        this.gameLanes = document.querySelectorAll('.lane');
        this.scoreEl = document.getElementById('gameScore');
        this.comboEl = document.getElementById('gameCombo');
        this.highComboEl = document.getElementById('gameHighCombo');
        this.startGameBtn = document.getElementById('startGameBtn');
        this.gameMessage = document.getElementById('gameMessage');
    }
    
    setupGameEventListeners() {
        this.startGameBtn.addEventListener('click', () => {
            if (this.isGameActive) {
                this.stopGame();
            } else {
                this.startGame();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (this.isGameActive) {
                this.handleKeyPress(e.key);
            }
        });
    }
    
    startGame() {
        this.gameAudio.currentTime = 0;
        this.score = 0;
        this.combo = 0;
        this.isGameActive = true;
        this.notes = [];
        
        // Clear any existing notes
        this.clearNotes();
        
        this.gameInterval = setInterval(() => {
            this.generateNote();
        }, 800);
        
        this.startGameBtn.textContent = 'Stop Game';
        this.gameMessage.textContent = 'Game started! Press D, F, J, K to hit notes.';
        
        this.gameAudio.play();
        this.updateScore();
        
        // Start animation loop
        this.animate();
    }
    
    stopGame() {
        this.isGameActive = false;
        clearInterval(this.gameInterval);
        cancelAnimationFrame(this.animationId);
        
        this.gameAudio.pause();
        this.startGameBtn.textContent = 'Start Game';
        this.gameMessage.textContent = `Game stopped! Final Score: ${this.score}`;
        
        // Clear remaining notes
        this.clearNotes();
    }
    
    generateNote() {
        const lanes = ['d', 'f', 'j', 'k'];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        
        const note = {
            lane: lane,
            y: -30,
            hit: false,
            element: null
        };
        
        // Create visual note element
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        noteElement.textContent = lane.toUpperCase();
        noteElement.style.top = note.y + 'px';
        noteElement.dataset.lane = lane;
        
        // Add to lane instead of game board
        const laneElement = document.querySelector(`.lane[data-key="${lane}"]`);
        if (laneElement) {
            laneElement.appendChild(noteElement);
        }
        
        note.element = noteElement;
        this.notes.push(note);
    }
    
    animate() {
        if (!this.isGameActive) return;
        
        // Update note positions
        this.notes.forEach((note, index) => {
            if (!note.hit && note.element) {
                note.y += this.noteSpeed;
                note.element.style.top = note.y + 'px';
                
                // Remove notes that have gone off screen
                if (note.y > 400) {
                    if (!note.hit) {
                        this.combo = 0; // Reset combo on miss
                        this.updateScore();
                    }
                    note.element.remove();
                    this.notes.splice(index, 1);
                }
            }
        });
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    handleKeyPress(key) {
        const lane = key.toLowerCase();
        
        if (['d', 'f', 'j', 'k'].includes(lane)) {
            this.checkNoteHit(lane);
        }
    }
    
    checkNoteHit(lane) {
        const hitZoneMin = 320;
        const hitZoneMax = 380;
        
        // Find the closest note in the correct lane
        let closestNote = null;
        let closestDistance = Infinity;
        
        this.notes.forEach(note => {
            if (note.lane === lane && !note.hit && note.y >= hitZoneMin - 50 && note.y <= hitZoneMax + 50) {
                const distance = Math.abs(note.y - (hitZoneMin + hitZoneMax) / 2);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestNote = note;
                }
            }
        });
        
        if (closestNote && closestDistance < 40) {
            closestNote.hit = true;
            this.score += 10;
            this.combo++;
            
            // Add hit animation
            closestNote.element.classList.add('perfect');
            
            // Flash the lane key
            const laneKey = document.querySelector(`.lane[data-key="${lane}"] .lane-key`);
            if (laneKey) {
                laneKey.classList.add('active');
                setTimeout(() => {
                    laneKey.classList.remove('active');
                }, 100);
            }
            
            // Create hit effect
            this.createHitEffect(lane, closestNote.element);
            
            // Remove note after animation
            setTimeout(() => {
                if (closestNote.element && closestNote.element.parentNode) {
                    closestNote.element.remove();
                }
                const index = this.notes.indexOf(closestNote);
                if (index > -1) {
                    this.notes.splice(index, 1);
                }
            }, 500);
            
            this.updateScore();
        }
    }
    
    createHitEffect(lane, noteElement) {
        const hitEffect = document.createElement('div');
        hitEffect.className = 'hit-effect';
        hitEffect.textContent = '+10';
        hitEffect.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            color: #10b981;
            font-weight: bold;
            font-size: 1.5rem;
            z-index: 100;
            animation: float-up 1s ease-out forwards;
        `;
        
        const laneElement = document.querySelector(`.lane[data-key="${lane}"]`);
        if (laneElement) {
            laneElement.appendChild(hitEffect);
            
            setTimeout(() => {
                if (hitEffect.parentNode) {
                    hitEffect.remove();
                }
            }, 1000);
        }
    }
    
    clearNotes() {
        // Remove all note elements
        this.notes.forEach(note => {
            if (note.element && note.element.parentNode) {
                note.element.remove();
            }
        });
        this.notes = [];
        
        // Remove any remaining hit effects
        const hitEffects = this.gameBoard.querySelectorAll('.hit-effect');
        hitEffects.forEach(effect => effect.remove());
    }
    
    updateScore() {
        this.scoreEl.textContent = this.score;
        this.comboEl.textContent = this.combo + 'x';
        
        if (this.combo > this.highCombo) {
            this.highCombo = this.combo;
            localStorage.setItem('hollowHighCombo', this.combo.toString());
        }
        
        this.updateHighComboDisplay();
    }
    
    updateHighComboDisplay() {
        this.highComboEl.textContent = this.highCombo + 'x';
    }
}

class BandMemberSounds {
    constructor() {
        this.members = [
            {
                name: 'vocalist',
                soundFile: 'Sound Effects/Vocalist.mp3',
                element: '.member-card:nth-child(1) .member-avatar'
            },
            {
                name: 'guitarist',
                soundFile: 'Sound Effects/Guitarist.mp3',
                element: '.member-card:nth-child(2) .member-avatar'
            },
            {
                name: 'pianist',
                soundFile: 'Sound Effects/Pianist.mp3',
                element: '.member-card:nth-child(3) .member-avatar'
            },
            {
                name: 'drummist',
                soundFile: 'Sound Effects/Drummist.mp3',
                element: '.member-card:nth-child(4) .member-avatar'
            }
        ];
        
        this.setupMemberClicks();
    }
    
    setupMemberClicks() {
        this.members.forEach(member => {
            const element = document.querySelector(member.element);
            if (element) {
                element.addEventListener('click', () => {
                    this.playMemberSound(member.soundFile);
                });
            }
        });
    }
    
    playMemberSound(soundFile) {
        const audio = new Audio(soundFile);
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Sound effect play failed:', e));
    }
}

class NewsletterForm {
    constructor() {
        this.form = document.getElementById('newsletterForm');
        this.setupFormListener();
    }
    
    setupFormListener() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });
    }
    
    handleSubmit() {
        const emailInput = this.form.querySelector('input[type="email"]');
        const email = emailInput.value;
        
        if (email && email.includes('@')) {
            const message = `Thank you for subscribing, ${email}! You'll receive updates about The Hollow Choir.`;
            alert(message);
            
            // Store in localStorage
            const subscribers = JSON.parse(localStorage.getItem('hollowSubscribers') || '[]');
            subscribers.push(email);
            localStorage.setItem('hollowSubscribers', JSON.stringify(subscribers));
            
            // Reset form
            this.form.reset();
            emailInput.value = '';
        } else {
            alert('Please enter a valid email address.');
        }
    }
}

class FunInteractions {
    constructor() {
        this.secretMode = false;
        this.partyMode = false;
        this.logoClicks = 0;
        this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        this.konamiIndex = 0;
        
        this.setupKonamiCode();
        this.setupLogoInteractions();
        this.setupPartyMode();
        this.setupClickEffects();
        this.setupLogoHover();
    }
    
    setupKonamiCode() {
        document.addEventListener('keydown', (e) => {
            // Konami Code
            if (e.key === this.konamiCode[this.konamiIndex]) {
                this.konamiIndex++;
                if (this.konamiIndex === this.konamiCode.length) {
                    this.activateSecretMode();
                    this.konamiIndex = 0;
                }
            } else {
                this.konamiIndex = 0;
            }
        });
    }
    
    setupLogoInteractions() {
        const topLogo = document.querySelector('.logo');
        const heroLogo = document.querySelector('.band-name');
        
        if (topLogo) {
            topLogo.addEventListener('click', () => {
                this.logoClicks++;
                if (this.logoClicks >= 3) {
                    this.danceLogo();
                    this.logoClicks = 0;
                }
            });
        }
    }
    
    setupLogoHover() {
        const heroLogo = document.querySelector('.band-name');
        if (heroLogo) {
            heroLogo.addEventListener('mouseenter', () => {
                heroLogo.style.textShadow = '0 0 30px #8b5cf6, 0 0 60px #8b5cf6, 0 0 90px #8b5cf6';
                heroLogo.style.transform = 'scale(1.05)';
                heroLogo.style.transition = 'all 0.3s ease';
            });
            
            heroLogo.addEventListener('mouseleave', () => {
                heroLogo.style.textShadow = '';
                heroLogo.style.transform = '';
            });
        }
    }
    
    setupPartyMode() {
        document.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.key === 'P') {
                this.togglePartyMode();
            }
        });
    }
    
    setupClickEffects() {
        // Single click - musical emojis
        document.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('a')) return;
            this.showMusicalEmoji(e.clientX, e.clientY);
        });
        
        // Double click - fireworks
        document.addEventListener('dblclick', (e) => {
            if (e.target.closest('button') || e.target.closest('a')) return;
            this.createFirework(e.clientX, e.clientY);
        });
    }
    
    activateSecretMode() {
        this.secretMode = true;
        document.body.classList.add('secret-mode');
        
        const notification = document.createElement('div');
        notification.className = 'secret-notification';
        notification.textContent = '🎵 SECRET MODE ACTIVATED! 🎵';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
            color: white;
            padding: 20px 40px;
            border-radius: 20px;
            font-size: 24px;
            font-weight: bold;
            z-index: 10000;
            animation: secret-notify 3s ease-out forwards;
        `;
        
        const notifyStyle = document.createElement('style');
        notifyStyle.textContent = `
            @keyframes secret-notify {
                0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 0; }
                50% { transform: translate(-50%, -50%) scale(1.2) rotate(180deg); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1) rotate(360deg); opacity: 0; }
            }
            .secret-mode { animation: rainbow-bg 3s linear infinite; }
            @keyframes rainbow-bg {
                0% { filter: hue-rotate(0deg); }
                100% { filter: hue-rotate(360deg); }
            }
        `;
        document.head.appendChild(notifyStyle);
        
        document.body.appendChild(notification);
        
        this.createConfettiRain();
        
        setTimeout(() => {
            document.body.classList.remove('secret-mode');
            this.secretMode = false;
        }, 8000);
    }
    
    createConfettiRain() {
        const colors = ['#e94560', '#8b5cf6', '#667eea', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
        
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'firework-particle';
                confetti.style.cssText = `
                    position: fixed;
                    left: ${Math.random() * 100}%;
                    top: -20px;
                    width: 10px;
                    height: 10px;
                    background: ${colors[Math.floor(Math.random() * colors.length)]};
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 9999;
                    animation: fall ${2 + Math.random() * 2}s linear forwards;
                `;
                
                if (!document.querySelector('.confetti-styles')) {
                    const style = document.createElement('style');
                    style.className = 'confetti-styles';
                    style.textContent = `
                        @keyframes fall {
                            to {
                                transform: translateY(100vh) rotate(360deg);
                                opacity: 0;
                            }
                        }
                        .firework-particle {
                            position: fixed;
                            pointer-events: none;
                            z-index: 9999;
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 4000);
            }, i * 100);
        }
    }
    
    danceLogo() {
        const logos = document.querySelectorAll('.logo, .band-name');
        logos.forEach(logo => {
            logo.style.animation = 'logo-dance 2s ease-in-out';
            setTimeout(() => {
                logo.style.animation = '';
            }, 2000);
        });
        
        const danceStyle = document.createElement('style');
        danceStyle.textContent = `
            @keyframes logo-dance {
                0%, 100% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(-10deg) scale(1.1); }
                50% { transform: rotate(10deg) scale(1.2); }
                75% { transform: rotate(-5deg) scale(1.1); }
            }
        `;
        document.head.appendChild(danceStyle);
    }
    
    togglePartyMode() {
        this.partyMode = !this.partyMode;
        
        if (this.partyMode) {
            document.body.classList.add('party-mode');
            this.intenseRainbowFlash();
            
            const notification = document.createElement('div');
            notification.textContent = '🎉 PARTY MODE ACTIVATED! 🎉';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #ff6b6b, #4ecdc4, #667eea);
                color: white;
                padding: 15px 25px;
                border-radius: 15px;
                font-weight: bold;
                z-index: 10000;
                animation: slide-in 0.5s ease-out;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        } else {
            document.body.classList.remove('party-mode');
            this.stopPartyEffects();
        }
    }
    
    intenseRainbowFlash() {
        document.body.classList.add('intense-rainbow');
        
        const rainbowStyle = document.createElement('style');
        rainbowStyle.className = 'rainbow-flash-style';
        rainbowStyle.textContent = `
            .intense-rainbow {
                animation: intense-rainbow-flash 6s linear !important;
            }
            @keyframes intense-rainbow-flash {
                0% { filter: hue-rotate(0deg) brightness(2) saturate(3); }
                2% { filter: hue-rotate(15deg) brightness(2.5) saturate(4); }
                4% { filter: hue-rotate(30deg) brightness(2.2) saturate(3.5); }
                6% { filter: hue-rotate(45deg) brightness(2.8) saturate(4.5); }
                8% { filter: hue-rotate(60deg) brightness(2.3) saturate(3.8); }
                10% { filter: hue-rotate(75deg) brightness(3) saturate(5); }
                12% { filter: hue-rotate(90deg) brightness(2.4) saturate(4); }
                14% { filter: hue-rotate(105deg) brightness(2.9) saturate(4.8); }
                16% { filter: hue-rotate(120deg) brightness(2.5) saturate(4.2); }
                18% { filter: hue-rotate(135deg) brightness(3.2) saturate(5.5); }
                20% { filter: hue-rotate(150deg) brightness(2.6) saturate(4.4); }
                22% { filter: hue-rotate(165deg) brightness(3.1) saturate(5.2); }
                24% { filter: hue-rotate(180deg) brightness(2.7) saturate(4.6); }
                26% { filter: hue-rotate(195deg) brightness(3.3) saturate(5.8); }
                28% { filter: hue-rotate(210deg) brightness(2.8) saturate(4.8); }
                30% { filter: hue-rotate(225deg) brightness(3.4) saturate(6); }
                32% { filter: hue-rotate(240deg) brightness(2.9) saturate(5); }
                34% { filter: hue-rotate(255deg) brightness(3.5) saturate(6.2); }
                36% { filter: hue-rotate(270deg) brightness(3) saturate(5.2); }
                38% { filter: hue-rotate(285deg) brightness(3.6) saturate(6.4); }
                40% { filter: hue-rotate(300deg) brightness(3.1) saturate(5.4); }
                42% { filter: hue-rotate(315deg) brightness(3.7) saturate(6.6); }
                44% { filter: hue-rotate(330deg) brightness(3.2) saturate(5.6); }
                46% { filter: hue-rotate(345deg) brightness(3.8) saturate(6.8); }
                48% { filter: hue-rotate(360deg) brightness(3.3) saturate(5.8); }
                50% { filter: hue-rotate(15deg) brightness(3.9) saturate(7); }
                52% { filter: hue-rotate(30deg) brightness(3.4) saturate(6); }
                54% { filter: hue-rotate(45deg) brightness(4) saturate(7.2); }
                56% { filter: hue-rotate(60deg) brightness(3.5) saturate(6.2); }
                58% { filter: hue-rotate(75deg) brightness(4.1) saturate(7.4); }
                60% { filter: hue-rotate(90deg) brightness(3.6) saturate(6.4); }
                62% { filter: hue-rotate(105deg) brightness(4.2) saturate(7.6); }
                64% { filter: hue-rotate(120deg) brightness(3.7) saturate(6.6); }
                66% { filter: hue-rotate(135deg) brightness(4.3) saturate(7.8); }
                68% { filter: hue-rotate(150deg) brightness(3.8) saturate(6.8); }
                70% { filter: hue-rotate(165deg) brightness(4.4) saturate(8); }
                72% { filter: hue-rotate(180deg) brightness(3.9) saturate(7); }
                74% { filter: hue-rotate(195deg) brightness(4.5) saturate(8.2); }
                76% { filter: hue-rotate(210deg) brightness(4) saturate(7.2); }
                78% { filter: hue-rotate(225deg) brightness(4.6) saturate(8.4); }
                80% { filter: hue-rotate(240deg) brightness(4.1) saturate(7.4); }
                82% { filter: hue-rotate(255deg) brightness(4.7) saturate(8.6); }
                84% { filter: hue-rotate(270deg) brightness(4.2) saturate(7.6); }
                86% { filter: hue-rotate(285deg) brightness(4.8) saturate(8.8); }
                88% { filter: hue-rotate(300deg) brightness(4.3) saturate(7.8); }
                90% { filter: hue-rotate(315deg) brightness(4.9) saturate(9); }
                92% { filter: hue-rotate(330deg) brightness(4.4) saturate(8); }
                94% { filter: hue-rotate(345deg) brightness(5) saturate(9.2); }
                96% { filter: hue-rotate(360deg) brightness(4.5) saturate(8.2); }
                100% { filter: hue-rotate(360deg) brightness(1) saturate(1); }
            }
        `;
        document.head.appendChild(rainbowStyle);
        
        setTimeout(() => {
            document.body.classList.remove('intense-rainbow');
            rainbowStyle.remove();
        }, 6000);
    }
    

    
    createRandomBurst() {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        this.createFirework(x, y);
    }
    
    showMusicalEmoji(x, y) {
        const emojis = ['🎵', '🎶', '🎤', '🎸', '🎹', '🥁', '🎺', '🎻', '🎷'];
        const emoji = document.createElement('div');
        emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        emoji.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: 24px;
            pointer-events: none;
            z-index: 9999;
            animation: emoji-float 2s ease-out forwards;
        `;
        
        const emojiStyle = document.createElement('style');
        if (!document.querySelector('.emoji-styles')) {
            emojiStyle.className = 'emoji-styles';
            emojiStyle.textContent = `
                @keyframes emoji-float {
                    0% { transform: translateY(0) scale(0); opacity: 1; }
                    50% { transform: translateY(-50px) scale(1.5); opacity: 1; }
                    100% { transform: translateY(-100px) scale(1); opacity: 0; }
                }
            `;
            document.head.appendChild(emojiStyle);
        }
        
        document.body.appendChild(emoji);
        setTimeout(() => emoji.remove(), 2000);
    }
    
    createFirework(x, y) {
        const colors = ['#ff6b6b', '#4ecdc4', '#667eea', '#10b981', '#f59e0b', '#ef4444'];
        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'firework-particle';
            
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = 5 + Math.random() * 5;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            
            particle.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                width: 6px;
                height: 6px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                box-shadow: 0 0 6px ${colors[Math.floor(Math.random() * colors.length)]};
            `;
            
            if (!document.querySelector('.firework-styles')) {
                const style = document.createElement('style');
                style.className = 'firework-styles';
                style.textContent = `
                    .firework-particle {
                        animation: firework-explode 1s ease-out forwards;
                    }
                    @keyframes firework-explode {
                        0% { transform: translate(0, 0) scale(1); opacity: 1; }
                        100% { transform: translate(var(--tx, 0), var(--ty, 100px)) scale(0); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            particle.style.setProperty('--tx', `${vx * 20}px`);
            particle.style.setProperty('--ty', `${vy * 20}px`);
            
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 1000);
        }
    }
}

class BandModal {
    constructor() {
        this.modal = document.getElementById('bandModal');
        this.closeBtn = document.getElementById('closeModal');
        this.modalImage = document.querySelector('.modal-image');
        this.bandPhoto = document.querySelector('.band-photo img');
        
        this.setupModalListeners();
    }
    
    setupModalListeners() {
        this.closeBtn.addEventListener('click', () => {
            this.closeModal();
        });
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        this.bandPhoto.addEventListener('click', () => {
            this.openModal();
        });
    }
    
    openModal() {
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Initialize components when window loads
window.addEventListener('load', function() {
    console.log('Application initialized');
    window.player = new AudioPlayer();
    new InteractiveEffects();
    new NewsletterForm();
    new RhythmGame();
    new BandMemberSounds();
    new BandModal();
    console.log('About to create FunInteractions');
    new FunInteractions();
    console.log('FunInteractions created');
});