import Phaser from "phaser";

class PreloadScene extends Phaser.Scene {
    constructor() {
        super("PreloadScene");
    }

    preload() {
        this.load.image("hacker_logo", "assets/logoHacker.png");
        this.load.spritesheet('dice', 'assets/six sided die.png', { frameWidth: 16, frameHeight: 16 });
        this.load.spritesheet('player', 'assets/walk.png', { frameWidth: 16, frameHeight: 16 });

        // --- Carga de Audio (¡NUEVO!) ---
        this.load.audio('menu', 'assets/main_menu.wav');
        this.load.audio('mundo1', 'assets/mundo_1.wav');
        this.load.audio('mundo2', 'assets/mundo_2.wav');
        this.load.audio('mundo3', 'assets/mundo_3.wav');
        this.load.audio('mundo4', 'assets/mundo_4.wav');
        this.load.audio('gameover', 'assets/menu-gameover.wav');
        this.load.audio('win', 'assets/menu-win.wav');
        this.load.audio('sfx_dice', 'assets/rolldice.wav');
        this.load.audio('sfx_hit_enemy', 'assets/hit_enemy.mp3');
        this.load.audio('sfx_hit_player', 'assets/hit_player.mp3');
    }

    create() {
        this.scene.start("Menu");
    }
}

export default PreloadScene;