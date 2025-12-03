import Phaser from "phaser";
import GameScene from "./scenes/GameScene";
import MenuScene from "./scenes/MenuScene";
import PreloadScene from "./scenes/PreloadScene";

let config = {
    width: 1280,
    height: 720,
    type: Phaser.AUTO,
    //backgroundColor: '#000000',
    scene: [PreloadScene,MenuScene,GameScene],
    scale:{
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        pixelArt: true
    },
    physics:{
        default : 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
        },
    },
};
new Phaser.Game(config);