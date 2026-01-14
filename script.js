// Main application script
// Loading screen handler - simple and reliable
setTimeout(() => {
    console.log('Hiding loading screen');
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        loadingScreen.remove();
    }
}, 500);

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
    
    play() {
        this.audio.play();
        this.isPlaying = true;
        this.playPauseBtn.querySelector('.icon').textContent = '⏸';
        document.querySelector('.vinyl-record').classList.add('spinning');
        
        if (!this.audioContext) {
            this.setupAudioContext();
        }
        
        this.updatePlaylistVisualState();
        this.visualize();
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
    
    setupCanvas() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }
    
    visualize() {
        if (!this.isPlaying) return;
        
        requestAnimationFrame(() => this.visualize());
        
        if (!this.analyser) return;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const bufferLength = this.analyser.frequencyBinCount;
        const barWidth = (this.canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        this.ctx.fillStyle = 'rgba(22, 33, 62, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let i = 0; i < bufferLength; i++) {
            barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.7;
            
            const gradient = this.ctx.createLinearGradient(0, this.canvas.height - barHeight, 0, this.canvas.height);
            gradient.addColorStop(0, '#e94560');
            gradient.addColorStop(0.5, '#8b5cf6');
            gradient.addColorStop(1, '#667eea');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth - 2, barHeight);
            
            x += barWidth;
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
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
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
            
            this.ctx.strokeStyle = '#e94560';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            
            const sliceWidth = this.canvas.width / bufferLength;
            for (let i = 0; i < bufferLength; i++) {
                const v = this.dataArray[i] / 128.0;
                const y = (v + 1) / 2.0;
                
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
                const y3 = centerY + Math.sin(angle + 0.2) * radius * amplitude * 0.8;
                
                this.ctx.strokeStyle = this.getVisualizerColor();
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(centerX, centerY);
                this.ctx.lineTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.lineTo(x3, y3);
                this.ctx.stroke();
            }
        } else {
        }
    }
    
    getVisualizerColor() {
        if (this.visualizerColorMode === 'rainbow') {
            return `hsl(${(Date.now() / 50) % 360}, 70%, 60%)`;
        } else if (this.visualizerColorMode === 'solid') {
            return '#8b5cf6';
        } else {
            return 'gradient';
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
    
    setupAudioContext() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.source = this.audioContext.createMediaElementSource(this.audio);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
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
        this.notes = [];
        this.isGameActive = false;
        
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
            this.startGame();
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
        this.gameInterval = setInterval(() => {
            this.generateNote();
        }, 500);
        
        this.startGameBtn.textContent = 'Stop Game';
        this.gameMessage.textContent = 'Game started! Press D, F, J, K to hit notes.';
        
        this.gameAudio.play();
        
        this.updateScore();
    }
    
    stopGame() {
        this.isGameActive = false;
        clearInterval(this.gameInterval);
        
        this.gameAudio.pause();
        this.startGameBtn.textContent = 'Start Game';
        this.gameMessage.textContent = 'Game stopped!';
        
        // Clear remaining notes
        this.clearNotes();
    }
    
    generateNote() {
        if (Math.random() < 0.3) {
            const lanes = ['d', 'f', 'j', 'k'];
            const lane = lanes[Math.floor(Math.random() * lanes.length)];
            const note = {
                lane: lane,
                time: Date.now(),
                hit: false
            };
            
            this.notes.push(note);
            
            // Create visual note element
            const noteElement = document.createElement('div');
            noteElement.className = 'game-note';
            noteElement.textContent = lane.toUpperCase();
            noteElement.style.left = this.getLanePosition(lane) + 'px';
            noteElement.dataset.lane = lane;
            
            this.gameBoard.appendChild(noteElement);
        }
    }
    
    handleKeyPress(key) {
        const lane = key.toLowerCase();
        
        if (['d', 'f', 'j', 'k'].includes(lane)) {
            this.checkNoteHit(lane);
        }
    }
    
    checkNoteHit(lane) {
        const currentTime = Date.now();
        const hitThreshold = 100; // 100ms window
        
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const note = this.notes[i];
            
            if (note.lane === lane && !note.hit && currentTime - note.time < hitThreshold) {
                note.hit = true;
                this.score += 10;
                this.combo++;
                
                // Create hit effect
                const hitEffect = document.createElement('div');
                hitEffect.className = 'hit-effect';
                hitEffect.style.left = this.getLanePosition(lane) + 'px';
                hitEffect.textContent = '✓';
                this.gameBoard.appendChild(hitEffect);
                
                setTimeout(() => {
                    hitEffect.remove();
                }, 300);
                
                break;
            }
        }
        
        this.updateScore();
    }
    
    clearNotes() {
        const noteElements = this.gameBoard.querySelectorAll('.game-note');
        noteElements.forEach(element => {
            element.remove();
        });
        this.notes = [];
    }
    
    getLanePosition(lane) {
        const laneElement = document.querySelector(`.lane[data-key="${lane}"]`);
        if (laneElement) {
            const rect = laneElement.getBoundingClientRect();
            return rect.left;
        }
        return 0;
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
        this.setupKonamiCode();
        this.secretMode = false;
    }
    
    setupKonamiCode() {
        this.konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        this.konamiIndex = 0;
        this.secretMode = false;
        
        document.addEventListener('keydown', (e) => {
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
                0% {
                    transform: translate(-50%, -50%) scale(0) rotate(0deg);
                    opacity: 0;
                }
                50% {
                    transform: translate(-50%, -50%) scale(1.2) rotate(180deg);
                    opacity: 1;
                }
                100% {
                    transform: translate(-50%, -50%) scale(1) rotate(360deg);
                    opacity: 0;
                }
            }
            .secret-mode {
                animation: rainbow-bg 3s linear infinite;
            }
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
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.top = '-20px';
                confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.width = '10px';
                confetti.style.height = '10px';
                confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
                
                const style = document.createElement('style');
                if (!document.querySelector('.firework-styles')) {
                    style.className = 'firework-styles';
                    style.textContent = `
                        .firework-particle {
                            position: fixed;
                            width: 6px;
                            height: 6px;
                            border-radius: 50%;
                            transform: translate(-50%, -50%);
                            pointer-events: none;
                            z-index: 9999;
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 3000);
            }, i * 100);
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
});