import {MenuScene} from "./menu_scene.js";
import {GameScene} from "./game_scene.js";

export const socket = io();
export let otherPlayers = {};

export const worldWidth = 2000;
export const worldHeight = 2000;

const config = {
    type: Phaser.AUTO,
    scale: {
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight,
    },
    physics: {
        default: "arcade",
    },
    parent: 'game',
    scene: [MenuScene, GameScene],
    plugins: {
        scene: [
            {
                key: 'PhaserRaycaster',
                plugin: PhaserRaycaster,
                mapping: 'raycasterPlugin'
            }
        ]
    },
    dom: {
        createContainer: true
    }
};

const game = new Phaser.Game(config);