// const socket = io();
import {otherPlayers, socket} from "./client.js";

const worldWidth = 2000;
const worldHeight = 2000;

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        socket.once('join', (data) => {
            this.player = this.physics.add.image(data.x, data.y, "tank");

            let nameText = this.add.text(data.x, data.y - 50, data.name, {
                fontSize: '16px',
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 3
            });

            // Make the nameText follow the player
            nameText.setOrigin(0.5, 0.5);  // Center text on the player

            // Add it to the player object to keep track of it
            this.player.nameText = nameText;

            console.log(this.player)
        })
    }

    preload() {
        this.load.image("tank", "https://labs.phaser.io/assets/sprites/tank.png");
    }

    create() {
        this.player.setCollideWorldBounds(true);

        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.setZoom(0.8);
        this.cameras.main.startFollow(this.player);
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.cursors = this.input.keyboard.createCursorKeys();

        socket.emit("requestCurrentPlayers");

        const minimap = this.cameras.add(0, 0, 500, 500).setName("minimap");
        const viewportWidth = this.scale.gameSize.width;
        const viewportHeight = this.scale.gameSize.height;
        const minimapSize = Math.min(viewportWidth, viewportHeight) / 3.0;
        minimap.setSize(minimapSize, minimapSize);
        minimap.setZoom(minimapSize / worldHeight);
        minimap.setPosition(0, viewportHeight - minimap.height);
        minimap.setBackgroundColor(0xffffff);
        minimap.scrollX = 0;
        minimap.scrollY = 0;
        minimap.centerOn(worldWidth / 2, worldHeight / 2);

        socket.on("currentPlayers", (players) => {
            Object.keys(players).forEach((id) => {
                if (id === socket.id) {
                    this.player.setPosition(players[id].x, players[id].y);
                    this.player.rotation = players[id].rotation;
                } else {
                    const newPlayer = this.add.image(players[id].x, players[id].y, "tank");
                    newPlayer.rotation = players[id].rotation;

                    const newNameText = this.add.text(players[id].x, players[id].y - 50, players[id].name, {
                        fontSize: '16px',
                        fill: '#fff',
                        stroke: '#000',
                        strokeThickness: 3
                    });
                    newNameText.setOrigin(0.5, 0.5);
                    newPlayer.nameText = newNameText;

                    otherPlayers[id] = newPlayer;
                }
            });
        });

        socket.on("newPlayer", (playerInfo) => {
            const newPlayer = this.add.image(playerInfo.x, playerInfo.y, "tank");
            newPlayer.rotation = playerInfo.rotation;

            const newNameText = this.add.text(playerInfo.x, playerInfo.y - 50, playerInfo.name, {
                fontSize: '16px',
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 3
            });
            newNameText.setOrigin(0.5, 0.5);
            newPlayer.nameText = newNameText;

            otherPlayers[playerInfo.id] = newPlayer;
        });

        socket.on("playerMoved", (data) => {
            if (otherPlayers[data.id]) {
                otherPlayers[data.id].setPosition(data.x, data.y);
                otherPlayers[data.id].rotation = data.rotation;
                otherPlayers[data.id].nameText.setPosition(otherPlayers[data.id].x, otherPlayers[data.id].y - 50);
            }
        });

        socket.on("playerDisconnected", (id) => {
            if (otherPlayers[id]) {
                otherPlayers[id].destroy();
                otherPlayers[id].nameText.destroy();
                delete otherPlayers[id];

            }
        });
    }

    update() {
        const speed = 200;
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
        } else {
            this.player.setVelocityY(0);
        }

        this.player.nameText.setPosition(this.player.x, this.player.y - 50);

        socket.emit("playerMovement", {
            x: this.player.x,
            y: this.player.y,
            rotation: this.player.rotation
        });
    }
}
