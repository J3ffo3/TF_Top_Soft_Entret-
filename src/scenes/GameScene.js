import Phaser from "phaser";

const GAME_STATE = {
    EXPLORATION: 'EXPLORATION',
    COMBAT: 'COMBAT',
    GAMEOVER: 'GAMEOVER',
    LEVEL_UP: 'LEVEL_UP',
    VICTORY: 'VICTORY'
};

// --- CONFIGURACIÓN DE ASSETS ---
const ASSET_CONFIG = {
    // Enemigos Comunes
    'enemy_spyware':    { path: 'assets/Spyware_idle.png',    width: 512 / 8, height: 64, frames: 8, rate: 10 },
    'enemy_ransomware': { path: 'assets/Ransomware_idle.png', width: 576 / 6, height: 80, frames: 6, rate: 8 },
    'enemy_worm':       { path: 'assets/Worm_idle.png',       width: 1040 / 13, height: 80, frames: 13, rate: 8 },
    'enemy_miner':      { path: 'assets/Miner_idle.png',      width: 456 / 6, height: 76, frames: 6, rate: 8 },
    
    // Jefes
    'boss_moderator':   { path: 'assets/Boss1_iddle.png',     width: 384 / 8, height: 45, frames: 8, rate: 10 },
    'boss_crypto':      { path: 'assets/Boss2_idle.png',      width: 119, height: 1116 / 9, frames: 9, rate: 8 },
    'boss_hive':        { path: 'assets/Boss3_idle.png',      width: 2584 / 17, height: 152, frames: 17, rate: 12 },
    'boss_root':        { path: 'assets/BossFinal_iddle.png', width: 3360 / 15, height: 240, frames: 15, rate: 12 },

    // Objetos
    'obj_shop':         { path: 'assets/tienda_idle.png',     width: 102 / 3, height: 34, frames: 3, rate: 6 },
    'obj_data':         { path: 'assets/Recuperar_Tiempo.png',width: 16, height: 16, frames: 18, rate: 10 }
};

const ZONES = [
    { 
        name: "FORO FANTASMA", color: 0x00ff00, bgColor: 0x001100, gridColor: 0x004400,
        enemies: ["Spyware", "Adware"], spriteKey: "enemy_spyware", 
        xp: 30, atkSpeed: 4000,
        boss: "THE MODERATOR", bossColor: 0x00aa00,
        bossSpriteKey: "boss_moderator",
        bossMechanic: "CENSURA (Bloquea 1 dado al azar)", 
        reward: "EXPLOIT DE DAÑO (+1 al atacar)"
    },
    { 
        name: "MERCADO GRIS", color: 0xffff00, bgColor: 0x222200, gridColor: 0x555500,
        enemies: ["Ransomware", "Trojan"], spriteKey: "enemy_ransomware", 
        xp: 45, atkSpeed: 3500,
        boss: "CRYPTO_LOCKER", bossColor: 0xffaa00,
        bossSpriteKey: "boss_crypto",
        bossMechanic: "RANSOM (-5s al recibir daño)",
        reward: "MINERÍA OCULTA (+Tiempo al ganar)"
    },
    { 
        name: "BOTNET", color: 0xff00ff, bgColor: 0x220022, gridColor: 0x550055,
        enemies: ["Worm", "Bot"], spriteKey: "enemy_worm",
        xp: 60, atkSpeed: 3000,
        boss: "HIVE_MIND", bossColor: 0xff00aa,
        bossSpriteKey: "boss_hive",
        bossMechanic: "BACKUP (Se cura 3 HP)",
        reward: "FIREWALL (+Defensa base)"
    },
    { 
        name: "NÚCLEO", color: 0xff0000, bgColor: 0x220000, gridColor: 0x550000,
        enemies: ["MINER", "DAEMON"], spriteKey: "enemy_miner",
        xp: 100, atkSpeed: 2000,
        boss: "ROOT_404", bossColor: 0xff0000,
        bossSpriteKey: "boss_root",
        bossMechanic: "FATAL ERROR (Daño x2)",
        reward: "LIBERTAD"
    }
];

const DICE_DATA = [
    null,
    { type: 'FAIL', val: 0, label: 'FALLO', frame: 0 },
    { type: 'DEF', val: 2, label: 'DEF +2', frame: 1 },
    { type: 'ATK', val: 1, label: 'ATK 1', frame: 2 },
    { type: 'ATK', val: 2, label: 'ATK 2', frame: 3 },
    { type: 'HACK', val: 5, label: 'TIME +5', frame: 4 },
    { type: 'HACK', val: 10, label: 'TIME +10', frame: 5 }
];

const DIRECTIONS = ['down', 'up', 'left', 'right', 'left_down', 'right_down', 'left_up', 'right_up'];
const ACTIONS = ['walk', 'idle', 'death_normal'];

class GameScene extends Phaser.Scene {
    constructor() {
        super("GameScene");
    }

    preload() {
        this.load.spritesheet('dice', 'assets/six sided die.png', { frameWidth: 16, frameHeight: 16 });

        DIRECTIONS.forEach(dir => {
            ACTIONS.forEach(action => {
                const key = `${action}_${dir}`; 
                this.load.spritesheet(key, `assets/${key}.png`, { frameWidth: 48, frameHeight: 48 });
            });
        });

        for (const [key, config] of Object.entries(ASSET_CONFIG)) {
            this.load.spritesheet(key, config.path, { 
                frameWidth: Math.floor(config.width), 
                frameHeight: Math.floor(config.height) 
            });
        }
    }

    playMusic(key, loop = true) {
        // Detener la música actual si existe
        if (this.currentMusic && this.currentMusic.isPlaying) {
            this.currentMusic.stop();
        }

        // Crear y reproducir la nueva música
        this.currentMusic = this.sound.add(key, { loop: loop, volume: 0.5 }); // Ajusta el volumen a tu gusto
        this.currentMusic.play();
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // --- Variable para control de Música ---
        this.currentMusic = null;

        // Generar textura para el aura de luz ---
        // Creamos un círculo blanco con un borde difuminado para que parezca luz.
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(32, 32, 32); // Círculo base
        graphics.generateTexture('aura_light', 64, 64);
        graphics.destroy();

        // --- GENERAR TEXTURA PARA PARTÍCULAS ---
        const particleGraphics = this.make.graphics({x: 0, y: 0, add: false});
        particleGraphics.fillStyle(0xffffff, 1);
        particleGraphics.fillRect(0, 0, 10, 10);
        particleGraphics.generateTexture('pixel_part', 10, 10);

        // --- DATOS ---
        this.playerHP = 12;
        this.maxHP = 12;
        this.globalTime = 90;
        this.diceConfig = JSON.parse(JSON.stringify(DICE_DATA));
        this.currentXP = 0;
        this.nextLevelXP = 50;
        this.playerLevel = 1;
        this.blockedDiceIndex = -1;
        this.canReroll = false;
        this.rerollsAvailable = 0;
        this.isRerollMode = false;
        this.bufferValue = 0;
        this.maxBuffer = 100;
        this.passiveBonusDmg = 0; 
        this.passiveTimeGain = 0; 
        this.passiveDefense = 0;  

        this.currentZoneIndex = 0;
        this.state = GAME_STATE.EXPLORATION;
        
        this.isPopupOpen = false;
        this.isCombatOpen = false;
        this.uiLocked = false; 
        this.activeDiceValues = null; 
        this.isCombatFinishing = false; 
        this.isBossFight = false;
        
        this.pendingBossVictory = false;
        
        this.lastDirectionStr = 'down';

        this.messageQueue = [];
        this.cursors = this.input.keyboard.createCursorKeys();

        // --- VISUALES ---
        this.cameras.main.setBackgroundColor('#000000');
        
        const initialZone = ZONES[0];
        this.bgGrid = this.add.grid(width/2, height/2, width + 100, height + 100, 64, 64, initialZone.bgColor, 1, initialZone.gridColor, 0.3);
        this.bgGrid.setDepth(-100);

        this.createScanlines(width, height);
        
        this.explorationGroup = this.add.group(); 
        this.interactablesGroup = this.physics.add.group();

        // --- UI LAYERS ---
        this.combatContainer = this.add.container(0, 0).setVisible(false).setDepth(100);
        this.popupContainer = this.add.container(0, 0).setVisible(false).setDepth(200);
        
        this.createPopupUI(width, height);
        this.createCombatUI(width, height);
        this.createHUD(width); 

        this.timerEvent = this.time.addEvent({
            delay: 1000, callback: this.onSecondPassed, callbackScope: this, loop: true
        });

        // --- INICIO ---
        this.createAnimations();
        this.createPlayer(); 
        this.generateLevelData();
        
        this.queueMessage(
            `INICIANDO SISTEMA...\nZONA: ${ZONES[0].name}\n\n` +
            `OBJETIVO: Navega la red, derrota a los Guardianes.`
        );
    }

    createAnimations() {
        DIRECTIONS.forEach(dir => {
            ACTIONS.forEach(action => {
                const key = `${action}_${dir}`;
                if (this.textures.exists(key)) {
                    this.anims.create({
                        key: `anim_${key}`,
                        frames: this.anims.generateFrameNumbers(key, { start: 0, end: 5 }),
                        frameRate: 10,
                        repeat: action === 'death_normal' ? 0 : -1
                    });
                }
            });
        });

        if (this.textures.exists('dice')) {
            this.anims.create({
                key: 'dice_roll',
                frames: this.anims.generateFrameNumbers('dice', { start: 84, end: 89 }),
                frameRate: 20,
                repeat: -1
            });
        }

        for (const [key, config] of Object.entries(ASSET_CONFIG)) {
            if (this.textures.exists(key)) {
                this.anims.create({
                    key: `anim_${key}`,
                    frames: this.anims.generateFrameNumbers(key, { start: 0, end: config.frames - 1 }),
                    frameRate: config.rate || 8,
                    repeat: -1
                });
            }
        }
    }

    triggerDeathParticles(x, y, color) {
        // 1. FLASH DE IMPACTO (Destello breve para resaltar la eliminación)
        this.cameras.main.flash(50, 200, 200, 200); 
        this.cameras.main.shake(150, 0.015); // Un poco más de temblor

        // 2. CREAR EMISOR DE PARTÍCULAS POTENCIADO
        // Nota: Usamos 'emitting: false' para controlarlo manualmente con explode()
        const emitter = this.add.particles(x, y, 'pixel_part', {
            speed: { min: 100, max: 400 }, // Velocidad explosiva alta
            angle: { min: 0, max: 360 },   // En todas direcciones
            scale: { start: 3, end: 0 },   // Empiezan GRANDES (3x) y se reducen
            alpha: { start: 1, end: 0 },   // Se desvanecen suavemente
            lifespan: { min: 600, max: 1000 }, // Duran hasta 1 segundo
            gravityY: 0,                   // Sin gravedad (explosión pura en el espacio)
            tint: color,                   // Color del enemigo
            blendMode: 'ADD',              // Modo "Luz" (hace que brillen más)
            emitting: false                // Esperar a la orden de explosión
        });

        // 3. ¡EXPLOSIÓN!
        // Lanzamos 60 partículas de golpe
        emitter.explode(60); 

        // 4. Limpieza de memoria
        this.time.delayedCall(1500, () => {
            emitter.destroy();
        });
    }

    update(time, delta) {
        if (this.bgGrid) {
            this.bgGrid.tilePositionX += 0.5;
            this.bgGrid.tilePositionY += 0.5;
        }

        // --- CAMBIO: Animación del Grid de Combate ---
        if (this.combatGridObj && this.combatContainer.visible) {
            this.combatGridObj.tilePositionX -= 1; // Movimiento estilo matrix
        }

        if (this.state === GAME_STATE.GAMEOVER) {
            if (this.playerSprite && this.playerSprite.body) {
                this.playerSprite.body.setVelocity(0);
                const deathKey = `anim_death_normal_${this.lastDirectionStr}`;
                const safeKey = this.anims.exists(deathKey) ? deathKey : 'anim_death_normal_down';
                if (this.playerSprite.anims.currentAnim?.key !== safeKey && !this.playerSprite.anims.isPlaying) {
                    this.playerSprite.play(safeKey, true);
                }
            }
            return;
        }

        if (this.state === GAME_STATE.VICTORY) return;

        if (this.state === GAME_STATE.EXPLORATION && !this.isPopupOpen && !this.isCombatOpen) {
            this.handlePlayerMovement();
        } else {
            if (this.playerSprite && this.playerSprite.body) {
                this.playerSprite.body.setVelocity(0);
                const idleKey = `anim_idle_${this.lastDirectionStr}`;
                if (this.playerSprite.anims && this.anims.exists(idleKey) && this.playerSprite.anims.currentAnim?.key !== idleKey) {
                    this.playerSprite.play(idleKey, true);
                }
            }
        }
    }

    // --- SISTEMA DE MENSAJES ---
    queueMessage(text, isShop = false, isLevelUp = false) {
        this.messageQueue.push({ text, isShop, isLevelUp });
        if (!this.isPopupOpen) this.processNextMessage();
    }

    processNextMessage() {
        if (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift(); 
            this.showPopup(msg.text, msg.isShop, msg.isLevelUp);
        } else {
            this.closePopup();
            if (this.pendingBossVictory && !this.isPopupOpen) {
                this.pendingBossVictory = false;
                this.handleBossVictory();
            }
        }
    }

    // --- EXPLORACIÓN ---
    createPlayer() {
        const initialKey = this.textures.exists('idle_down') ? 'idle_down' : 'player_fallback';
        
        if (initialKey !== 'player_fallback') {
            this.playerSprite = this.physics.add.sprite(100, 360, 'idle_down', 0);
            this.playerSprite.setScale(1.5); 
            this.playerSprite.body.setSize(20, 20); 
            this.playerSprite.body.setOffset(14, 28); 
            this.playerSprite.play('anim_idle_down'); 
        } else {
            const g = this.add.graphics(); g.fillStyle(0x00ff00); g.fillRect(0, 0, 32, 32); g.generateTexture('player_fallback', 32, 32); g.destroy();
            this.playerSprite = this.physics.add.sprite(100, 360, 'player_fallback');
        }

        this.playerSprite.setCollideWorldBounds(true);
        this.playerSprite.setDepth(50); 
        this.explorationGroup.add(this.playerSprite);

        this.physics.add.overlap(this.playerSprite, this.interactablesGroup, (p, o) => this.handleInteraction(o), null, this);
    }

    handlePlayerMovement() {
        if (!this.playerSprite || !this.playerSprite.body) return;
        const speed = 200;
        const body = this.playerSprite.body;
        let vx = 0; let vy = 0;

        if (this.cursors.left.isDown) vx = -1;
        else if (this.cursors.right.isDown) vx = 1;
        if (this.cursors.up.isDown) vy = -1;
        else if (this.cursors.down.isDown) vy = 1;

        body.setVelocity(vx * speed, vy * speed);

        let dir = "";
        if (vx === -1) dir = "left"; else if (vx === 1) dir = "right";
        if (vy === -1) dir = dir ? `${dir}_up` : "up"; else if (vy === 1) dir = dir ? `${dir}_down` : "down";

        if (dir !== "") {
            this.lastDirectionStr = dir;
            const animKey = `anim_walk_${dir}`;
            if (this.anims.exists(animKey)) {
                this.playerSprite.play(animKey, true);
            }
        } else {
            const idleKey = `anim_idle_${this.lastDirectionStr}`;
            if (this.anims.exists(idleKey)) {
                this.playerSprite.play(idleKey, true);
            }
        }
    }

    handleInteraction(object) {
        if (this.isPopupOpen || this.isCombatOpen || this.state === GAME_STATE.GAMEOVER) return;
        const type = object.getData('type');
        const spriteKey = object.getData('spriteKey');
        
        if (type === 'ENEMY' || type === 'BOSS') {
            object.destroy(); 
            // Limpiar emisor de partículas si existe
            if (object.particleEmitter) {
                object.particleEmitter.destroy();
            }
            this.startCombat(object.getData('name'), 15 + (this.currentZoneIndex * 5), type === 'BOSS', spriteKey);
        } else if (type === 'DATA') {
            object.destroy();
            this.globalTime += 10;
            this.updateHUD();
            this.showFloatingText(this.playerSprite.x, this.playerSprite.y - 50, "+10s", '#00ffff');
        } else if (type === 'SHOP') {
            object.destroy();
            this.triggerShop();
        }
    }

    generateLevelData() {
        if (!ZONES[this.currentZoneIndex]) { this.triggerVictory(); return; }
        this.interactablesGroup.clear(true, true);
        const width = this.scale.width; const height = this.scale.height;
        
        const currentZone = ZONES[this.currentZoneIndex];

        // --- CAMBIO DE MÚSICA AL ENTRAR AL MUNDO ---
        const musicKey = `mundo${this.currentZoneIndex + 1}`;
        this.playMusic(musicKey);
        // -------------------------
        
        if (this.bgGrid) {
            this.cameras.main.setBackgroundColor(currentZone.bgColor);
            this.bgGrid.fillColor = currentZone.bgColor;
            this.bgGrid.outlineColor = currentZone.gridColor || 0x005500;
        }

        const zoneText = this.add.text(width/2, height/2, currentZone.name, { fontSize: '80px', color: '#111111', fontFamily: 'Arial', fontStyle: 'bold' }).setOrigin(0.5).setDepth(-1);
        this.interactablesGroup.add(zoneText);

        // Enemigos
        for (let i = 0; i < 4; i++) {
            const ex = Phaser.Math.Between(100, width - 100);
            const ey = Phaser.Math.Between(100, height - 100);
            const enemy = this.createInteractable(ex, ey, 0xff0000, 'ENEMY', currentZone.enemies[0], false, currentZone.spriteKey);
            this.interactablesGroup.add(enemy);
        }

        // Datos
        for (let i = 0; i < 2; i++) {
            this.interactablesGroup.add(this.createInteractable(Phaser.Math.Between(100, width - 100), Phaser.Math.Between(100, height - 100), 0x00ffff, 'DATA', null, true, 'obj_data'));
        }

        // Tienda
        this.interactablesGroup.add(this.createInteractable(Phaser.Math.Between(100, width - 100), Phaser.Math.Between(100, height - 100), 0xff00ff, 'SHOP', "Tienda", false, 'obj_shop'));
        
        // Boss
        const bossKey = currentZone.bossSpriteKey || null;
        
        let bossY = height / 2; // Posición por defecto (centro)
        // Si es uno de los jefes altos, lo subimos 100 píxeles
        if (bossKey === 'boss_crypto') {
            bossY -= 100;
        }
        // ---------------------------------------------------------------------------

        const bossNode = this.createInteractable(width - 80, bossY, currentZone.bossColor, 'BOSS', currentZone.boss, false, bossKey);
        this.interactablesGroup.add(bossNode);
    }

    applyCensorshipImmediate() {
        // CASO A: ¿El jugador ya tiene dados lanzados en pantalla?
        // Verificamos si existe el array y si tiene algún valor que no sea null
        const hasActiveDice = this.activeDiceValues && this.activeDiceValues.some(v => v !== null);

        if (hasActiveDice) {
            // 1. Buscamos qué dados están disponibles (no nulos y no bloqueados ya)
            const validIndices = [];
            this.activeDiceValues.forEach((val, index) => {
                if (val !== null && index !== this.blockedDiceIndex) {
                    validIndices.push(index);
                }
            });

            if (validIndices.length > 0) {
                // 2. Elegimos uno al azar y lo bloqueamos AHORA MISMO
                this.blockedDiceIndex = validIndices[Phaser.Math.Between(0, validIndices.length - 1)];
                
                // 3. ¡Redibujamos los dados inmediatamente para mostrar la X roja!
                this.drawDice();
                
                // 4. Feedback visual
                this.cameras.main.shake(100, 0.01);
                this.showFloatingText(this.scale.width/2, this.scale.height/2 + 50, "¡DADO HACKEADO!", '#ff0000');

                // Si el jefe bloqueó el ÚLTIMO dado disponible, forzamos el fin del turno
                const isTurnComplete = this.activeDiceValues.every((v, i) => v === null || i === this.blockedDiceIndex);
                if (isTurnComplete) {
                    this.time.delayedCall(1000, () => {
                        this.activeDiceValues = null;
                        this.blockedDiceIndex = -1;
                        this.rollDice();
                    });
                }
            }
        } 
        // CASO B: No hay dados (el jugador los gastó o está esperando)
        else {
            // Guardamos la trampa para el próximo lanzamiento
            this.nextRollCensored = true;
            this.showFloatingText(this.scale.width/2, this.scale.height/2 + 50, "¡PRÓXIMO DADO BLOQUEADO!", '#ff0000');
        }
    }

    createInteractable(x, y, color, type, name, isCircle = false, spriteKey = null) {
        // 1. Determinar si este objeto necesita un aura
        const needsAura = (this.currentZoneIndex === 0 && (type === 'ENEMY' || type === 'BOSS'));

        let mainSprite; // El sprite principal (enemigo, objeto, etc.)

        // Creación del sprite principal (igual que antes)
        if (spriteKey && this.textures.exists(spriteKey)) {
            mainSprite = this.add.sprite(0, 0, spriteKey); // Posición 0,0 relativa al contenedor
            if (type === 'ENEMY' || type === 'BOSS') {
                mainSprite.setScale(2.5);
            } else {
                mainSprite.setScale(1.5);
            }
            const animKey = `anim_${spriteKey}`;
            if (this.anims.exists(animKey)) {
                const anim = this.anims.get(animKey);
                if (anim && anim.getTotalFrames() > 0) {
                    mainSprite.play(animKey); 
                }
            }
        } else {
            // Fallback
            const g = this.add.graphics();
            g.fillStyle(color, 1);
            g.lineStyle(2, 0xffffff, 1);
            if (isCircle) { g.fillCircle(16, 16, 16); g.strokeCircle(16, 16, 16); } 
            else { g.fillRect(0, 0, 32, 32); g.strokeRect(0, 0, 32, 32); }
            const key = `tex_${type}_${Date.now()}_${Math.random()}`;
            g.generateTexture(key, 32, 32); g.destroy();
            mainSprite = this.add.sprite(0, 0, key);
        }
        
        let finalObject; // El objeto que interactuará con las físicas

        if (needsAura) {
            // --- NUEVO: Crear el aura y el contenedor ---
            const aura = this.add.image(0, 0, 'aura_light')
                .setTint(0x00ffff) // Color cian "cyber"
                .setAlpha(0.5)     // Transparente
                .setScale(3.0);    // Más grande que el enemigo

            // Efecto de pulsación para el aura
            this.tweens.add({
                targets: aura,
                scaleX: 3.5, scaleY: 3.5,
                alpha: 0.3,
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Crear un contenedor para el aura (detrás) y el sprite (delante)
            finalObject = this.add.container(x, y, [aura, mainSprite]);
            
            // Importante: Dar tamaño al cuerpo físico del contenedor
            finalObject.setSize(mainSprite.width * mainSprite.scaleX, mainSprite.height * mainSprite.scaleY);
        } else {
            // Si no necesita aura, el objeto final es el sprite simple (con físicas)
            finalObject = this.physics.add.existing(mainSprite);
            finalObject.setPosition(x, y);

            // Animación de "respiración" para objetos sin aura (tu código original)
            if (!spriteKey) {
                this.tweens.add({ targets: finalObject, scaleX: 1.1, scaleY: 1.1, duration: 800, yoyo: true, repeat: -1 });
            }
        }

        // Configuración común para el objeto final (sea sprite o contenedor)
        finalObject.setDepth(40);
        finalObject.setData('type', type);
        finalObject.setData('name', name);
        finalObject.setData('spriteKey', spriteKey);

        return finalObject;
    }
    // ==========================================
    //       COMBATE UI
    // ==========================================
    createCombatUI(width, height) {
        // ... (fondo y borde se quedan igual) ...
        const bg = this.add.rectangle(width/2, height/2, width * 0.95, height * 0.95, 0x000500, 0.95).setInteractive();
        bg.setStrokeStyle(4, 0x00ff00);

        this.combatGridObj = this.add.tileSprite(width/2, height/2, width * 0.9, height * 0.9, 'scanlines');
        this.combatGridObj.setAlpha(0.1).setTint(0x00ff00);

        // --- CAMBIO 1: SUELO MÁS ARRIBA ---
        // Antes estaba en height/2 + 100, lo subimos para dar profundidad desde más arriba
        const floorGrid = this.add.grid(width/2, height * 0.65, width, height/2, 64, 32, 0x000000, 0, 0x003300, 0.5);

        // --- CAMBIO 2: PERSONAJES MÁS ARRIBA (De 0.45 a 0.38) ---
        // JUGADOR
        if (this.textures.exists('idle_right')) {
            this.combatPlayer = this.add.sprite(width * 0.25, height * 0.38, 'idle_right', 0).setScale(3);
            if (this.anims.exists('anim_idle_right')) this.combatPlayer.play('anim_idle_right');
        } else {
            // ... fallback ...
            this.combatPlayer = this.add.sprite(width * 0.25, height * 0.38, 'idle_down', 0).setScale(3);
        }
        
        // ENEMIGO (Contenedor)
        this.combatEnemy = this.add.container(width * 0.75, height * 0.38);
        this.enemyShape = this.add.rectangle(0, 0, 100, 100, 0xff0000);
        this.combatEnemy.add(this.enemyShape);

        // --- CAMBIO 3: TEXTOS DEL ENEMIGO MEJOR POSICIONADOS ---
        // Subimos la etiqueta del nombre para que no tape al jefe
        this.enemyLabel = this.add.text(width * 0.75, height * 0.15, "VIRUS", { fontFamily: 'Courier', fontSize: '24px', color: '#fff' }).setOrigin(0.5);
        // Bajamos un poco la vida para que quede a los pies del enemigo
        this.enemyStats = this.add.text(width * 0.75, height * 0.52, "HP: ??", { fontFamily: 'Courier', fontSize: '24px', color: '#ff0000' }).setOrigin(0.5);
        this.bossTraitText = this.add.text(width * 0.75, height * 0.56, "", { fontFamily: 'Courier', fontSize: '16px', color: '#ffff00', fontStyle: 'italic' }).setOrigin(0.5);

        // --- CAMBIO 4: UI CENTRAL (BUFFER) ---
        // Lo colocamos justo debajo de los pies de los personajes (aprox 0.55)
        this.bufferBarBg = this.add.rectangle(width/2, height * 0.55, 300, 20, 0x333333);
        this.bufferBarFill = this.add.rectangle(width/2 - 150, height * 0.55, 0, 20, 0x00ffff).setOrigin(0, 0.5);
        this.bufferText = this.add.text(width/2, height * 0.55 + 25, "BUFFER", { fontFamily: 'Courier', fontSize: '16px', color: '#00ffff' }).setOrigin(0.5);
        
        this.ultimateBtn = this.add.text(width/2, height * 0.55 - 40, "[ ! SOBRECARGA ! ]", { fontFamily: 'Courier', fontSize: '24px', backgroundColor: '#ff00ff', color: '#ffffff', padding: {x:10, y:5} }).setOrigin(0.5).setVisible(false).setInteractive({useHandCursor: true});
        this.ultimateBtn.on('pointerdown', () => this.activateUltimate());

        this.diceContainer = this.add.container(0, 0);
        
        // Botón de Reroll un poco más arriba
        this.rerollBtn = this.add.text(width/2, height * 0.62, "[ HACKEAR DADO ]", { fontFamily: 'Courier', fontSize: '20px', backgroundColor: '#00ffff', color: '#000000', padding: { x: 5, y: 5 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setVisible(false);
        this.rerollBtn.on('pointerdown', () => this.toggleReroll());

        // Log de combate un poco más arriba
        this.combatLog = this.add.text(width/2, height * 0.85, "TU TURNO", { fontFamily: 'Courier', fontSize: '32px', color: '#ffff00' }).setOrigin(0.5);

        this.combatContainer.add([bg, this.combatGridObj, floorGrid, this.combatPlayer, this.combatEnemy, this.enemyLabel, this.enemyStats, this.bossTraitText, this.bufferBarBg, this.bufferBarFill, this.bufferText, this.ultimateBtn, this.diceContainer, this.rerollBtn, this.combatLog]);
    }

    startCombat(enemyName, enemyHP, isBoss, spriteKey) {
        this.isCombatOpen = true;
        this.isCombatFinishing = false; 

        // --- 1. VARIABLES CRÍTICAS DE LA MECÁNICA (BOSS 1) ---
        this.nextRollCensored = false; // ¡IMPORTANTE! Empieza apagado
        this.blockedDiceIndex = -1;    // Ningún dado bloqueado al inicio
        // --------------------------------------------

        this.physics.pause(); 
        this.combatContainer.setVisible(true);

        this.combatEnemy.setVisible(true);
        this.combatEnemy.setAlpha(1);

        this.enemyHP = enemyHP;
        this.maxEnemyHP = enemyHP;
        this.isBossFight = isBoss;
        
        this.enemyLabel.setText(enemyName);
        this.bossTraitText.setText(isBoss ? `${ZONES[this.currentZoneIndex].bossMechanic}` : "");
        this.updateEnemyUI();

        // Resetear posiciones de texto
        const width = this.scale.width;
        const height = this.scale.height;
        this.enemyStats.setPosition(width * 0.75, height * 0.52);
        this.bossTraitText.setPosition(width * 0.75, height * 0.56);

        this.combatEnemy.removeAll(true);

        // Bloque del Aura (Mundo 1)
        if (this.currentZoneIndex === 0) {
            const combatAura = this.add.image(0, 0, 'aura_light')
                .setTint(0x00ffff)
                .setAlpha(0.6)
                .setScale(4.0);
            this.tweens.add({
                targets: combatAura,
                scaleX: 4.5, scaleY: 4.5,
                alpha: 0.4,
                duration: 1200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            this.combatEnemy.add(combatAura);
        }

        // Sprite del Enemigo
        if (spriteKey && this.textures.exists(spriteKey)) {
            const spr = this.add.sprite(0, 0, spriteKey).setScale(3);
            // --- AJUSTES ESPECÍFICOS DE POSICIÓN PARA JEFES ALTOS ---
            if (spriteKey === 'boss_crypto') {
                spr.setY(-120); // El sprite sube hacia el texto.
            }
            // ------------------------
            const animKey = `anim_${spriteKey}`;
            if (this.anims.exists(animKey)) {
                 spr.play(animKey);
            }
            this.combatEnemy.add(spr);
        } else {
            const rect = this.add.rectangle(0, 0, 100, 100, isBoss ? ZONES[this.currentZoneIndex].bossColor : 0xff0000);
            this.combatEnemy.add(rect);
        }

        this.rerollsAvailable = this.canReroll ? 1 : 0; 
        this.updateRerollButton();
        this.activeDiceValues = null; 
        this.bufferValue = 0; 
        this.updateBufferBar();

        if (this.combatPlayer.play && this.anims.exists('anim_idle_right')) {
            this.combatPlayer.play('anim_idle_right');
        }

        this.rollDice(); 
        this.startEnemyATB();
    }
    
    startEnemyATB() {
        if (this.enemyTimer) this.enemyTimer.remove();
        const speed = ZONES[this.currentZoneIndex].atkSpeed; 
        this.enemyTimer = this.time.addEvent({ delay: speed, callback: this.enemyAttack, callbackScope: this, loop: true });
    }

    enemyAttack() {
        if (!this.isCombatOpen || this.enemyHP <= 0) return;

        this.tweens.add({
            targets: this.combatEnemy,
            x: this.combatPlayer.x + 100,
            duration: 150,
            yoyo: true,
            onYoyo: () => {
                let damage = 2; // Daño base

                // --- NUEVA LÓGICA ROBUSTA (Basada en Zona, no en Nombre) ---
                
                if (this.isBossFight) {
                    // MUNDO 1 (Índice 0): THE MODERATOR -> CENSURA
                    if (this.currentZoneIndex === 0) {
                        this.showSkillTrigger("¡CENSURA!", '#ff0000');
                        
                        // Intentamos bloquear el dado
                        if (typeof this.applyCensorshipImmediate === 'function') {
                            this.applyCensorshipImmediate();
                        }
                        
                        damage += 1;
                    } 
                    
                    // MUNDO 2 (Índice 1): CRYPTO_LOCKER -> RANSOM (Reactivo, no hace nada al atacar)
                    else if (this.currentZoneIndex === 1) {
                         // Este jefe no tiene habilidad al atacar, solo al recibir daño.
                    }

                    // MUNDO 3 (Índice 2): HIVE_MIND -> CURACIÓN
                    else if (this.currentZoneIndex === 2) {
                        if (this.enemyHP < this.maxEnemyHP) {
                            this.showSkillTrigger("BACKUP RESTORE", '#00ff00');
                            this.enemyHP = Math.min(this.enemyHP + 3, this.maxEnemyHP);
                            this.updateEnemyUI();
                            this.showFloatingText(this.combatEnemy.x, this.combatEnemy.y - 100, "+3 HP", '#00ff00');
                        }
                    } 
                    
                    // MUNDO 4 (Índice 3): ROOT_404 -> FATAL ERROR
                    else if (this.currentZoneIndex === 3) {
                        this.showSkillTrigger("FATAL ERROR", '#ff00ff');
                        damage = 5;
                        this.cameras.main.shake(300, 0.02);
                    }
                }

                // Cálculo de defensa y daño al jugador
                if (this.passiveDefense > 0) damage = Math.max(1, damage - this.passiveDefense);
                
                this.playerHP -= damage;
                this.sound.play('sfx_hit_player');
                this.updateHUD();
                
                this.cameras.main.shake(150, 0.01);
                this.showFloatingText(this.combatPlayer.x, this.combatPlayer.y - 50, `-${damage}`, '#ff0000');
                
                if (this.playerHP <= 0) {
                    this.enemyTimer.remove();
                    this.triggerGameOver("SISTEMA CORROMPIDO.");
                }
            },
            onComplete: () => { 
                this.combatEnemy.x = this.scale.width * 0.75; 
            }
        });
    }

    winCombat() {
        if (this.isCombatFinishing) return;
        this.isCombatFinishing = true;

        if (this.enemyTimer) this.enemyTimer.remove();
        this.combatLog.setText("VICTORIA.");
        this.diceContainer.removeAll(true); 

        // Usamos el color del enemigo (Rojo por defecto, o el del jefe)
        const particleColor = this.isBossFight ? ZONES[this.currentZoneIndex].bossColor : 0xff0000;
        
        // Lanzamos partículas desde el centro del enemigo
        this.triggerDeathParticles(this.combatEnemy.x, this.combatEnemy.y, particleColor);
        
        // Ocultamos al enemigo INMEDIATAMENTE para que parezca que explotó
        this.combatEnemy.setVisible(false);

        if (this.passiveTimeGain > 0) {
            this.globalTime += this.passiveTimeGain;
            this.showFloatingText(this.scale.width - 200, 80, `+${this.passiveTimeGain}s`, '#00ffff');
        }

        const xpGained = ZONES[this.currentZoneIndex].xp;
        
        this.time.delayedCall(1000, () => {
            this.activeDiceValues = null;
            this.isCombatOpen = false;
            this.combatContainer.setVisible(false);
            this.physics.resume();

            this.gainXP(xpGained); 

            if (this.enemyLabel.text === "ROOT_404") {
                this.triggerVictory();
            } else if (this.isBossFight) {
                if (this.isPopupOpen) {
                    this.pendingBossVictory = true;
                } else {
                    this.handleBossVictory();
                }
            }
        });
    }

    handleBossVictory() {
        if (this.currentZoneIndex + 1 >= ZONES.length) {
            this.triggerVictory();
            return;
        }

        const zoneData = ZONES[this.currentZoneIndex];
        const reward = zoneData.reward;
        
        if (this.currentZoneIndex === 0) this.passiveBonusDmg = 1; 
        if (this.currentZoneIndex === 1) this.passiveTimeGain = 5; 
        if (this.currentZoneIndex === 2) this.passiveDefense = 1;  

        this.currentZoneIndex++;
        if (this.playerSprite) this.playerSprite.setPosition(100, 360);
        this.generateLevelData();
        
        this.queueMessage(`¡JEFE ELIMINADO!\nTécnica: ${reward}\n\nEntrando a: ${ZONES[this.currentZoneIndex].name}...`);
    }

    showSkillTrigger(text, color = '#ff0000') {
        const width = this.scale.width;
        const height = this.scale.height;

        // Texto de la habilidad que aparece de golpe
        const skillText = this.add.text(width / 2, height * 0.3, text, {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '48px',
            color: color,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(9999).setAlpha(0).setScale(0.5);

        // Animación de entrada explosiva y salida suave
        this.tweens.add({
            targets: skillText,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 1,
            duration: 200,
            ease: 'Back.out',
            onComplete: () => {
                this.cameras.main.shake(100, 0.005); // Pequeño temblor de pantalla
                this.tweens.add({
                    targets: skillText,
                    y: height * 0.25, // Sube un poco
                    alpha: 0,
                    duration: 1000,
                    delay: 500,
                    onComplete: () => skillText.destroy()
                });
            }
        });
    }

    rollDice() {
        // Solo limpiamos el bloqueo SI NO fue activado por la censura "nextRoll"
        if (!this.nextRollCensored) {
            this.blockedDiceIndex = -1;
        }

        // Si había una censura pendiente (Caso B), la aplicamos ahora
        if (this.nextRollCensored) {
            this.blockedDiceIndex = Phaser.Math.Between(0, 2);
            this.nextRollCensored = false; // Ya se usó
        }

        this.diceContainer.removeAll(true);
        this.combatLog.setText("LANZANDO...");
        this.isRerollMode = false;
        this.updateRerollButton();

        if (this.activeDiceValues && this.activeDiceValues.length > 0) {
            this.drawDice();
            return;
        }

        this.sound.play('sfx_dice', { volume: 0.8 });

        const spacing = 150;
        for (let i = 0; i < 3; i++) {
            const x = (this.scale.width / 2) + ((i - 1) * spacing);
            const y = this.scale.height * 0.70; 
            if (this.anims.exists('dice_roll')) {
                const sprite = this.add.sprite(x, y, 'dice').setScale(4).play('dice_roll');
                this.diceContainer.add(sprite);
            } else {
                this.diceContainer.add(this.add.text(x, y, "...", { fontSize: '40px', color: '#0f0' }).setOrigin(0.5));
            }
        }

        this.time.delayedCall(600, () => {
            this.combatLog.setText("¡ATACA!");
            this.activeDiceValues = [];
            for (let i = 0; i < 3; i++) this.activeDiceValues.push(Phaser.Math.Between(1, 6));
            this.drawDice();
        });
    }
    
    drawDice() {
        this.diceContainer.removeAll(true);
        if (!this.activeDiceValues) return;

        this.activeDiceValues.forEach((val, index) => {
             if (val !== null) {
                 this.createDice(val, index);
             }
        });
    }

    createDice(val, index) {
        const spacing = 150;
        const x = (this.scale.width / 2) + ((index - 1) * spacing);
        const y = this.scale.height * 0.70; 
        
        const isBlocked = (index === this.blockedDiceIndex);
        const faceData = this.diceConfig[val];
        
        let diceVisual;
        if (this.textures.exists('dice')) {
            diceVisual = this.add.sprite(0, 0, 'dice', val - 1).setScale(4);
        } else {
            diceVisual = this.add.text(0, 0, val.toString(), { fontSize: '32px', fontStyle: 'bold' }).setOrigin(0.5);
        }

        const container = this.add.container(x, y);
        const bg = this.add.rectangle(0, 0, 80, 80, isBlocked ? 0x550000 : 0x222222).setStrokeStyle(2, isBlocked ? 0xff0000 : 0x00ff00);
        
        container.add(bg);
        container.add(diceVisual);

        if (isBlocked) {
            diceVisual.setTint(0xff0000); 
            const lock = this.add.text(0, 0, "X", { fontSize: '64px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
            const label = this.add.text(0, 50, "CENSURA", { fontSize: '16px', color: '#ff0000' }).setOrigin(0.5);
            container.add([lock, label]);
        } else {
            const label = this.add.text(0, 50, faceData.label, { fontSize: '16px', color: '#00ff00', fontFamily: 'Courier' }).setOrigin(0.5);
            container.add(label);
        }

        container.setSize(80, 80);
        container.setInteractive({ useHandCursor: !isBlocked });

        if (!isBlocked) {
            container.on('pointerdown', () => {
                if (this.isRerollMode) {
                    if (this.rerollsAvailable > 0) {
                        this.rerollsAvailable--;
                        this.sound.play('sfx_dice', { volume: 0.8, rate: 1.2 });
                        this.activeDiceValues[index] = Phaser.Math.Between(1, 6);
                        this.blockedDiceIndex = -1; 
                        this.rollDice(); 
                        this.showFloatingText(x, y - 50, "REROLL!", '#ff00ff');
                    }
                } else {
                    this.executeDiceAction(val, x, y);
                    this.activeDiceValues[index] = null; 
                    this.chargeBuffer(15); 
                    this.drawDice(); 
                    
                    const isTurnComplete = this.activeDiceValues.every((v, i) => v === null || i === this.blockedDiceIndex);

                    if (isTurnComplete && this.enemyHP > 0) {
                        this.activeDiceValues = null;
                        this.blockedDiceIndex = -1; 
                        // Damos medio segundo para ver el resultado y lanzamos de nuevo
                        this.time.delayedCall(500, () => this.rollDice());
                    }
                }
            });
        }
        
        this.diceContainer.add(container);
    }

    executeDiceAction(val, x, y) {
        const faceData = this.diceConfig[val];
        switch(faceData.type) {
            case 'FAIL': this.cameras.main.shake(100, 0.005); this.showFloatingText(x, y - 50, "FALLO", '#888888'); break;
            case 'DEF': const heal = faceData.val; this.playerHP = Math.min(this.playerHP + heal, this.maxHP); this.updateHUD(); this.showFloatingText(this.combatPlayer.x, this.combatPlayer.y - 50, `+${heal} HP`, '#00ff00'); break;
            case 'ATK': let dmg = faceData.val + this.passiveBonusDmg; this.damageEnemy(dmg); this.sound.play('sfx_hit_enemy'); this.showFloatingText(this.combatEnemy.x, this.combatEnemy.y, `-${dmg}`, '#ff0000'); break;
            case 'HACK': const time = faceData.val; this.globalTime += time; this.updateHUD(); this.showFloatingText(this.scale.width - 200, 50, `+${time}s`, '#00ffff'); break;
        }
    }

    chargeBuffer(amount) { this.bufferValue = Math.min(this.bufferValue + amount, this.maxBuffer); this.updateBufferBar(); }
    updateBufferBar() {
        const percent = this.bufferValue / this.maxBuffer;
        this.bufferBarFill.width = 300 * percent;
        this.bufferText.setText(`BUFFER: ${Math.floor(percent * 100)}%`);
        if (this.bufferValue >= this.maxBuffer) { this.ultimateBtn.setVisible(true); this.bufferBarFill.setFillStyle(0xff00ff); } else { this.ultimateBtn.setVisible(false); this.bufferBarFill.setFillStyle(0x00ffff); }
    }
    activateUltimate() {
        this.bufferValue = 0; this.updateBufferBar(); this.cameras.main.flash(200, 255, 0, 255); this.showFloatingText(this.scale.width/2, this.scale.height/2, "¡SOBRECARGA!", '#ff00ff'); this.damageEnemy(5);
        if (this.enemyTimer) { this.enemyTimer.paused = true; this.combatLog.setText("¡ENEMIGO ATURDIDO! (3s)"); this.time.delayedCall(3000, () => { if (this.enemyTimer && this.isCombatOpen) { this.enemyTimer.paused = false; this.combatLog.setText("EL ENEMIGO SE RECUPERA."); } }); }
    }

    damageEnemy(amount) {
        // Lógica normal de daño
        this.enemyHP -= amount;
        this.updateEnemyUI();
        this.cameras.main.flash(50, 255, 255, 255); // Flash blanco de impacto
                    

        // --- MECÁNICA REACTIVA: CRYPTO_LOCKER ---
        if (this.isBossFight && this.currentZoneIndex === 1 && this.enemyHP > 0) {
            // Solo activa la habilidad si el golpe no lo mató
            this.showSkillTrigger("RANSOMWARE", '#ffff00');
            this.globalTime -= 5; // Te roba 5 segundos
            this.updateHUD();
            this.showFloatingText(this.scale.width - 200, 80, "-5s", '#ff0000');
            
            // Sonido visual (vibración)
            this.cameras.main.shake(100, 0.005);
        }
        // -----------------------------------------

        if (this.enemyHP <= 0) this.winCombat();
    }

    updateEnemyUI() { this.enemyStats.setText(`HP: ${this.enemyHP}/${this.maxEnemyHP}`); }
    showFloatingText(x, y, message, color) {
        const text = this.add.text(x, y, message, { fontFamily: 'Courier', fontSize: '32px', color: color, stroke: '#000', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setDepth(200); 
        this.tweens.add({ targets: text, y: y - 80, alpha: 0, duration: 1500, ease: 'Power2', onComplete: () => text.destroy() });
    }
    triggerShop() { this.queueMessage(`root_404: "MEJORAS DISPONIBLES."\n\nELIGE UNA:`, true); }
    handleShopChoice(choice) {
        if (this.uiLocked) return; this.uiLocked = true;
        this.shopContainer.setVisible(false); this.shopContainer.getAll().forEach(c => c.disableInteractive());
        let msg = "";
        if (choice === 'UPGRADE_DICE') { if (this.globalTime >= 30) { this.globalTime -= 30; if (this.diceConfig[1].type === 'FAIL') { this.diceConfig[1] = { type: 'ATK', val: 1, label: 'ATK 1', frame: 2 }; msg = "Dado mejorado."; } else { this.diceConfig[3].val += 1; this.diceConfig[3].label = `ATK ${this.diceConfig[3].val}`; msg = "Ataque mejorado."; } } else msg = "Tiempo Insuficiente."; } 
        else if (choice === 'MAX_HP') { if (this.globalTime >= 40) { this.globalTime -= 40; this.maxHP += 4; this.playerHP = this.maxHP; msg = "Integridad aumentada."; } else msg = "Tiempo Insuficiente."; }
        this.updateHUD(); this.showPopup(msg, false, false);
    }
    gainXP(amount) { this.currentXP += amount; this.updateHUD(); if (this.currentXP >= this.nextLevelXP) this.levelUp(); }
    levelUp() { this.playerLevel++; this.currentXP -= this.nextLevelXP; this.nextLevelXP = Math.floor(this.nextLevelXP * 1.5); this.queueMessage(`root_404: "Nivel ${this.playerLevel} Alcanzado.\nELIGE RECOMPENSA:"`, false, true); }
    handleLevelUpChoice(choice) {
        if (this.uiLocked) return; this.uiLocked = true;
        this.levelUpContainer.setVisible(false); this.levelUpContainer.getAll().forEach(c => c.disableInteractive());
        let msg = ""; if (choice === 'HP_BOOST') { this.maxHP += 4; this.playerHP = this.maxHP; msg = "Integridad aumentada (+4)."; } else if (choice === 'UNLOCK_REROLL') { this.canReroll = true; msg = "Habilidad HACKEAR DADO instalada."; }
        this.updateHUD(); this.showPopup(msg, false, false);
    }
    updateRerollButton() { if (this.canReroll && this.rerollsAvailable > 0) { this.rerollBtn.setVisible(true); this.rerollBtn.setText(`[ HACKEAR DADO (${this.rerollsAvailable}) ]`); this.rerollBtn.setBackgroundColor('#00ffff'); } else { this.rerollBtn.setVisible(false); } }
    toggleReroll() { this.isRerollMode = !this.isRerollMode; this.combatLog.setText(this.isRerollMode ? "SELECCIONA DADO" : "TU TURNO"); this.rerollBtn.setBackgroundColor(this.isRerollMode ? '#ff00ff' : '#00ffff'); }
    createPopupUI(w, h) {
        const bg = this.add.rectangle(w/2, h/2, w*0.8, h*0.6, 0x000000, 0.95).setStrokeStyle(4, 0x00ff00).setInteractive();
        this.popupText = this.add.text(w/2, h*0.35, "", { fontFamily: 'Courier', fontSize: '24px', color: '#ccc', wordWrap: { width: w*0.7 }, align: 'center' }).setOrigin(0.5, 0);
        this.closeBtn = this.add.text(w/2, h*0.75, "[ CERRAR ]", { fontFamily: 'VT323', fontSize: '32px', color: '#0f0', backgroundColor: '#020', padding: { x: 20, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.closePopup());
        this.shopContainer = this.add.container(0, 0).setVisible(false);
        this.shopContainer.add([this.createBtn(w/2 - 200, h*0.6, "OPTIMIZAR DADO (-30s)", () => this.handleShopChoice('UPGRADE_DICE')), this.createBtn(w/2 + 200, h*0.6, "PARCHE HP (-40s)", () => this.handleShopChoice('MAX_HP'))]);
        this.levelUpContainer = this.add.container(0, 0).setVisible(false);
        this.levelUpContainer.add([this.createBtn(w/2 - 200, h*0.6, "NÚCLEO (+4 Max HP)", () => this.handleLevelUpChoice('HP_BOOST')), this.createBtn(w/2 + 200, h*0.6, "HABILIDAD HACKER", () => this.handleLevelUpChoice('UNLOCK_REROLL'))]);
        this.popupContainer.add([bg, this.popupText, this.closeBtn, this.shopContainer, this.levelUpContainer]);
    }
    createBtn(x, y, text, callback) {
        const txt = this.add.text(x, y, text, { fontSize: '18px', backgroundColor: '#333', padding: { x: 10, y: 10 }, color: '#fff', fontFamily: 'Courier', align: 'center' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        txt.on('pointerdown', callback); return txt;
    }
    showPopup(text, isShop, isLevelUp) {
        this.isPopupOpen = true; this.uiLocked = false; this.physics.pause(); this.popupContainer.setVisible(true); this.popupText.setText(text);
        this.shopContainer.setVisible(isShop); if(isShop) this.shopContainer.getAll().forEach(c => c.setInteractive());
        this.levelUpContainer.setVisible(isLevelUp); if(isLevelUp) this.levelUpContainer.getAll().forEach(c => c.setInteractive());
        this.closeBtn.setVisible(!(isShop || isLevelUp)); if (!isShop && !isLevelUp) this.closeBtn.setText(this.messageQueue.length > 0 ? "[ SIGUIENTE ]" : "[ CERRAR ]");
    }
    closePopup() {
        if (this.messageQueue.length > 0) this.processNextMessage();
        else { this.isPopupOpen = false; this.popupContainer.setVisible(false); if (!this.isCombatOpen) this.physics.resume(); if (this.pendingBossVictory) { this.pendingBossVictory = false; this.handleBossVictory(); } }
    }
    onSecondPassed() { if (this.state === GAME_STATE.GAMEOVER || this.state === GAME_STATE.VICTORY) return; this.globalTime--; this.updateHUD(); if (this.globalTime <= 0) this.triggerGameOver("TIEMPO AGOTADO."); }
    
    createHUD(width) {
        // 1. Contenedor del HUD (para ordenarlo todo junto)
        this.hudContainer = this.add.container(0, 0).setDepth(1000).setScrollFactor(0);

        // 2. Fondo del Panel (Estilo cristal oscuro)
        const bgBar = this.add.rectangle(width / 2, 30, width, 60, 0x000000, 0.7);
        const borderBottom = this.add.rectangle(width / 2, 60, width, 2, 0x00ff00, 1); // Línea neón abajo
        
        // 3. Gráficos para las Barras (HP y XP)
        this.hudGraphics = this.add.graphics();

        // 4. Textos Estilizados
        // Nivel (Centro)
        this.lvlText = this.add.text(width / 2, 20, "LVL 1", {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '24px',
            color: '#ffff00',
            fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 0, '#ffff00', 4);

        // HP (Izquierda) - Etiqueta
        this.hpLabel = this.add.text(20, 15, "INTEGRIDAD:", {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '16px',
            color: '#00ff00'
        });
        // HP (Izquierda) - Texto numérico pequeño sobre la barra
        this.hpValueText = this.add.text(20, 35, "12/12", {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '14px',
            color: '#ffffff'
        });

        // Tiempo (Derecha)
        this.timeLabel = this.add.text(width - 20, 15, "TIEMPO RESTANTE", {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '16px',
            color: '#00ffff'
        }).setOrigin(1, 0);
        
        this.timeValueText = this.add.text(width - 20, 35, "00:00", {
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(1, 0).setShadow(0, 0, '#00ffff', 4);

        // Añadir todo al contenedor
        this.hudContainer.add([bgBar, borderBottom, this.hudGraphics, this.lvlText, this.hpLabel, this.hpValueText, this.timeLabel, this.timeValueText]);

        // Dibujar por primera vez
        this.updateHUD();
    }

    updateHUD() {
        if (!this.hudGraphics) return;

        this.hudGraphics.clear();
        const width = this.scale.width;

        // --- BARRA DE VIDA (HP) ---
        const barWidth = 200;
        const barHeight = 15;
        const barX = 130; // Un poco a la derecha de la etiqueta "INTEGRIDAD"
        const barY = 18;

        const hpPercent = Phaser.Math.Clamp(this.playerHP / this.maxHP, 0, 1);

        // Fondo de la barra (Gris oscuro/Rojo oscuro)
        this.hudGraphics.fillStyle(0x330000, 1);
        this.hudGraphics.fillRect(barX, barY, barWidth, barHeight);

        // Relleno de la barra (Cambia de color según daño)
        let hpColor = 0x00ff00; // Verde
        if (hpPercent < 0.3) hpColor = 0xff0000; // Rojo crítico
        else if (hpPercent < 0.6) hpColor = 0xffff00; // Amarillo cuidado

        this.hudGraphics.fillStyle(hpColor, 1);
        this.hudGraphics.fillRect(barX, barY, barWidth * hpPercent, barHeight);
        
        // Borde de la barra
        this.hudGraphics.lineStyle(2, 0xffffff, 0.5);
        this.hudGraphics.strokeRect(barX, barY, barWidth, barHeight);

        // Actualizar texto numérico
        this.hpValueText.setText(`${this.playerHP}/${this.maxHP}`);
        this.hpValueText.setPosition(barX + barWidth + 10, barY - 2); // Poner el número al final de la barra

        // --- BARRA DE XP (Debajo del Nivel) ---
        const xpBarWidth = 150;
        const xpBarHeight = 4;
        const xpX = (width / 2) - (xpBarWidth / 2);
        const xpY = 45;

        const xpPercent = Phaser.Math.Clamp(this.currentXP / this.nextLevelXP, 0, 1);

        // Fondo XP
        this.hudGraphics.fillStyle(0x222222, 1);
        this.hudGraphics.fillRect(xpX, xpY, xpBarWidth, xpBarHeight);

        // Relleno XP (Azul/Cian)
        this.hudGraphics.fillStyle(0x00ffff, 1);
        this.hudGraphics.fillRect(xpX, xpY, xpBarWidth * xpPercent, xpBarHeight);

        // Actualizar texto Nivel
        this.lvlText.setText(`SYSTEM LVL ${this.playerLevel}`);

        // --- TIEMPO (Formato Reloj) ---
        const minutes = Math.floor(this.globalTime / 60);
        const seconds = this.globalTime % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        this.timeValueText.setText(timeString);

        // Efecto de alarma si queda poco tiempo
        if (this.globalTime <= 30) {
            this.timeValueText.setColor('#ff0000');
            this.timeValueText.setShadow(0, 0, '#ff0000', 8);
        } else {
            this.timeValueText.setColor('#ffffff');
            this.timeValueText.setShadow(0, 0, '#00ffff', 4);
        }
    }
    
    createScanlines(w, h) { const g = this.add.graphics(); g.fillStyle(0x000000); g.fillRect(0, 0, w, 4); g.fillStyle(0x111111); g.fillRect(0, 4, w, 4); g.generateTexture('scanlines', w, 8); g.destroy(); this.add.tileSprite(0, 0, w, h, 'scanlines').setOrigin(0).setAlpha(0.2).setDepth(10); }
    
    triggerGameOver(reason) {
        if (this.state === GAME_STATE.GAMEOVER) return; this.state = GAME_STATE.GAMEOVER; this.timerEvent.remove(); if (this.enemyTimer) this.enemyTimer.remove(); this.physics.pause();
        this.popupContainer.setVisible(false); this.combatContainer.setVisible(false);
        this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 0x000000).setDepth(400);
        this.add.text(this.scale.width/2, this.scale.height/2, "GAME OVER", { fontFamily: 'Courier', fontSize: '64px', color: 'red' }).setOrigin(0.5).setDepth(401);
        this.add.text(this.scale.width/2, this.scale.height/2 + 80, reason, { fontFamily: 'Courier', fontSize: '24px', color: 'white' }).setOrigin(0.5).setDepth(401);
        this.playMusic('gameover', false);
        this.time.delayedCall(4000, () => { this.scene.start("Menu"); });
    }

    triggerVictory() {
        if (this.state === GAME_STATE.VICTORY) return; this.state = GAME_STATE.VICTORY; this.timerEvent.remove(); if (this.enemyTimer) this.enemyTimer.remove(); this.physics.pause();
        this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height, 0x001100).setDepth(400);
        this.add.text(this.scale.width/2, this.scale.height/2 - 50, "SYSTEM HACKED", { fontFamily: 'Courier', fontSize: '80px', color: '#0f0', fontStyle: 'bold' }).setOrigin(0.5).setDepth(401);
        this.add.text(this.scale.width/2, this.scale.height/2 + 50, "ESCAPASTE CON ÉXITO", { fontFamily: 'Courier', fontSize: '30px', color: '#fff' }).setOrigin(0.5).setDepth(401);
        // --- MÚSICA DE VICTORIA ---
        this.playMusic('win', false);
        this.time.delayedCall(6000, () => this.scene.start("Menu"));
    }
}

export default GameScene;