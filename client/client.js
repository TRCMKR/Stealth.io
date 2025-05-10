const socket = io();
let otherPlayers = {};

const worldWidth = 2000;
const worldHeight = 2000;

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
    scene: {
        preload: preload,
        create: create,
        update: update,
    },
};

const game = new Phaser.Game(config);
let player;

function preload() {
    this.load.image("tank", "https://labs.phaser.io/assets/sprites/tank.png");
}

function create() {
    player = this.physics.add.image(400, 300, "tank");
    player.setCollideWorldBounds(true);

    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setZoom(0.8);
    this.cameras.main.startFollow(player);
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cursors = this.input.keyboard.createCursorKeys();

    socket.emit("requestCurrentPlayers");

    // Minimap: small camera at the bottom-left corner
    const minimap = this.cameras.add(0, 0, 500, 500).setName("minimap");
    const viewportWidth = this.scale.gameSize.width;
    const viewportHeight = this.scale.gameSize.height;

    // Dynamically scale minimap size based on the viewport size
    const minimapSize = Math.min(viewportWidth, viewportHeight) / 3.0;
    minimap.setSize(minimapSize, minimapSize);
    minimap.setZoom(minimapSize / worldHeight);

    // Position minimap in the bottom-left corner
    minimap.setPosition(0, viewportHeight - minimap.height);

    minimap.setBackgroundColor(0xffffff);
    minimap.scrollX = 0;
    minimap.scrollY = 0;
    minimap.centerOn(worldWidth / 2, worldHeight / 2);

    socket.on("currentPlayers", (players) => {
        Object.keys(players).forEach((id) => {
            if (id === socket.id) {
                player.setPosition(players[id].x, players[id].y);
                player.rotation = players[id].rotation;
            } else {
                const newPlayer = this.add.image(players[id].x, players[id].y, "tank");
                newPlayer.rotation = players[id].rotation;
                otherPlayers[id] = newPlayer;
            }
        });
    });

    socket.on("newPlayer", (playerInfo) => {
        const newPlayer = this.add.image(playerInfo.x, playerInfo.y, "tank");
        newPlayer.rotation = playerInfo.rotation;
        otherPlayers[playerInfo.id] = newPlayer;
    });

    socket.on("playerMoved", (data) => {
        if (otherPlayers[data.id]) {
            otherPlayers[data.id].setPosition(data.x, data.y);
            otherPlayers[data.id].rotation = data.rotation;
        }
    });

    socket.on("playerDisconnected", (id) => {
        if (otherPlayers[id]) {
            otherPlayers[id].destroy();
            delete otherPlayers[id];
        }
    });
}

function update() {
    const speed = 200;
    if (this.cursors.left.isDown) {
        player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
        player.setVelocityX(speed);
    } else {
        player.setVelocityX(0);
    }

    if (this.cursors.up.isDown) {
        player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
        player.setVelocityY(speed);
    } else {
        player.setVelocityY(0);
    }

    const x = player.x;
    const y = player.y;
    const r = player.rotation;
    socket.emit("playerMovement", { x: x, y: y, rotation: r });
}