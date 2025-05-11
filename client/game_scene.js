// const socket = io();
import {otherPlayers, socket} from "./client.js";

const worldWidth = 2000;
const worldHeight = 2000;

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
        this.pointer = this.input.activePointer;

        socket.emit('startGame', this.playerName);

        socket.once('join', (data) => {
            this.player = this.physics.add.image(data.x, data.y, "tank");

            let nameText = this.add.text(data.x, data.y - 50, data.name, {
                fontSize: '16px',
                fill: '#fff',
                stroke: '#000',
                strokeThickness: 3
            });

            nameText.setOrigin(0.5, 0.5);
            this.player.nameText = nameText;


            this.raycaster = this.raycasterPlugin.createRaycaster();

            this.raycaster.setBoundingBox(0, 0, worldWidth, worldHeight);

            const ray = this.raycaster.createRay();

            ray.autoSlice = true;
            ray.enablePhysics();
            ray.setConeDeg(30);

            const rayGraphics = this.add.graphics({fillStyle: {color: 0xFFFF00, alpha: 1}});

            this.player.ray = ray;
            this.player.rayGraphics = rayGraphics;

            this.raycaster.mapGameObjects(this.player, true)

            this.player.setCollideWorldBounds(true);

            socket.emit("requestCurrentPlayers");

            this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
            this.cameras.main.setZoom(0.8);
            this.cameras.main.startFollow(this.player);
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

            // this.pointer = this.input.activePointer.positionToCamera(this.cameras.main);
        });

        socket.on("currentPlayers", players => {
            Object.entries(players).forEach(([id, p]) => {
                if (id === socket.id) {
                    this.player.setPosition(p.x, p.y);
                    this.player.rotation = p.rotation;
                } else {
                    this.addOtherPlayer(id, p.x, p.y, p.rotation, p.name);
                }
            });
        });

        socket.on("newPlayer", info => {
            this.addOtherPlayer(info.id, info.x, info.y, info.rotation, info.name);
        });

        socket.on("playerMoved", (data) => {
            const p = otherPlayers[data.id];
            if (p) {
                p.setPosition(data.x, data.y);
                p.angle = data.angle;
                p.nameText.setPosition(p.x, p.y - 50);
            }
        });

        socket.on("playerDisconnected", id => {
            const o = otherPlayers[id];
            if (o) {
                // Remove from all tracking systems
                this.raycaster.removeMappedObjects(o);

                // Destroy components
                o.nameText.destroy();
                o.rayGraphics.destroy();
                o.ray.destroy();
                o.destroy();

                delete otherPlayers[id];
            }
        });
    }

    addOtherPlayer(id, x, y, angle, name) {
        const o = this.add.image(x, y, "tank");
        o.id = id;
        o.nameText = this.add.text(x, y - 50, name, {
            fontSize: '16px', fill: '#fff', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5);

        // Ray setup
        const ray = this.raycaster.createRay();

        ray.autoSlice = true;
        ray.enablePhysics();
        ray.setConeDeg(30);
        o.ray = ray;

        o.rayGraphics = this.add.graphics({ fillStyle: { color: 0xFFFF00, alpha: 1 } });
        o.angle = angle;

        this.raycaster.mapGameObjects(o, true); // Update raycaster
        otherPlayers[id] = o;
    }

    update() {
        if (!this.player) return;

        const speed = 200;

        const left = this.cursors.left.isDown || this.wasd.left.isDown;
        const right = this.cursors.right.isDown || this.wasd.right.isDown;
        const up = this.cursors.up.isDown || this.wasd.up.isDown;
        const down = this.cursors.down.isDown || this.wasd.down.isDown;

        this.player.setVelocity(0);

        if (left) {
            this.player.setVelocityX(-speed);
        } else if (right) {
            this.player.setVelocityX(speed);
        }

        if (up) {
            this.player.setVelocityY(-speed);
        } else if (down) {
            this.player.setVelocityY(speed);
        }


        this.player.nameText.setPosition(this.player.x, this.player.y - 50);

        const worldPoint = this.input.activePointer.positionToCamera(this.cameras.main);

        const angle = Phaser.Math.Angle.Between(
            this.player.x, this.player.y,
            worldPoint.x, worldPoint.y
        );

        // Update ray direction
        this.player.angle = angle;
        this.player.ray.setAngle(angle);

        socket.emit("playerMovement", {
            x: this.player.x,
            y: this.player.y,
            angle: this.player.angle
        });

        this.raycaster.removeMappedObjects(this.player);
        this.player.ray.setOrigin(this.player.x, this.player.y);

        const intersections = this.player.ray.castCone();

        this.player.rayGraphics.clear();
        this.player.rayGraphics.fillStyle(0xFFFF00, 1);

        if (intersections.length > 0) {
            const points = intersections.map(p => new Phaser.Math.Vector2(p.x, p.y));
            points.unshift(new Phaser.Math.Vector2(this.player.x, this.player.y));

            this.player.rayGraphics.beginPath();
            this.player.rayGraphics.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                this.player.rayGraphics.lineTo(points[i].x, points[i].y);
            }
            this.player.rayGraphics.closePath();
            this.player.rayGraphics.fillPath();
        }
        this.raycaster.mapGameObjects(this.player, true);


        Object.values(otherPlayers).forEach((p) => {
            this.raycaster.removeMappedObjects(p);

            p.ray.setOrigin(p.x, p.y);
            p.ray.setAngle(p.angle);

            p.rayGraphics.clear();
            p.rayGraphics.fillStyle(0xFFFF00, 1);

            const intersections = p.ray.castCone();

            if (intersections.length > 0) {
                const points = intersections.map(pt => new Phaser.Math.Vector2(pt.x, pt.y));
                points.unshift(new Phaser.Math.Vector2(p.x, p.y));

                p.rayGraphics.beginPath();
                p.rayGraphics.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    p.rayGraphics.lineTo(points[i].x, points[i].y);
                }
                p.rayGraphics.closePath();
                p.rayGraphics.fillPath();
            }
            this.raycaster.mapGameObjects(p, true);
        });
    }
}