// const socket = io();
import {otherPlayers, socket, worldWidth, worldHeight} from "./client.js";
import {Player} from "./player.js";

export class GameScene extends Phaser.Scene {
    constructor() {
        super({key: 'GameScene'});
    }

    init(data) {
        this.playerName = data;
    }

    preload() {
        this.load.image("tank", "https://labs.phaser.io/assets/sprites/tank.png");
    }

    create() {
        this.raycaster = this.raycasterPlugin.createRaycaster();
        this.raycaster.setBoundingBox(0, 0, worldWidth, worldHeight);

        this.blockers = this.physics.add.staticGroup();

        socket.emit('startGame', this.playerName);

        socket.once('join', (data) => {
            this.player = new Player(this, socket.id, data.x, data.y, 0, this.raycaster, data.name, data.team);

            socket.emit("requestCurrentPlayers");

            this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
            this.cameras.main.setZoom(0.8);
            this.cameras.main.startFollow(this.player.player);
            this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasd = this.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                right: Phaser.Input.Keyboard.KeyCodes.D
            });

            const minimap = this.cameras.add(0, 0, 500, 500).setName("minimap");
            const viewportWidth = this.scale.gameSize.width;
            const viewportHeight = this.scale.gameSize.height;
            const minimapSize = Math.min(viewportWidth, viewportHeight) / 3.0;
            minimap.setSize(minimapSize, minimapSize);
            minimap.setZoom(minimapSize / worldHeight);
            minimap.setPosition(0, viewportHeight - minimap.height);
            minimap.setBackgroundColor(0xffffff);
            minimap.centerOn(worldWidth / 2, worldHeight / 2);
        });

        socket.on("currentPlayers", players => {
            Object.entries(players).forEach(([id, p]) => {
                if (id === socket.id) {
                    this.player.updatePosition(p.x, p.y, p.rotation);
                } else {
                    this.addOtherPlayer(id, p.x, p.y, p.rotation, p.name, p.team);
                }
            });
        });

        socket.on("newPlayer", info => {
            this.addOtherPlayer(info.id, info.x, info.y, info.rotation, info.name, info.team);
        });

        socket.on("playerMoved", (data) => {
            const p = otherPlayers[data.id];
            if (p) {
                p.updatePosition(data.x, data.y, data.rotation);
            }
        });

        socket.on("playerDisconnected", id => {
            const o = otherPlayers[id];
            if (o) {
                o.destroy();
                delete otherPlayers[id]
            }
        });
    }

    addOtherPlayer(id, x, y, rotation, name, team) {
        otherPlayers[id] = new Player(this, id, x, y, rotation, this.raycaster, name, team);
    }

    update() {
        if (!this.player) return;

        const speed = 200;

        this.player.move(speed);
        this.player.updateLighter()

        Object.values(otherPlayers).forEach((p) => {
            p.updateLighter();
        });
    }
}
