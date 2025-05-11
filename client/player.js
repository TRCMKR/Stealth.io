import {socket, worldHeight, worldWidth} from "./client.js";

export class Player {
    constructor(scene, id, x, y, rotation, raycaster, name, team) {
        this.scene = scene;
        this.id = id;

        this.player = this.scene.physics.add.image(x, y, "tank");
        this.player.rotation = rotation;
        this.player.color = team === 0 ? 0x0000FF : 0xFF0000;

        let nameText = this.scene.add.text(x, y - 50, name, {
            fontSize: '16px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 3
        });

        nameText.setOrigin(0.5, 0.5);
        this.player.nameText = nameText;

        this.raycaster = raycaster;

        const ray = this.raycaster.createRay({ignoreNotIntersectedRays: false});
        ray.slice();
        ray.enablePhysics();
        ray.setConeDeg(85);
        ray.setRayRange(300)
        ray.round = true;

        const rayGraphics = this.scene.add.graphics({fillStyle: {color: this.player.color, alpha: 1}});

        this.player.ray = ray;
        this.player.rayGraphics = rayGraphics;

        this.raycaster.mapGameObjects(this.player, true);

        this.player.setCollideWorldBounds(true);

        // after you’ve added both the tank and the rayGraphics:
        // this.scene.children.sendToBack(this.player.rayGraphics);
    }

    updatePosition(x, y, rotation) {
        this.player.setPosition(x, y);
        this.player.rotation = rotation;
        this.player.nameText.setPosition(x, y - 50);
    }

    move(speed) {
        const left = this.scene.cursors.left.isDown || this.scene.wasd.left.isDown;
        const right = this.scene.cursors.right.isDown || this.scene.wasd.right.isDown;
        const up = this.scene.cursors.up.isDown || this.scene.wasd.up.isDown;
        const down = this.scene.cursors.down.isDown || this.scene.wasd.down.isDown;

        this.player.setVelocity(0);

        if (left) this.player.setVelocityX(-speed);
        else if (right) this.player.setVelocityX(speed);
        if (up) this.player.setVelocityY(-speed);
        else if (down) this.player.setVelocityY(speed);

        this.player.nameText.setPosition(this.player.x, this.player.y - 50);

        const worldPoint = this.scene.input.activePointer.positionToCamera(this.scene.cameras.main);
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);

        this.player.rotation = angle;
        this.player.ray.setAngle(angle);

        socket.emit("playerMovement", {
            x: this.player.x,
            y: this.player.y,
            rotation: this.player.rotation
        });
    }

    updateLighter() {
        this.scene.raycaster.removeMappedObjects(this.player);
        this.player.ray.setOrigin(this.player.x, this.player.y);
        this.player.ray.setAngle(this.player.rotation);

        const intersections = this.player.ray.castCone();
        this.player.rayGraphics.clear();
        this.player.rayGraphics.fillStyle(this.player.color, 1);

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

        this.scene.raycaster.mapGameObjects(this.player, true);
    }

    destroy() {
        this.raycaster.removeMappedObjects(this.player);

        this.player.nameText.destroy();
        this.player.rayGraphics.destroy();
        this.player.ray.destroy();
        this.player.destroy();
    }
}