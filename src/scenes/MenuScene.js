import Phaser from "phaser";

class MenuScene extends Phaser.Scene {
    constructor() {
        super("Menu");
    }

    playMusic(key, loop = true) {
        if (this.currentMusic && this.currentMusic.key === key && this.currentMusic.isPlaying) {
            return;
        }
        if (this.currentMusic) {
            this.currentMusic.stop();
        }
        this.currentMusic = this.sound.add(key, { loop: loop, volume: 1 });
        this.currentMusic.play();
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;
        
        // 1. GESTIÓN DE AUDIO
        if (this.sound.context.state === 'suspended') {
            this.sound.context.resume();
        }

        // Volumen inicial seguro
        if (this.sound.volume === 0 && !this.sound.mute) {
             this.sound.volume = 0.5;
        }

        if (!this.sound.get('menu')) {
             this.playMusic('menu');
        }

        // 2. VISUALES
        this.createBackgroundEffects(width, height);
        this.createLogoAndTitle(width, height);

        // 3. CONTENEDORES
        this.mainMenuContainer = this.add.container(0, 0);
        this.optionsContainer = this.add.container(0, 0).setVisible(false);
        this.instructionsContainer = this.add.container(0, 0).setVisible(false);

        // 4. CONSTRUIR MENÚS
        this.buildMainMenu(width, height);
        this.buildOptionsMenu(width, height);
        this.buildInstructionsMenu(width, height);

        // 5. CONSOLA
        this.consoleText = this.add.text(width / 2, height * 0.95, "", {
            fontFamily: '"Courier New", monospace', fontSize: "18px", color: "#00aa00"
        }).setOrigin(0.5);
        this.typewriteText("root_404: Sistema cargado. Esperando input...");
    }

    // ==========================================
    //       MENÚS
    // ==========================================

    buildMainMenu(width, height) {
        const btnStart = this.createButton(width / 2, height * 0.55, "START SYSTEM", () => {
            this.currentMusic.stop();
            this.scene.start("GameScene");
        });

        const btnOptions = this.createButton(width / 2, height * 0.65, "CONFIG / SOUND", () => {
            // Pasamos los valores actuales explícitamente para asegurar sincronización
            this.updateVolumeUI(this.sound.mute, this.sound.volume); 
            this.switchMenu(this.mainMenuContainer, this.optionsContainer);
        });

        const btnInstructions = this.createButton(width / 2, height * 0.75, "READ_ME.TXT", () => {
            this.switchMenu(this.mainMenuContainer, this.instructionsContainer);
        });

        const btnExit = this.createButton(width / 2, height * 0.85, "EXIT SYSTEM", () => {
            window.location.reload();
        });

        this.mainMenuContainer.add([btnStart, btnOptions, btnInstructions, btnExit]);
    }

    buildOptionsMenu(width, height) {
        const bg = this.add.rectangle(width/2, height/2 + 50, width * 0.6, height * 0.6, 0x000000, 0.9).setStrokeStyle(2, 0x00ff00);
        const title = this.add.text(width/2, height * 0.35, "> SYSTEM CONFIG <", { 
            fontFamily: '"VT323", monospace', fontSize: "40px", color: "#00ff00" 
        }).setOrigin(0.5);

        // TEXTO ESTADO
        this.volText = this.add.text(width/2, height * 0.5, "VOL: --", {
            fontFamily: '"Courier New", monospace', fontSize: "30px", color: "#ffffff"
        }).setOrigin(0.5);

        // BOTONES VOLUMEN (Usamos el fix de extraer .container)
        const btnDownObj = this.createSmallButton(width/2 - 100, height * 0.6, "[-]", () => this.changeVolume(-0.1));
        const btnUpObj = this.createSmallButton(width/2 + 100, height * 0.6, "[+]", () => this.changeVolume(0.1));
        
        // BOTÓN MUTE
        const muteBtnObj = this.createSmallButton(width/2, height * 0.7, "SILENCIAR", () => this.toggleMute());
        this.muteBtnText = muteBtnObj.textObj; // Guardamos referencia al texto

        const btnBack = this.createButton(width/2, height * 0.85, "< RETURN", () => {
            this.switchMenu(this.optionsContainer, this.mainMenuContainer);
        });

        // Añadimos solo los contenedores visuales
        this.optionsContainer.add([bg, title, this.volText, btnDownObj.container, btnUpObj.container, muteBtnObj.container, btnBack]);
    }

    buildInstructionsMenu(width, height) {
        const bg = this.add.rectangle(width/2, height/2 + 50, width * 0.8, height * 0.7, 0x000000, 0.95).setStrokeStyle(2, 0x00ff00);
        const title = this.add.text(width/2, height * 0.25, "> MANUAL DE USUARIO <", { fontFamily: '"VT323", monospace', fontSize: "40px", color: "#00ff00" }).setOrigin(0.5);
        
        const instructions = `
        OBJETIVO:
        Infiltrate en la red y derrota a los Guardianes.

        MECÁNICAS:
        1. Combate por Turnos usando DADOS.
        2. DADOS DE ATAQUE: Causan daño al Firewall enemigo.
        3. DADOS DE DEFENSA: Recuperan tu integridad.
        4. DADOS DE HACK: Manipulan el tiempo o reroll.

        ADVERTENCIA:
        Los Jefes tienen contramedidas (Censura, Ransomware).
        Si el TIEMPO llega a 0, serás desconectado.
        `;

        const textBody = this.add.text(width/2, height * 0.5, instructions, {
            fontFamily: '"Courier New", monospace', fontSize: "18px", color: "#cccccc", align: "center", wordWrap: { width: width * 0.7 }
        }).setOrigin(0.5);

        const btnBack = this.createButton(width/2, height * 0.85, "< RETURN", () => {
            this.switchMenu(this.instructionsContainer, this.mainMenuContainer);
        });

        this.instructionsContainer.add([bg, title, textBody, btnBack]);
    }

    // ==========================================
    //       LÓGICA DE AUDIO (SINCRONIZADA)
    // ==========================================

    changeVolume(delta) {
        // 1. Calcular nuevo volumen con redondeo para evitar "0.3000004"
        let rawVol = this.sound.volume + delta;
        let newVol = Math.round(rawVol * 10) / 10; 
        
        // 2. Limitar entre 0 y 1
        newVol = Phaser.Math.Clamp(newVol, 0, 1);
        
        // 3. Aplicar al sistema
        this.sound.volume = newVol;

        // 4. Lógica de desmuteo
        let nextMuteState = this.sound.mute;
        if (newVol > 0 && this.sound.mute) {
            this.sound.setMute(false);
            nextMuteState = false;
        }

        // 5. ACTUALIZAR UI CON EL VALOR QUE ACABAMOS DE CALCULAR
        // (No leemos this.sound.volume, usamos newVol directamente)
        this.updateVolumeUI(nextMuteState, newVol);
    }

    toggleMute() {
        // 1. Calcular nuevo estado
        const nextState = !this.sound.mute;
        
        // 2. Aplicar
        this.sound.setMute(nextState);

        // 3. Actualizar UI pasando explícitamente el nuevo estado y el volumen actual
        this.updateVolumeUI(nextState, this.sound.volume);
    }

    updateVolumeUI(isMuted, forceVol = null) {
        // Usamos forceVol si existe, si no, leemos el sistema (fallback)
        const currentVol = (forceVol !== null) ? forceVol : this.sound.volume;

        // --- 1. ACTUALIZAR TEXTO DE ESTADO ---
        if (isMuted) {
            this.volText.setText("ESTADO: [SILENCIO]");
            this.volText.setColor("#ff0000"); 
        } else {
            if (currentVol <= 0.01) {
                this.volText.setText("VOL: 0% (MIN)");
                this.volText.setColor("#888888");
            } else {
                const pct = Math.round(currentVol * 100);
                this.volText.setText(`VOL: ${pct}%`);
                this.volText.setColor("#00ff00");
            }
        }

        // --- 2. ACTUALIZAR TEXTO DEL BOTÓN ---
        if (this.muteBtnText) {
            if (isMuted) {
                this.muteBtnText.setText("ACTIVAR SONIDO");
                this.muteBtnText.setColor("#ffff00");
            } else {
                this.muteBtnText.setText("SILENCIAR");
                this.muteBtnText.setColor("#ffffff");
            }
        }
    }

    // ==========================================
    //       EFECTOS Y VISUALES
    // ==========================================

    switchMenu(fromContainer, toContainer) {
        fromContainer.setVisible(false);
        toContainer.setVisible(true);
    }

    createBackgroundEffects(width, height) {
        const graphics = this.make.graphics();
        graphics.fillStyle(0x000000); graphics.fillRect(0, 0, width, 4);
        graphics.fillStyle(0x101010); graphics.fillRect(0, 4, width, 4);
        graphics.generateTexture('scanlines', width, 8); graphics.destroy();
        this.scanlines = this.add.tileSprite(0, 0, width, height, 'scanlines').setOrigin(0, 0).setAlpha(0.3).setDepth(10);
    }

    createLogoAndTitle(width, height) {
        this.logo = this.add.image(width / 2, height * 0.35, "hacker_logo");
        this.logo.setScale(0.8).setAlpha(0.8);
        this.logoPixelFX = this.logo.preFX.addPixelate(0);
        this.tweens.add({ targets: this.logo, alpha: { from: 0.6, to: 1 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.time.addEvent({ delay: 3000, loop: true, callback: () => this.triggerGlitchEffect(this.logo, this.logoPixelFX) });
        const titleText = this.add.text(width / 2, height * 0.1, "DEEP IN THE WEB", {
            fontFamily: '"VT323", "Courier New", monospace', fontSize: "80px", color: "#00ff00", fontStyle: "bold"
        }).setOrigin(0.5).setShadow(0, 0, '#00ff00', 10, true, true);
    }

    createButton(x, y, label, callback) {
        const buttonBg = this.add.rectangle(0, 0, 300, 50, 0x111111).setStrokeStyle(2, 0x003300);
        const buttonText = this.add.text(0, 0, label, { fontFamily: '"VT323", monospace', fontSize: "36px", color: "#ffffff" }).setOrigin(0.5);
        const btnContainer = this.add.container(x, y, [buttonBg, buttonText]);
        buttonBg.setInteractive({ useHandCursor: true });
        buttonBg.on('pointerover', () => { buttonBg.setFillStyle(0x00ff00); buttonText.setColor("#000000"); buttonBg.setStrokeStyle(2, 0xffffff); });
        buttonBg.on('pointerout', () => { buttonBg.setFillStyle(0x111111); buttonText.setColor("#ffffff"); buttonBg.setStrokeStyle(2, 0x003300); });
        buttonBg.on('pointerdown', () => {
            this.tweens.add({ targets: btnContainer, scaleX: 0.95, scaleY: 0.95, duration: 50, yoyo: true, onComplete: callback });
        });
        return btnContainer;
    }

    // BOTÓN PEQUEÑO: Ejecución instantánea
    createSmallButton(x, y, label, callback) {
        const buttonBg = this.add.rectangle(0, 0, 150, 40, 0x222222).setStrokeStyle(2, 0x00aa00);
        const buttonText = this.add.text(0, 0, label, { fontFamily: '"VT323", monospace', fontSize: "28px", color: "#ffffff" }).setOrigin(0.5);
        const btnContainer = this.add.container(x, y, [buttonBg, buttonText]);
        
        buttonBg.setInteractive({ useHandCursor: true });
        buttonBg.on('pointerover', () => { buttonBg.setFillStyle(0x00aa00); buttonText.setColor("#000000"); });
        buttonBg.on('pointerout', () => { buttonBg.setFillStyle(0x222222); buttonText.setColor("#ffffff"); });
        
        buttonBg.on('pointerdown', () => {
            // Lógica INSTANTÁNEA (sin esperar animación)
            callback();

            // Animación visual paralela
            this.tweens.add({ targets: btnContainer, scaleX: 0.9, scaleY: 0.9, duration: 50, yoyo: true });
        });
        
        return { container: btnContainer, textObj: buttonText };
    }

    triggerGlitchEffect(target, pixelFX) {
        pixelFX.amount = 3; 
        const originalX = target.x; const originalY = target.y;
        this.tweens.add({
            targets: target, x: '+=5', y: '-=5', duration: 50, yoyo: true, repeat: 3,
            onComplete: () => { target.x = originalX; target.y = originalY; pixelFX.amount = 0; }
        });
    }

    typewriteText(text) {
        const length = text.length; let i = 0;
        this.consoleText.setText("");
        this.time.addEvent({
            callback: () => { this.consoleText.text += text[i]; i++; },
            repeat: length - 1, delay: 50
        });
    }

    update() {
        this.scanlines.tilePositionY += 0.5;
    }
}

export default MenuScene;