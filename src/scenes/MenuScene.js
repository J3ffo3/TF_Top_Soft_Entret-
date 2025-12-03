import Phaser from "phaser";

class MenuScene extends Phaser.Scene {
    constructor() {
        super("Menu");
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
        this.currentMusic = null;
        // ¡Lanzar la música del Menú al inicio!
        this.playMusic('menu');
        // ---------------------------------------

        // 1. FONDO NEGRO
        //this.cameras.main.setBackgroundColor('#000000');

        // --- SCANLINES (Líneas de TV Vieja) ---
        // Creamos una textura dinámica con rayas horizontales
        const graphics = this.make.graphics();
        graphics.fillStyle(0x000000);
        graphics.fillRect(0, 0, width, 4); // Línea negra
        graphics.fillStyle(0x101010); // Gris muy oscuro casi negro
        graphics.fillRect(0, 4, width, 4); // Línea un poco más clara
        graphics.generateTexture('scanlines', width, 8);
        graphics.destroy();

        // Ponemos las scanlines encima de todo
        this.scanlines = this.add.tileSprite(0, 0, width, height, 'scanlines')
            .setOrigin(0, 0)
            .setAlpha(0.3) // Transparencia
            .setDepth(10); // Aseguramos que esté encima

        // 2. LOGO CENTRAL (HACKER)
        this.logo = this.add.image(width / 2, height * 0.35, "hacker_logo");
        this.logo.setScale(0.8);
        this.logo.setAlpha(0.8);

        // Añadimos efecto Pixelate (SÍ existe nativamente)
        // Lo guardamos en una variable para manipularlo
        this.logoPixelFX = this.logo.preFX.addPixelate(0); // 0 = sin efecto inicial

        // Tween: El logo "respira"
        this.tweens.add({
            targets: this.logo,
            alpha: { from: 0.6, to: 1 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Evento: Glitch aleatorio en el logo
        this.time.addEvent({
            delay: 3000,
            loop: true,
            callback: () => this.triggerGlitchEffect(this.logo, this.logoPixelFX)
        });

        // 3. TÍTULO
        const titleText = this.add.text(width / 2, height * 0.1, "DEEP IN THE WEB", {
            fontFamily: '"VT323", "Courier New", monospace',
            fontSize: "80px",
            color: "#00ff00",
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Creamos una sombra verde para simular el brillo del monitor
        titleText.setShadow(0, 0, '#00ff00', 10, true, true);

        // Glitch manual en el texto (lo movemos rápido)
        this.time.addEvent({
            delay: 200, // Cada 200ms revisa si hace glitch
            loop: true,
            callback: () => {
                if (Phaser.Math.Between(0, 10) > 8) { // 20% de probabilidad
                    titleText.x = (width / 2) + Phaser.Math.Between(-5, 5);
                    titleText.setAlpha(0.8);
                    // Restaurar posición rápido
                    this.time.delayedCall(50, () => {
                        titleText.x = width / 2;
                        titleText.setAlpha(1);
                    });
                }
            }
        });

        // 4. BOTONES
        this.createButton(width / 2, height * 0.60, "START", () => { this.currentMusic.stop(); this.scene.start("GameScene"); });
        this.createButton(width / 2, height * 0.70, "OPTIONS", () => console.log("Options clicked"));
        this.createButton(width / 2, height * 0.80, "EXIT", () => console.log("Exit clicked"));

        // 5. TEXTO CONSOLA
        this.consoleText = this.add.text(width / 2, height * 0.92, "", {
            fontFamily: '"Courier New", monospace',
            fontSize: "18px",
            color: "#00aa00"
        }).setOrigin(0.5);

        this.typewriteText("root_404: ...esperaba que no regresaras.");
    }

    // --- FUNCIONES NUEVAS Y CORREGIDAS ---

    // Simula el glitch pixelando y moviendo la imagen
    triggerGlitchEffect(target, pixelFX) {
        // 1. Aumentar pixelado (baja resolución)
        pixelFX.amount = 3; 
        
        // 2. Mover la imagen ligeramente (Shaking)
        const originalX = target.x;
        const originalY = target.y;

        // Hacemos 3 movimientos rápidos
        this.tweens.add({
            targets: target,
            x: '+=5', // Mueve derecha
            y: '-=5', // Mueve arriba
            duration: 50,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                // Restaurar todo al terminar
                target.x = originalX;
                target.y = originalY;
                pixelFX.amount = 0; // Quitar pixelado
                
                // Opcional: Cambiar tinte a rojo brevemente
                target.setTint(0xff0000);
                this.time.delayedCall(100, () => target.clearTint());
            }
        });
    }

    createButton(x, y, label, callback) {
        const buttonBg = this.add.rectangle(x, y, 300, 50, 0x111111)
            .setStrokeStyle(2, 0x003300);
        
        const buttonText = this.add.text(x, y, label, {
            fontFamily: '"VT323", "Courier New", monospace',
            fontSize: "36px",
            color: "#ffffff"
        }).setOrigin(0.5);

        buttonBg.setInteractive({ useHandCursor: true });
        
        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x00ff00);
            buttonText.setColor("#000000");
            buttonBg.setStrokeStyle(2, 0xffffff);
        });

        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x111111);
            buttonText.setColor("#ffffff");
            buttonBg.setStrokeStyle(2, 0x003300);
        });

        buttonBg.on('pointerdown', () => {
            this.tweens.add({
                targets: [buttonBg, buttonText],
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });
    }

    typewriteText(text) {
        const length = text.length;
        let i = 0;
        this.time.addEvent({
            callback: () => {
                this.consoleText.text += text[i];
                i++;
            },
            repeat: length - 1,
            delay: 100
        });
    }

    update() {
        // Movemos las scanlines suavemente para dar efecto de TV rodando
        // NOTA: Si ves que no se mueven, es porque la textura es muy uniforme, 
        // pero al ser generatedTexture debería notarse.
        this.scanlines.tilePositionY += 0.5;
    }
}

export default MenuScene;