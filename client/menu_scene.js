import {socket} from "./client.js";

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        const versionElement = document.getElementById('version');

        socket.once('version', (version) => {
            versionElement.textContent = `Версия: ${version}`;
        })
    }

    create() {

        // Create player name input field
        const nameInput = document.getElementById('playerName')

        // Create start game button
        const startButton = document.getElementById('startGameBtn');

        // Handle button click event
        startButton.addEventListener('click', () => {
            const playerName = nameInput.value.trim();
            if (!playerName) {
                alert('Введите имя!');
                return;
            }

            // Hide menu and input field
            document.getElementById('menu').style.display = 'none';
            document.getElementById('background').style.display = 'none';
            nameInput.style.display = 'none';
            startButton.style.display = 'none';

            // Start the game scene and pass player name
            this.scene.start('GameScene', playerName);
        });
    }
}